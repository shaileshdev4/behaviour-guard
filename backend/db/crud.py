from __future__ import annotations

import joblib
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models import BehavioralProfile, User


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def get_user_by_email(db: Session, email: str) -> User | None:
    key = normalize_email(email)
    return db.scalar(select(User).where(User.email == key))


def create_user(db: Session, email: str, password_hash: str) -> User:
    row = User(email=normalize_email(email), password_hash=password_hash)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_profile_by_user_id(db: Session, user_id: str) -> BehavioralProfile | None:
    return db.scalar(
        select(BehavioralProfile).where(BehavioralProfile.user_id == user_id)
    )


def upsert_behavioral_profile(
    db: Session,
    *,
    user_id: str,
    model,
    scaler,
    baseline_means: list[float],
    cohort_id: str | None,
    lifetime_active_windows: int,
) -> BehavioralProfile:
    model_blob = joblib.dumps(model)
    scaler_blob = joblib.dumps(scaler)
    row = get_profile_by_user_id(db, user_id)
    if row:
        row.model_blob = model_blob
        row.scaler_blob = scaler_blob
        row.baseline_means = baseline_means
        row.cohort_id = cohort_id
        row.lifetime_active_windows = lifetime_active_windows
        row.enrollment_checkpoint = None
        db.commit()
        db.refresh(row)
        return row
    row = BehavioralProfile(
        user_id=user_id,
        model_blob=model_blob,
        scaler_blob=scaler_blob,
        baseline_means=baseline_means,
        cohort_id=cohort_id,
        lifetime_active_windows=lifetime_active_windows,
        enrollment_checkpoint=None,
        known_device_hashes=[],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def upsert_enrollment_checkpoint(
    db: Session,
    *,
    user_id: str,
    vectors: list[list[float]],
    cohort_id: str | None,
    enrollment_target: int,
) -> BehavioralProfile:
    """Save in-progress enrollment; does not overwrite a completed (blob) profile."""
    row = get_profile_by_user_id(db, user_id)
    if row and row.model_blob and row.scaler_blob:
        return row
    payload = {
        "vectors":           vectors,
        "cohort_id":         cohort_id,
        "enrollment_target": enrollment_target,
    }
    if row:
        row.enrollment_checkpoint = payload
        row.cohort_id = cohort_id
        db.commit()
        db.refresh(row)
        return row
    row = BehavioralProfile(
        user_id=user_id,
        model_blob=None,
        scaler_blob=None,
        baseline_means=[],
        cohort_id=cohort_id,
        lifetime_active_windows=0,
        enrollment_checkpoint=payload,
        known_device_hashes=[],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def increment_feedback_confirmations(db: Session, user_id: str) -> None:
    row = get_profile_by_user_id(db, user_id)
    if not row:
        return
    row.feedback_confirmations = (row.feedback_confirmations or 0) + 1
    db.commit()
