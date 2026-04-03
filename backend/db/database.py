import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

try:
    
    _env = Path(__file__).resolve().parent.parent / ".env"
    if _env.exists():
        load_dotenv(_env)
except ImportError:
    pass

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "",
).strip()


class Base(DeclarativeBase):
    pass


engine = None
SessionLocal = None

if DATABASE_URL:
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e:
        print(f"[db] Could not create engine (check DATABASE_URL): {e}")
        engine = None
        SessionLocal = None


def db_available() -> bool:
    return engine is not None and SessionLocal is not None


def init_db() -> None:
    """Create tables if they do not exist (dev convenience; prefer SQL migration in prod)."""
    if not engine:
        return
    from db.models import BehavioralProfile, User  # noqa: F401

    Base.metadata.create_all(bind=engine)


def check_connection() -> bool:
    if not engine:
        return False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
