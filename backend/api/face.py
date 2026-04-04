"""Face step-up verification (multipart image)."""

from typing import Optional

from fastapi import APIRouter, File, Header, UploadFile

from core.face_verify import verify_face_bytes
from core.http_auth import bearer_user_id

router = APIRouter()


@router.post("/face/verify")
async def verify_face(
    authorization: Optional[str] = Header(None),
    file: UploadFile = File(...),
):
    """
    Compare a captured frame to enrolled encodings in models/face/face_model.pkl.
    Requires Authorization: Bearer (same JWT as banking session).
    """
    user_id = bearer_user_id(authorization)
    raw = await file.read()
    if not raw:
        return {"status": "no_face", "detail": "Empty upload."}
    return verify_face_bytes(raw, user_id)
