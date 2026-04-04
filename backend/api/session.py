import io
from typing import Optional

import jwt
from jwt.exceptions import PyJWTError
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np

from core.session_manager import (
    Phase,
    create_session,
    get_session,
    delete_session,
    all_sessions,
)
from core.auth_tokens import decode_access_token
from core.scorer import load_all_models
from db.database import SessionLocal, db_available
from db import crud
from db.profile_store import persist_after_session_end, persist_bg_session_profile

router = APIRouter()

# Load population + cohort GMMs once when this module is imported
load_all_models()


class CreateSessionRequest(BaseModel):
    device_type:        str            = "desktop"
    device_fingerprint: Optional[str]  = None  # SHA-256 from client


class FeedbackRequest(BaseModel):
    session_id:     str
    was_legitimate: bool


def _hydrate_session_from_db(session, user_id: str) -> bool:
    """Load saved Isolation Forest profile or in-progress enrollment checkpoint."""
    if not db_available():
        return False
    db = SessionLocal()
    try:
        p = crud.get_profile_by_user_id(db, user_id)
        if not p:
            return False
        if p.model_blob and p.scaler_blob:
            session.model = joblib.load(io.BytesIO(p.model_blob))
            session.scaler = joblib.load(io.BytesIO(p.scaler_blob))
            session.baseline_means = np.array(p.baseline_means, dtype=np.float32)
            session.cohort_id = p.cohort_id
            session.lifetime_windows_prior = int(p.lifetime_active_windows or 0)
            session.phase = Phase.ACTIVE
            session.current_score = 85.0
            return True
        ck = p.enrollment_checkpoint
        if isinstance(ck, dict) and ck.get("vectors"):
            session.enrollment_vectors = list(ck["vectors"])
            cid = ck.get("cohort_id")
            if cid:
                session.cohort_id = cid
            tgt = ck.get("enrollment_target")
            if tgt:
                session.enrollment_target = int(tgt)
            session.phase = Phase.ENROLLING
            return True
        return False
    except Exception as e:
        print(f"[session] profile load failed for {user_id}: {e}")
        return False
    finally:
        db.close()


def _resolve_user_id(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Sign in with email and password, then retry (Authorization: Bearer <token> required)",
        )
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty bearer token")
    try:
        payload = decode_access_token(token)
        return str(payload["sub"])
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/session/create")
def create(
    req: CreateSessionRequest,
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(authorization)
    session = create_session(uid, req.device_type)
    profile_loaded = _hydrate_session_from_db(session, uid)

    device_known = True
    device_is_new = False
    fp = (req.device_fingerprint or "").strip()

    if fp and db_available():
        db_fp = SessionLocal()
        try:
            profile_row = crud.get_profile_by_user_id(db_fp, uid)
            if profile_row:
                device_known = crud.is_known_device(db_fp, uid, fp)
                device_is_new = not device_known
                if device_is_new:
                    crud.register_device(db_fp, uid, fp)
                    print(
                        f"[device] New device registered for {uid[:12]}… "
                        f"fp={fp[:8]}…"
                    )
                else:
                    print(f"[device] Known device for {uid[:12]}… fp={fp[:8]}…")
            else:
                device_known = True
                device_is_new = False
        except Exception as e:
            print(f"[device] fingerprint check failed: {e}")
        finally:
            db_fp.close()

    session.device_fingerprint = fp
    session.device_known = device_known

    if device_is_new and profile_loaded:
        session.current_score = 72.0
        print(
            f"[device] Unknown device — starting session at 72 for {uid[:12]}…"
        )

    if profile_loaded and session.phase == Phase.ENROLLING:
        msg = "Session created. Enrollment progress restored from database."
    elif profile_loaded:
        msg = "Session created. Saved behavioral profile restored."
    else:
        msg = "Session created. Behavioral monitoring active."

    out = {
        "session_id":          session.session_id,
        "user_id":             uid,
        "phase":               session.phase.value,
        "state":               session.state.value,
        "score":               round(session.current_score, 1),
        "enrollment_progress": session.enrollment_progress(),
        "cohort_id":           session.cohort_id,
        "profile_loaded":      profile_loaded,
        "database":            db_available(),
        "device_known":        device_known,
        "message":             msg,
    }
    print(
        "[session/create] "
        f"sid={session.session_id[:8]}… user={uid[:12]}… "
        f"phase={out['phase']} state={out['state']} score={session.current_score:.1f} "
        f"enroll%={out['enrollment_progress']} profile_loaded={profile_loaded} "
        f"cohort_id={session.cohort_id} device_known={device_known}"
    )
    return out


@router.get("/session/{session_id}")
def get(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id":          session.session_id,
        "user_id":             session.user_id,
        "phase":               session.phase.value,
        "state":               session.state.value,
        "score":               round(session.current_score, 1),
        "enrollment_progress": session.enrollment_progress(),
        "window_count":        session.window_count,
        "elapsed_minutes":     round(session.elapsed_minutes(), 1),
        "cohort_id":           session.cohort_id,
        "tier_scores":         session.last_tier_scores,
        "database":            db_available(),
    }


@router.post("/session/feedback")
def feedback(req: FeedbackRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if req.was_legitimate:
        session.current_score = 70.0
        session.score_history.clear()
        session.state_history.clear()
        from core.session_manager import State
        session.state = State.GREEN

        if db_available():
            db = SessionLocal()
            try:
                crud.increment_feedback_confirmations(db, session.user_id)
            finally:
                db.close()
            persisted = persist_bg_session_profile(session)
        else:
            persisted = False

        return {
            "acknowledged":     True,
            "score_reset_to":   70.0,
            "profile_updated":  persisted,
            "model_retrained":  False,
        }

    return {"acknowledged": True, "profile_updated": False, "model_retrained": False}


@router.post("/session/{session_id}/end")
def end_session(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    persisted, persist_kind = persist_after_session_end(session)
    summary = {
        "session_id":        session_id,
        "user_id":           session.user_id,
        "windows":           session.window_count,
        "final_score":       round(session.current_score, 1),
        "final_state":       session.state.value,
        "duration_min":      round(session.elapsed_minutes(), 1),
        "profile_persisted": persisted,
        "persist_kind":      persist_kind,
    }
    delete_session(session_id)
    return summary


@router.get("/admin/sessions")
def admin_sessions():
    sessions = all_sessions()
    return {
        "count": len(sessions),
        "sessions": [
            {
                "session_id":    s.session_id,
                "user_id":       s.user_id,
                "score":         round(s.current_score, 1),
                "state":         s.state.value,
                "phase":         s.phase.value,
                "window_count":  s.window_count,
                "elapsed_min":   round(s.elapsed_minutes(), 1),
                "cohort_id":     s.cohort_id,
            }
            for s in sessions
        ],
    }
