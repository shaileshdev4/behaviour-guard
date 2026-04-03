import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, Integer, LargeBinary, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class BehavioralProfile(Base):
    __tablename__ = "behavioral_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[str] = mapped_column(
        String(128), unique=True, index=True, nullable=False
    )
    model_blob: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    scaler_blob: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    baseline_means: Mapped[Any] = mapped_column(JSONB, nullable=False, default=list)
    enrollment_checkpoint: Mapped[Optional[Any]] = mapped_column(
        JSONB, nullable=True, default=None
    )
    cohort_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lifetime_active_windows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    feedback_confirmations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
