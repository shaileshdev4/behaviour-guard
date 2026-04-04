"""
Face step-up verification using face_recognition encodings.

External artifact: pickle file(s) under models/face/ — see models/face/README.md

Set FACE_STEPUP_BYPASS=1 for hackathon demos when no .pkl exists yet (verifies
only that a face was detected — not identity).
"""
from __future__ import annotations

import io
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np

# Pre-trained encodings live here (no training at runtime — compare only).
_FACE_DIR = Path(__file__).resolve().parent.parent / "models" / "face"
_THRESHOLD = float(os.getenv("FACE_DISTANCE_THRESHOLD", "0.6"))

try:
    import face_recognition  # type: ignore

    _HAS_FR = True
except ImportError:
    face_recognition = None  # type: ignore
    _HAS_FR = False

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore


def _normalize_encodings(data: Any) -> list[np.ndarray]:
    if data is None:
        return []
    if isinstance(data, dict) and "encodings" in data:
        data = data["encodings"]
    if isinstance(data, np.ndarray):
        if data.ndim == 1:
            return [data]
        return [data[i] for i in range(len(data))]
    if isinstance(data, (list, tuple)):
        return [np.asarray(x, dtype=np.float64) for x in data]
    return [np.asarray(data, dtype=np.float64)]


def _load_known_encodings(user_id: str) -> list[np.ndarray] | None:
    """Prefer per-user file, then global face_model.pkl."""
    uid = user_id.replace("..", "").replace("/", "").replace("\\", "")[:64]
    candidates = [
        _FACE_DIR / "users" / f"{uid}.pkl",
        _FACE_DIR / "face_model.pkl",
    ]
    for path in candidates:
        if not path.is_file():
            continue
        try:
            with open(path, "rb") as f:
                raw = pickle.load(f)
        except Exception as e:
            print(f"[face] failed to load {path}: {e}")
            continue
        encs = _normalize_encodings(raw)
        if encs:
            return encs
    return None


def verify_face_bytes(image_bytes: bytes, user_id: str) -> dict:
    """
    Returns JSON-serializable dict with key "status":
    verified | no_face | unknown | not_configured | deps_missing
    """
    if not _HAS_FR or Image is None:
        return {
            "status": "deps_missing",
            "detail": "Install face-recognition and Pillow (see backend/models/face/README.md).",
        }

    bypass = os.getenv("FACE_STEPUP_BYPASS", "").lower() in ("1", "true", "yes")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
        rgb = np.asarray(img)
    except Exception as e:
        return {"status": "no_face", "detail": f"Invalid image: {e}"}

    encodings = face_recognition.face_encodings(rgb)
    if len(encodings) == 0:
        return {"status": "no_face", "detail": "No face detected in frame."}

    face = encodings[0]
    known = _load_known_encodings(user_id)

    if not known:
        if bypass:
            return {
                "status": "verified",
                "mode": "bypass_no_model",
                "detail": "FACE_STEPUP_BYPASS: no enrolled encodings; face only.",
            }
        return {
            "status": "not_configured",
            "detail": (
                "No face enrollment found. Add models/face/face_model.pkl or "
                f"models/face/users/{user_id}.pkl — or set FACE_STEPUP_BYPASS=1 for demo."
            ),
        }

    distances = face_recognition.face_distance(known, face)
    best = float(np.min(distances))
    if best < _THRESHOLD:
        return {"status": "verified", "distance": round(best, 4)}
    return {
        "status": "unknown",
        "distance": round(best, 4),
        "detail": "Face does not match enrolled template.",
    }
