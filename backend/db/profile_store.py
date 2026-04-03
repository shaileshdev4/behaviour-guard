"""Persist in-memory Session → Supabase/Postgres behavioral_profiles."""

import numpy as np

from core.session_manager import Phase, Session as BGSession
from db import crud
from db.database import SessionLocal, db_available


def persist_enrollment_checkpoint(bg: BGSession) -> bool:
    """Save partial enrollment so logout / new session can resume."""
    if not db_available():
        return False
    if bg.phase != Phase.ENROLLING:
        return False
    if len(bg.enrollment_vectors) == 0:
        return False
    db = SessionLocal()
    try:
        vecs = [[float(x) for x in v] for v in bg.enrollment_vectors]
        crud.upsert_enrollment_checkpoint(
            db,
            user_id=bg.user_id,
            vectors=vecs,
            cohort_id=bg.cohort_id,
            enrollment_target=bg.enrollment_target,
        )
        return True
    except Exception as e:
        print(f"[profile_store] enrollment checkpoint save failed: {e}")
        return False
    finally:
        db.close()


def maybe_periodic_enrollment_persist(bg: BGSession) -> None:
    """First enrolling window and every 3rd thereafter (matches active cadence)."""
    if not db_available() or bg.phase != Phase.ENROLLING:
        return
    n = len(bg.enrollment_vectors)
    if n == 1 or (n > 0 and n % 3 == 0):
        persist_enrollment_checkpoint(bg)


def persist_bg_session_profile(bg: BGSession) -> bool:
    """
    Save Isolation Forest + scaler + baseline + cohort + lifetime active windows.
    Returns False if DB disabled or session has no trained model.
    """
    if not db_available() or bg.model is None or bg.scaler is None:
        return False
    if bg.baseline_means is None:
        return False
    if bg.phase != Phase.ACTIVE:
        return False

    db = SessionLocal()
    try:
        total = bg.lifetime_windows_prior + bg.active_scoring_windows
        crud.upsert_behavioral_profile(
            db,
            user_id=bg.user_id,
            model=bg.model,
            scaler=bg.scaler,
            baseline_means=np.asarray(bg.baseline_means, dtype=float).tolist(),
            cohort_id=bg.cohort_id,
            lifetime_active_windows=max(0, int(total)),
        )
        return True
    except Exception as e:
        print(f"[profile_store] full profile save failed: {e}")
        return False
    finally:
        db.close()


def persist_after_session_end(bg: BGSession) -> tuple[bool, str]:
    """
    On logout/tab close: save active profile, else enrolling checkpoint.
    Returns (ok, detail) for API logging.
    """
    if persist_bg_session_profile(bg):
        return True, "full_profile"
    if persist_enrollment_checkpoint(bg):
        return True, "enrollment_checkpoint"
    return False, "nothing_to_save"


def maybe_periodic_persist(bg: BGSession) -> None:
    """Throttle writes: first active window and every 4 active windows."""
    if not db_available() or bg.phase != Phase.ACTIVE or bg.model is None:
        return
    aw = bg.active_scoring_windows
    if aw == 1 or (aw > 0 and aw % 4 == 0):
        persist_bg_session_profile(bg)
