# Voice step-up (future)

`POST /api/voice/verify` is wired; scoring is a **stub** until you add a speaker model here.

- **`VOICE_STEPUP_BYPASS=1`** in `.env` — accepts any non-trivial recording (demo only).
- Later: add `voice_model.pkl` (or per-user files) and implement comparison in `core/voice_verify.py`.

Optional future deps (not installed by default):

```text
# librosa>=0.10.0
# soundfile>=0.12.0
```
