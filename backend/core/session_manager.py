import uuid
import time
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class Phase(str, Enum):
    ENROLLING = "enrolling"
    ACTIVE    = "active"


class State(str, Enum):
    GREEN  = "green"
    YELLOW = "yellow"
    RED    = "red"


@dataclass
class Session:
    session_id:     str
    user_id:        str
    device_type:    str          = "desktop"
    phase:          Phase        = Phase.ENROLLING
    state:          State        = State.GREEN
    created_at:     float        = field(default_factory=time.time)

    # Enrollment
    enrollment_vectors: list     = field(default_factory=list)
    enrollment_target:  int      = 8         # windows needed before model trains

    # Scoring
    current_score:  float        = 100.0
    score_history:  list         = field(default_factory=list)  # last N scores
    state_history:  list         = field(default_factory=list)  # last N states
    window_count:   int          = 0

    # Navigation history (for similarity scoring)
    nav_history:    list         = field(default_factory=list)

    # Model (trained during enrollment)
    model:          object       = None
    scaler:         object       = None
    baseline_means: Optional[np.ndarray] = None

    def elapsed_minutes(self) -> float:
        return (time.time() - self.created_at) / 60

    def enrollment_progress(self) -> int:
        return min(100, int(len(self.enrollment_vectors) / self.enrollment_target * 100))

    def add_score(self, score: float):
        self.score_history.append(round(score, 2))
        if len(self.score_history) > 20:      # keep last 20 windows
            self.score_history = self.score_history[-20:]

    def add_state(self, state: State):
        self.state_history.append(state)
        if len(self.state_history) > 10:
            self.state_history = self.state_history[-10:]


# ── In-memory store ────────────────────────────────────────────────────────────
# Key: session_id → Session object
_sessions: dict[str, Session] = {}


def create_session(user_id: str, device_type: str = "desktop") -> Session:
    sid     = str(uuid.uuid4())
    session = Session(session_id=sid, user_id=user_id, device_type=device_type)
    _sessions[sid] = session
    return session


def get_session(session_id: str) -> Optional[Session]:
    return _sessions.get(session_id)


def delete_session(session_id: str):
    _sessions.pop(session_id, None)


def all_sessions() -> list[Session]:
    return list(_sessions.values())