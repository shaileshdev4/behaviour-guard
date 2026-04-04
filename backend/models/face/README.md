# Face step-up (`face_model.pkl`)

Put your **pre-built** encoding file here — **no training runs in the API**, only comparison.

## Required path

- **`models/face/face_model.pkl`** — pickle of `face_recognition` 128-d encodings  
  (list of numpy vectors, or `{"encodings": [...]}`).

## Optional per-user

- **`models/face/users/<JWT-sub-uuid>.pkl`** — same format; checked before `face_model.pkl`.

## Regenerate from a photo (optional)

```bash
cd backend
python scripts/enroll_face_model.py --image your_photo.jpg --out models/face/face_model.pkl
```

## Dependencies

```bash
pip install face-recognition Pillow python-multipart
```

## Demo without a file

```env
FACE_STEPUP_BYPASS=1
```

## Tunables

- `FACE_DISTANCE_THRESHOLD` (default `0.6`) — lower = stricter.
