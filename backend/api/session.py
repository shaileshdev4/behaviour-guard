from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.session_manager import create_session, get_session, delete_session, all_sessions
from core.scorer import load_population_model

router = APIRouter()

# Load population model once when this module is imported
load_population_model()


class CreateSessionRequest(BaseModel):
    user_id:     str
    device_type: str = "desktop"


class FeedbackRequest(BaseModel):
    session_id:     str
    was_legitimate: bool


@router.post("/session/create")
def create(req: CreateSessionRequest):
    session = create_session(req.user_id, req.device_type)
    return {
        "session_id":          session.session_id,
        "user_id":             session.user_id,
        "phase":               session.phase.value,
        "state":               session.state.value,
        "enrollment_progress": 0,
        "message":             "Session created. Behavioral monitoring active."
    }


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
    }


@router.post("/session/feedback")
def feedback(req: FeedbackRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if req.was_legitimate:
        # Reset score upward — user confirmed it was them
        session.current_score = 70.0
        session.score_history.clear()
        session.state_history.clear()
        from core.session_manager import State
        session.state = State.GREEN
        return {"acknowledged": True, "score_reset_to": 70.0}

    return {"acknowledged": True}


@router.post("/session/{session_id}/end")
def end_session(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    summary = {
        "session_id":     session_id,
        "user_id":        session.user_id,
        "windows":        session.window_count,
        "final_score":    round(session.current_score, 1),
        "final_state":    session.state.value,
        "duration_min":   round(session.elapsed_minutes(), 1),
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
            }
            for s in sessions
        ]
    }