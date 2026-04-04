from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.session_manager import get_session
from core.response_engine import process_window
from db.profile_store import maybe_periodic_persist, maybe_periodic_enrollment_persist

router = APIRouter()


class KeystrokeEvent(BaseModel):
    type:      str        # 'keydown' or 'keyup'
    key:       str
    timestamp: float      # performance.now() value in ms


class MouseEvent(BaseModel):
    x:         float
    y:         float
    timestamp: float


class NavEvent(BaseModel):
    from_page: str = ""
    to:        str = ""
    timestamp: float


class Context(BaseModel):
    action:             str   = "browse"
    amount:             float = 0.0
    is_new_beneficiary: bool  = False


class EventBatch(BaseModel):
    session_id:  str
    window_id:   int
    keystrokes:  list[KeystrokeEvent] = []
    mouse:       list[MouseEvent]     = []
    navigation:  list[NavEvent]       = []
    context:     Optional[Context]    = None


@router.post("/session/events")
def receive_events(batch: EventBatch):
    session = get_session(batch.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Convert pydantic models to plain dicts for processing
    keystrokes = [e.model_dump() for e in batch.keystrokes]
    mouse      = [e.model_dump() for e in batch.mouse]
    nav        = [e.model_dump() for e in batch.navigation]
    context    = batch.context.model_dump() if batch.context else {}

    result = process_window(
        session=session,
        keystrokes=keystrokes,
        mouse_events=mouse,
        nav_events=nav,
        context=context,
    )
    maybe_periodic_enrollment_persist(session)
    maybe_periodic_persist(session)

    tiers = result.get("tier_scores") or {}
    print(
        "[session/events] "
        f"sid={batch.session_id[:8]}… window_id={batch.window_id} "
        f"user={session.user_id[:12]}… "
        f"in=ks:{len(keystrokes)} mouse:{len(mouse)} nav:{len(nav)} "
        f"ctx={context.get('action', 'browse')} "
        f"→ score={result.get('score')} state={result.get('state')} phase={result.get('phase')} "
        f"win_count={result.get('window_count')} enroll%={result.get('enrollment_progress')} "
        f"tiers pop={tiers.get('population')} coh={tiers.get('cohort')} "
        f"ind={tiers.get('individual')} trust_day={tiers.get('trust_day')}"
    )
    return result