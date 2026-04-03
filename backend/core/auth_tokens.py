import os
from datetime import datetime, timedelta, timezone

import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-change-me-behavior-guard")
JWT_ALG = "HS256"
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))


def create_access_token(user_id: str, email: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    token = jwt.encode(
        {"sub": user_id, "email": email, "exp": exp},
        JWT_SECRET,
        algorithm=JWT_ALG,
    )
    # PyJWT >=2 returns str; older returned bytes
    return token if isinstance(token, str) else token.decode("ascii")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
