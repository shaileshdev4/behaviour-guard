"""Voice step-up verification (multipart audio — WebM/WAV)."""

from typing import Optional

from fastapi import APIRouter, File, Header, UploadFile

from core.http_auth import bearer_user_id
from core.voice_verify import verify_voice_bytes

router = APIRouter()


@router.post("/voice/verify")
async def verify_voice(
    authorization: Optional[str] = Header(None),
    file: UploadFile = File(...),
):
    """Requires Authorization: Bearer. Body: multipart file (recorded clip)."""
    user_id = bearer_user_id(authorization)
    raw = await file.read()
    if not raw:
        return {"status": "too_short", "detail": "Empty upload."}
    return verify_voice_bytes(raw, user_id)
