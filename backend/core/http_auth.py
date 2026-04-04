"""Bearer JWT → user id (JWT `sub`)."""

from typing import Optional

from fastapi import HTTPException
from jwt.exceptions import PyJWTError

from core.auth_tokens import decode_access_token


def bearer_user_id(authorization: Optional[str]) -> str:
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
