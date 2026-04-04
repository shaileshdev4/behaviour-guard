#!/usr/bin/env python3
"""
Build face_model.pkl from one reference photo.

Usage:
  python scripts/enroll_face_model.py --image photo.jpg --out models/face/face_model.pkl
  python scripts/enroll_face_model.py --image photo.jpg --out models/face/users/<USER_UUID>.pkl
"""
from __future__ import annotations

import argparse
import pickle
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def main() -> None:
    parser = argparse.ArgumentParser(description="Enroll face encodings to pickle.")
    parser.add_argument("--image", required=True, help="Path to reference image (jpg/png).")
    parser.add_argument(
        "--out",
        default="models/face/face_model.pkl",
        help="Output pickle path (relative to backend/ or absolute).",
    )
    args = parser.parse_args()

    try:
        import face_recognition
        from PIL import Image
    except ImportError as e:
        print("Install: pip install face-recognition Pillow", file=sys.stderr)
        raise SystemExit(1) from e

    img_path = Path(args.image)
    if not img_path.is_file():
        raise SystemExit(f"Image not found: {img_path}")

    out_path = Path(args.out)
    if not out_path.is_absolute():
        out_path = ROOT / out_path
    out_path.parent.mkdir(parents=True, exist_ok=True)

    image = face_recognition.load_image_file(str(img_path))
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        raise SystemExit("No face found in image — use a clearer front-facing photo.")

    # Store as list of arrays (face_recognition.face_distance compatible)
    to_save = [np.asarray(encodings[0], dtype=np.float64)]
    with open(out_path, "wb") as f:
        pickle.dump(to_save, f)

    print(f"Wrote {len(to_save)} encoding(s) to {out_path}")


if __name__ == "__main__":
    main()
