"""
Voice step-up stub — ready for a future speaker model under models/voice/.

VOICE_STEPUP_BYPASS=1 accepts any non-trivial recording (demo only).
"""
from __future__ import annotations

import os
from pathlib import Path

# When you add a real model, load from e.g. models/voice/speaker.pkl
_VOICE_DIR = Path(__file__).resolve().parent.parent / "models" / "voice"


def verify_voice_bytes(audio_bytes: bytes, user_id: str) -> dict:
    """
    Returns { "status": verified | not_configured | too_short | ... }.
    """
    if len(audio_bytes) < 800:
        return {
            "status": "too_short",
            "detail": "Recording too short — hold the button a bit longer.",
        }

    bypass = os.getenv("VOICE_STEPUP_BYPASS", "").lower() in ("1", "true", "yes")
    if bypass:
        return {
            "status": "verified",
            "mode": "voice_bypass_demo",
            "detail": "VOICE_STEPUP_BYPASS: demo accept (no speaker model check).",
        }

    # Placeholder: real implementation loads models/voice/* for user_id
    _ = user_id
    has_placeholder = (_VOICE_DIR / "voice_model.pkl").is_file()
    if has_placeholder:
        return {
            "status": "not_configured",
            "detail": "voice_model.pkl present but scorer not wired yet — use image or set VOICE_STEPUP_BYPASS=1.",
        }

    return {
        "status": "not_configured",
        "detail": (
            "Voice verification is not configured yet. Use “Verify with image”, "
            "or set VOICE_STEPUP_BYPASS=1 in .env for hackathon demo."
        ),
    }
