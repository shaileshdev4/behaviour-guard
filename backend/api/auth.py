from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from jwt.exceptions import PyJWTError
from pydantic import BaseModel, EmailStr, field_validator
from passlib.context import CryptContext
from sqlalchemy.exc import IntegrityError

from core.auth_tokens import create_access_token, decode_access_token
from db.database import SessionLocal, db_available
from db import crud

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RegisterRequest(BaseModel):
    email:    EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


def _issue_token_response(user_id: str, email: str) -> dict:
    token = create_access_token(user_id, email)
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user_id":      user_id,
        "email":        email,
    }


@router.post("/auth/register")
def register(req: RegisterRequest):
    if not db_available():
        raise HTTPException(
            status_code=503,
            detail="Database not configured — set DATABASE_URL to enable signup",
        )
    db = SessionLocal()
    try:
        if crud.get_user_by_email(db, req.email):
            raise HTTPException(status_code=409, detail="Email already registered")
        h = pwd_context.hash(req.password)
        user = crud.create_user(db, req.email, h)
        return _issue_token_response(str(user.id), user.email)
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Email already registered")
    except Exception as e:
        print(f"[auth/register] {e}")
        raise HTTPException(status_code=500, detail="Registration failed")
    finally:
        db.close()


@router.post("/auth/login")
def login(req: LoginRequest):
    if not db_available():
        raise HTTPException(
            status_code=503,
            detail="Database not configured — set DATABASE_URL",
        )
    db = SessionLocal()
    try:
        user = crud.get_user_by_email(db, req.email)
        if not user or not pwd_context.verify(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return _issue_token_response(str(user.id), user.email)
    finally:
        db.close()


def _resolve_user_id_from_header(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization: Bearer <token> required",
        )
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty bearer token")
    try:
        payload = decode_access_token(token)
        return str(payload["sub"])
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.delete("/auth/profile")
def delete_behavioral_profile(authorization: Optional[str] = Header(None)):
    """DPDPA erasure — delete behavioral profile row (models, checkpoint, device hashes)."""
    if not db_available():
        raise HTTPException(
            status_code=503,
            detail="Database not configured — set DATABASE_URL",
        )
    user_id = _resolve_user_id_from_header(authorization)
    db = SessionLocal()
    try:
        deleted = crud.delete_profile_by_user_id(db, user_id)
        if not deleted:
            raise HTTPException(
                status_code=404,
                detail="No behavioral profile found for this account",
            )
        return {
            "deleted":               True,
            "user_id":               user_id,
            "device_hashes_cleared": True,
            "message": (
                "Your behavioral profile and all device fingerprints have been "
                "permanently deleted. Imprint will rebuild from scratch on your next session."
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[auth/profile DELETE] {e}")
        raise HTTPException(status_code=500, detail="Profile deletion failed")
    finally:
        db.close()
