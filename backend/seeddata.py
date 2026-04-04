"""
Seed two demo users with realistic behavioral profiles.
Simulates 7 days of banking sessions for a slow and fast typist.

Run: python seed_demo_users.py
Requires: DATABASE_URL in .env, models/ folder present
"""

import sys
import os
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
sys.path.insert(0, str(Path(__file__).parent))

from db.database import SessionLocal, init_db, db_available
from db import crud
from core.scorer import train_individual_model

# ── Demo user definitions ──────────────────────────────────────────────────────

DEMO_USERS = [
    {
        "email":       "rahul@bharatbank.demo",
        "password":    "Demo@1234",
        "label":       "Rahul Sharma (slow typist)",
        # Typing profile: slow, deliberate, consistent
        "mean_dwell":  130,   # holds keys longer
        "std_dwell":   18,    # fairly consistent
        "mean_flight": 120,   # longer gaps between keys
        "std_flight":  35,
        "mean_digraph":250,   # slow key-to-key rhythm
        "std_digraph": 45,
        "entropy":     2.2,   # moderate entropy
        "error_rate":  0.03,  # few mistakes
    },
    {
        "email":       "priya@bharatbank.demo",
        "password":    "Demo@5678",
        "label":       "Priya Mehta (fast typist)",
        # Typing profile: fast, fluid, slightly less consistent
        "mean_dwell":  72,    # quick key presses
        "std_dwell":   14,    # very consistent
        "mean_flight": 55,    # minimal gaps
        "std_flight":  22,
        "mean_digraph":127,   # fast rhythm
        "std_digraph": 28,
        "entropy":     2.8,   # higher entropy (more varied keystrokes)
        "error_rate":  0.06,  # types fast, more corrections
    },
]

# ── Realistic feature vector generation ───────────────────────────────────────

def generate_session_vectors(
    profile: dict,
    n_windows:     int   = 30,
    session_index: int   = 0,
    rng:           np.random.RandomState = None,
) -> list:
    """
    Generate n_windows realistic feature vectors for one session.

    Natural variation sources:
    - Fatigue: typing slows slightly over a session (up to 8%)
    - Attention: entropy and error_rate vary window to window
    - Context: some windows have more typing than others

    Features 0-7 only (keystroke-only IF):
    0: mean_dwell, 1: std_dwell, 2: mean_flight, 3: std_flight,
    4: mean_digraph, 5: std_digraph, 6: entropy, 7: error_rate
    """
    if rng is None:
        rng = np.random.RandomState(session_index * 17 + 42)

    p          = profile
    vectors    = []
    # Fatigue increases slightly across the session
    fatigue    = 1.0 + (session_index % 5) * 0.015  # up to 7.5% slower by session 5

    for w in range(n_windows):
        # Window-level micro-variation (same person, different focus)
        attention  = rng.uniform(0.92, 1.08)
        window_fat = 1.0 + (w / n_windows) * 0.05  # slight within-session fatigue

        scale = fatigue * attention * window_fat

        mean_dwell  = max(20, rng.normal(p["mean_dwell"]  * scale, p["std_dwell"]  * 0.6))
        std_dwell   = max(5,  rng.normal(p["std_dwell"]   * scale, p["std_dwell"]  * 0.25))
        mean_flight = max(10, rng.normal(p["mean_flight"] * scale, p["std_flight"] * 0.6))
        std_flight  = max(5,  rng.normal(p["std_flight"]  * scale, p["std_flight"] * 0.25))
        mean_digraph= max(30, rng.normal(p["mean_digraph"]* scale, p["std_digraph"]* 0.6))
        std_digraph = max(8,  rng.normal(p["std_digraph"] * scale, p["std_digraph"]* 0.25))
        entropy     = max(0,  rng.normal(p["entropy"],  0.3))
        error_rate  = max(0,  rng.normal(p["error_rate"],0.02))

        # Full 18-feature vector (indices 8-17 are browser features — neutral for storage)
        full_vector = [
            mean_dwell, std_dwell,         # 0,1
            mean_flight, std_flight,       # 2,3
            mean_digraph, std_digraph,     # 4,5
            entropy,                       # 6
            error_rate,                    # 7
            # Browser features — neutral values for pre-seeded profiles
            0.65, 0.22,                    # 8,9  mouse vel mean/std
            12.0, 4.0,                     # 10,11 page dwell mean/std
            0.88,                          # 12 nav_similarity
            12.0,                          # 13 keystroke_count
            18.0,                          # 14 mouse_count
            float(session_index * 8 + w) * 10.0 / 60.0,  # 15 session_elapsed_min
            mean_dwell / max(mean_digraph, 1),  # 16 dwell/digraph ratio
            std_digraph / max(mean_digraph, 1), # 17 digraph CV
        ]
        vectors.append(full_vector)

    return vectors


def seed_user(db, profile: dict) -> None:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    print(f"\n{'='*55}")
    print(f"Seeding: {profile['label']}")
    print(f"Email:   {profile['email']}")
    print(f"{'='*55}")

    # ── Create user account ──
    existing = crud.get_user_by_email(db, profile["email"])
    if existing:
        user = existing
        print(f"  User already exists — updating profile")
    else:
        h    = pwd_context.hash(profile["password"])
        user = crud.create_user(db, profile["email"], h)
        print(f"  Created user: {user.id}")

    user_id = str(user.id)

    # ── Simulate 7 days × 4 sessions/day = 28 sessions ──
    # Each session: 20 windows (realistic for a banking visit)
    # Total: 560 vectors → lifetime_active_windows = 560
    # trust_day = 7 (30+ required, we have 560)

    all_vectors    = []
    enroll_vectors = []  # first 15 windows = enrollment

    rng = np.random.RandomState(hash(profile["email"]) % (2**32))

    total_sessions = 28   # 7 days × 4 sessions
    windows_per_session = 20

    for session_idx in range(total_sessions):
        vecs = generate_session_vectors(
            profile,
            n_windows=windows_per_session,
            session_index=session_idx,
            rng=rng,
        )
        if session_idx == 0:
            enroll_vectors = vecs[:15]  # first 15 = enrollment
        all_vectors.extend(vecs)

    active_vectors  = all_vectors[15:]  # everything after enrollment
    lifetime_active = len(active_vectors)

    print(f"  Total vectors generated: {len(all_vectors)}")
    print(f"  Enrollment vectors:      {len(enroll_vectors)}")
    print(f"  Active/recent vectors:   {lifetime_active}")
    print(f"  trust_day will be:       7 (>{30} active windows)")

    # ── Train individual Isolation Forest ──
    print(f"  Training Individual IF on {len(all_vectors)} vectors...")
    model, scaler = train_individual_model(all_vectors, session_count=total_sessions)

    # ── Compute baseline means from enrollment ──
    import numpy as np_inner
    baseline_means = np_inner.mean(
        np_inner.array(enroll_vectors, dtype=np.float32), axis=0
    ).astype(np.float32).tolist()

    # ── Store recent_vectors (last 150 active) ──
    recent = active_vectors[-150:]

    # ── Assign cohort by typing-speed bucket (ms dwell; config boundaries may not cover all seeds)
    dwell = float(profile["mean_dwell"])
    if dwell < 90:
        cohort_id = "cohort_00"
    elif dwell < 110:
        cohort_id = "cohort_01"
    elif dwell < 130:
        cohort_id = "cohort_02"
    elif dwell < 150:
        cohort_id = "cohort_03"
    elif dwell < 170:
        cohort_id = "cohort_04"
    else:
        cohort_id = "cohort_05"
    print(f"  Cohort assigned:         {cohort_id} (dwell={dwell}ms)")

    # ── Upsert to DB ──
    crud.upsert_behavioral_profile(
        db,
        user_id=user_id,
        model=model,
        scaler=scaler,
        baseline_means=baseline_means,
        cohort_id=cohort_id,
        lifetime_active_windows=lifetime_active,
        recent_vectors=recent,
    )

    print(f"  Profile saved to DB ✓")
    print(f"  When this user logs in:")
    print(f"    phase         = active  (skips enrollment)")
    print(f"    current_score = 85")
    print(f"    trust_day     = 7  (individual model at 70% weight)")
    print(f"    lifetime_windows = {lifetime_active}")

    # ── Self-test: score a sample window from this user ──
    from core.scorer import score_individual, _if_score_cache
    test_vec = np.array(generate_session_vectors(profile, n_windows=1, session_index=5, rng=rng)[0])
    s_ind    = score_individual(model, scaler, test_vec)
    print(f"\n  Self-score (sample window): {s_ind:.4f}  (want > 0.55)")

    # ── Impostor test: score a window from the OTHER typing style ──
    other_speed   = 250 if profile["mean_dwell"] < 100 else 72
    impostor_prof = {
        "mean_dwell": other_speed, "std_dwell": 15,
        "mean_flight": other_speed * 0.5, "std_flight": 20,
        "mean_digraph": other_speed * 2, "std_digraph": 30,
        "entropy": 2.5, "error_rate": 0.04,
    }
    impostor_rng = np.random.RandomState(999)
    imp_vec   = np.array(generate_session_vectors(impostor_prof, n_windows=1, rng=impostor_rng)[0])
    s_impostor = score_individual(model, scaler, imp_vec)
    print(f"  Impostor score:             {s_impostor:.4f}  (want < 0.40)")
    print(f"  Gap (self - impostor):      {s_ind - s_impostor:.4f}  (want > 0.20)")


def main():
    print("BehaviorGuard — Demo User Seeding Script")
    print("=" * 55)

    if not db_available():
        print("ERROR: DATABASE_URL not configured or DB not reachable.")
        print("Set DATABASE_URL in backend/.env and retry.")
        sys.exit(1)

    init_db()
    db = SessionLocal()

    try:
        for profile in DEMO_USERS:
            seed_user(db, profile)
    finally:
        db.close()

    print("\n" + "=" * 55)
    print("DONE — Demo users ready.")
    print("=" * 55)
    print()
    print("Login credentials:")
    for p in DEMO_USERS:
        print(f"  {p['label']}")
        print(f"    Email:    {p['email']}")
        print(f"    Password: {p['password']}")
    print()
    print("Both users will start in ACTIVE phase with trust_day=7.")
    print("The impostor demo will trigger RED within 2-3 windows.")


if __name__ == "__main__":
    main()