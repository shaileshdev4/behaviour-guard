import json
import math
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM

# ── Paths ──────────────────────────────────────────────────────────────────────
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# ── Global artifacts ───────────────────────────────────────────────────────────
_population_model:  Any                    = None
_population_scaler: Optional[StandardScaler] = None
_population_kind:   str                    = "svm"

_cohort_models:  dict[str, Any]             = {}
_cohort_scalers: dict[str, StandardScaler]  = {}
_cohort_stats:   dict[str, dict]            = {}
_cohort_config:  dict                       = {}
_cohorts_ready:  bool                       = False

# Cache: model object id → (score_min, score_max) on enrollment training data
# Used to calibrate individual IF scores to a reliable 0–1 range.
_if_score_cache: dict[int, tuple[float, float]] = {}


def _sigmoid(x: float) -> float:
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    ez = math.exp(x)
    return ez / (1.0 + ez)


# ── Feature masking ────────────────────────────────────────────────────────────
#
# The population SVM and cohort GMMs were trained on CMU keystroke data.
# CMU has NO mouse, NO navigation, NO session timing.
# The scaler fitted on training data has mean=0, std=1 for features 8–14
# (mouse velocity, page dwell, mouse count, session elapsed).
# Feature 12 (nav_similarity) was always 1.0 in training.
# Features 16–17 (ratio, CV) have real scaler stats from training.
#
# At runtime, these features are non-zero. The SVM decision boundary was
# carved in the zero-subspace of these features, so ANY non-zero value
# moves the vector perpendicular to the training manifold → raw score = 0.
# sigmoid(0 * 3) = 0.5 — this is what causes the constant YELLOW bleed.
#
# Fix: restore training-time values for these features ONLY when scoring
# against the population/cohort models. The individual IF is trained at
# runtime on the user's real browser data (including mouse), so no masking.

_TRAINING_FEATURE_VALUES = {
    # index: value used in ALL CMU training rows
    7:  0.0,   # error_rate     — CMU typed fixed password, ~0 backspace
    8:  0.0,   # mean_mouse_vel — no mouse in CMU
    9:  0.0,   # std_mouse_vel
    10: 0.0,   # mean_page_dwell
    11: 0.0,   # std_page_dwell
    12: 1.0,   # nav_similarity — neutral (no nav history in CMU)
    14: 0.0,   # mouse_count
    15: 0.0,   # session_elapsed_min
}


def _mask_vector_for_population(vector: np.ndarray) -> np.ndarray:
    """
    Restore training-time neutral values for CMU-absent features.
    This keeps the vector inside the SVM's training manifold so the
    score reflects keystroke biometrics, not feature space distance.
    """
    v = vector.astype(np.float64).copy()
    for idx, val in _TRAINING_FEATURE_VALUES.items():
        v[idx] = val
    return v


# ── Model loading ──────────────────────────────────────────────────────────────

def load_population_model():
    load_all_models()


def load_all_models():
    global _population_model, _population_scaler, _population_kind
    global _cohort_models, _cohort_scalers, _cohort_stats, _cohort_config, _cohorts_ready

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    pop_path = MODELS_DIR / "population_model.pkl"
    sc_path  = MODELS_DIR / "population_scaler.pkl"

    if pop_path.exists() and sc_path.exists():
        _population_model  = joblib.load(pop_path)
        _population_scaler = joblib.load(sc_path)
        _population_kind   = "svm" if isinstance(_population_model, OneClassSVM) else "iforest"
        print(f"[scorer] Population model loaded ({_population_kind}).")

        # Verify: score a CMU-like vector to confirm masking will work
        _verify_population_scoring()
    else:
        print("[scorer] No population model — training synthetic IsolationForest...")
        _train_synthetic_population()

    # ── Cohort models ──
    _cohort_models.clear()
    _cohort_scalers.clear()
    _cohort_stats.clear()
    _cohort_config = {}
    _cohorts_ready = False

    cfg_path   = MODELS_DIR / "cohort_config.json"
    stats_path = MODELS_DIR / "cohort_stats.json"

    if cfg_path.exists() and stats_path.exists():
        with open(cfg_path,   encoding="utf-8") as f:
            _cohort_config = json.load(f)
        with open(stats_path, encoding="utf-8") as f:
            raw_stats = json.load(f)

        n = int(_cohort_config.get("n_cohorts", 0))
        for i in range(n):
            cid = f"cohort_{i:02d}"
            mp  = MODELS_DIR / f"{cid}_model.pkl"
            sp  = MODELS_DIR / f"{cid}_scaler.pkl"
            if not mp.exists() or not sp.exists():
                continue
            if cid not in raw_stats:
                continue
            _cohort_models[cid]  = joblib.load(mp)
            _cohort_scalers[cid] = joblib.load(sp)
            _cohort_stats[cid]   = raw_stats[cid]

        _cohorts_ready = len(_cohort_models) == n and n > 0
        if _cohorts_ready:
            print(f"[scorer] Cohort GMMs loaded: {n} cohorts.")
        elif n > 0:
            print("[scorer] Cohort: some .pkl files missing — cohort tier disabled.")
    else:
        print("[scorer] No cohort config — cohort tier skipped.")


def _verify_population_scoring():
    """Sanity-check: CMU-like vector should score > 0.7 after masking."""
    cmu_vec = np.array([
        108.0, 26.0, 92.0, 47.0, 201.0, 59.0, 2.8, 0.0,
        0.0, 0.0, 0.0, 0.0, 1.0, 10.0, 0.0, 0.0, 0.54, 0.30
    ], dtype=np.float32)
    score = score_population(cmu_vec)
    print(f"[scorer] Population sanity check (CMU-like vector): {score:.4f}  (want > 0.70)")


def _train_synthetic_population():
    """Synthetic IF trained with browser features included — avoids CMU mismatch."""
    global _population_model, _population_scaler, _population_kind

    np.random.seed(42)
    n = 3000
    data = np.column_stack([
        # Keystroke features — match CMU distribution
        np.random.normal(108, 18, n),    # 0  mean_dwell
        np.random.normal(26,   8, n),    # 1  std_dwell
        np.random.normal(92,  18, n),    # 2  mean_flight
        np.random.normal(47,  11, n),    # 3  std_flight
        np.random.normal(201, 33, n),    # 4  mean_digraph
        np.random.normal(59,  14, n),    # 5  std_digraph
        np.random.normal(2.6, 0.5, n),   # 6  entropy
        np.random.normal(0.04, 0.02, n), # 7  error_rate
        # Browser features — real distributions
        np.random.normal(0.6, 0.25, n),  # 8  mean_mouse_vel
        np.random.normal(0.2, 0.10, n),  # 9  std_mouse_vel
        np.random.normal(12,   6, n),    # 10 mean_page_dwell
        np.random.normal(4,    2, n),    # 11 std_page_dwell
        np.random.uniform(0.7, 1.0, n),  # 12 nav_similarity
        np.random.normal(12,   5, n),    # 13 keystroke_count
        np.random.normal(18,   8, n),    # 14 mouse_count
        np.random.normal(3,    2, n),    # 15 session_elapsed
        np.random.normal(0.54, 0.06, n), # 16 dwell/digraph ratio
        np.random.normal(0.30, 0.07, n), # 17 digraph CV
    ])
    data = np.clip(data, 0, None)

    scaler     = StandardScaler()
    data_scaled = scaler.fit_transform(data)
    model      = IsolationForest(n_estimators=300, contamination=0.05, random_state=42)
    model.fit(data_scaled)

    sample_scores = model.score_samples(data_scaled)
    print(
        f"[scorer] Synthetic IF score range: "
        f"min={sample_scores.min():.3f} max={sample_scores.max():.3f}"
    )

    joblib.dump(model, MODELS_DIR / "population_model.pkl")
    joblib.dump(scaler, MODELS_DIR / "population_scaler.pkl")
    _population_model  = model
    _population_scaler = scaler
    _population_kind   = "iforest"
    print("[scorer] Synthetic population model trained and saved.")


# ── Scoring ────────────────────────────────────────────────────────────────────

def assign_cohort_id(mean_dwell_ms: float) -> Optional[str]:
    if not _cohort_config:
        return None
    bounds = _cohort_config.get("boundaries_ms") or []
    n      = int(_cohort_config.get("n_cohorts", 0))
    if len(bounds) < n + 1 or n <= 0:
        return None
    for i in range(n):
        if mean_dwell_ms <= float(bounds[i + 1]) + 1e-9:
            return f"cohort_{i:02d}"
    return f"cohort_{n - 1:02d}"


def score_population(vector: np.ndarray) -> float:
    """
    Score against the population model.
    ALWAYS masks browser-only features to training-time values first.
    This keeps the vector on the SVM's training manifold.
    """
    if _population_model is None or _population_scaler is None:
        return 0.75

    v_masked = _mask_vector_for_population(vector)
    scaled   = _population_scaler.transform(v_masked.reshape(1, -1))
    raw      = float(_population_model.score_samples(scaled)[0])

    if _population_kind == "svm":
        # SVM raw scores for normal humans cluster around +70 (from diagnostic output).
        # sigmoid(70 * 3) = 1.0 — completely saturated.
        # We need a much gentler scaling so the score can vary meaningfully.
        # Shift so that raw=0 (decision boundary) → 0.5, raw=+70 → high but not 1.0.
        # Use sigmoid(raw * 0.05): raw=70 → sigmoid(3.5) = 0.97, raw=0 → 0.5, raw=-10 → 0.38
        return _sigmoid(raw * 0.05)
    else:
        # IsolationForest path (synthetic or real IF population)
        # score_samples range on training data: typically [-0.5, -0.05]
        # clip((raw + 0.6) / 0.55, 0, 1)
        return float(np.clip((raw + 0.6) / 0.55, 0.0, 1.0))


def score_cohort(vector: np.ndarray, cohort_id: Optional[str]) -> Optional[float]:
    """
    Score against the per-cohort GMM.
    ALWAYS masks browser-only features to training-time values first.
    """
    if not cohort_id or not _cohorts_ready or cohort_id not in _cohort_models:
        return None

    v_masked = _mask_vector_for_population(vector)  # same masking as population

    model   = _cohort_models[cohort_id]
    scaler  = _cohort_scalers[cohort_id]
    stats   = _cohort_stats.get(cohort_id) or {}
    mean_ll = float(stats.get("mean_ll", 0.0))
    std_ll  = float(stats.get("std_ll",  1.0))

    v  = scaler.transform(v_masked.reshape(1, -1))
    ll = float(model.score_samples(v)[0])

    if std_ll < 1e-6:
        return 0.5
    z = (ll - mean_ll) / std_ll
    return _sigmoid(z)


def train_individual_model(
    vectors:       list,
    session_count: int = 0,
) -> tuple[IsolationForest, StandardScaler]:
    """
    Train the per-user Isolation Forest on enrollment vectors.

    Key calibration decisions:
    - contamination: very low for small n — we want the boundary to INCLUDE
      the user's natural variation, not exclude it.
      With n=12: contamination=0.02 → 0.24 outliers assumed ≈ 0.
      The IF boundary is generous — only truly different patterns score low.
    - n_estimators=300: more trees = more stable scores window-to-window.
    - Store (min, max) of training scores for reliable normalisation.
    """
    X        = np.array(vectors, dtype=np.float32)
    n        = len(X)
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Never use contamination > 0.05 for small enrollment sets.
    # Formula: 1/(2*n) gives ~4% for n=12, ~1% for n=50.
    contamination = max(0.01, min(0.05, 1.0 / (2 * max(n, 1))))

    model = IsolationForest(
        n_estimators=300,
        contamination=contamination,
        max_samples=min(n, 256),
        random_state=42,
    )
    model.fit(X_scaled)

    # Calibration: record the actual score range on training data.
    # This lets score_individual map scores relative to what the model
    # considers "normal for this user" rather than using fixed constants.
    train_scores = model.score_samples(X_scaled)
    score_min    = float(train_scores.min())
    score_max    = float(train_scores.max())
    _if_score_cache[id(model)] = (score_min, score_max)

    print(
        f"[scorer] Individual IF trained: n={n}, "
        f"contamination={contamination:.4f}, "
        f"score_range=[{score_min:.4f}, {score_max:.4f}]"
    )
    return model, scaler


def score_individual(
    model:  IsolationForest,
    scaler: StandardScaler,
    vector: np.ndarray,
) -> float:
    """
    Score a window against the individual user's IF.
    Uses the calibrated score range from training so that:
    - A window identical to enrollment → score near 0.85
    - A window with moderate natural variation → score ~0.60–0.80
    - An impostor window → score near 0.10–0.30

    NO feature masking here — the individual model was trained on the
    user's real browser data including mouse and navigation features.
    """
    scaled = scaler.transform(vector.reshape(1, -1))
    raw    = float(model.score_samples(scaled)[0])

    # Use calibrated range if available
    rng = _if_score_cache.get(id(model))
    if rng is not None:
        lo, hi = rng
        if hi > lo:
            # Map training range [lo, hi] → [0.20, 0.90]
            # A score at 'hi' (best inlier) → 0.90
            # A score at 'lo' (worst inlier / boundary) → 0.20
            # A score below 'lo' (true outlier) → approaches 0.0
            normalised = (raw - lo) / (hi - lo)
            return float(np.clip(0.20 + normalised * 0.70, 0.0, 1.0))

    # Fallback: original notebook formula
    return float(np.clip((raw + 0.7) / 0.6, 0.0, 1.0))


# ── Fusion ─────────────────────────────────────────────────────────────────────

WEIGHT_SCHEDULE = [
    (1, 0.40, 0.60, 0.00),
    (2, 0.35, 0.50, 0.15),
    (4, 0.25, 0.40, 0.35),
    (6, 0.15, 0.30, 0.55),
    (7, 0.10, 0.20, 0.70),
]


def get_three_tier_weights(trust_day: int) -> tuple[float, float, float]:
    for threshold, wp, wc, wi in reversed(WEIGHT_SCHEDULE):
        if trust_day >= threshold:
            return wp, wc, wi
    return WEIGHT_SCHEDULE[0][1], WEIGHT_SCHEDULE[0][2], WEIGHT_SCHEDULE[0][3]


def fuse_scores(
    s_pop:        float,
    s_coh:        Optional[float],
    s_ind:        Optional[float],
    trust_day:    int,
    context_mult: float = 1.0,
) -> float:
    wp, wc, wi = get_three_tier_weights(trust_day)

    if s_ind is None:
        total = wp + wc
        if total > 0:
            wp, wc = wp / total, wc / total
        wi      = 0.0
        s_ind_v = 0.0
    else:
        s_ind_v = s_ind

    s_coh_v = s_pop if s_coh is None else s_coh

    raw      = wp * s_pop + wc * s_coh_v + wi * s_ind_v
    adjusted = raw / max(context_mult, 1e-9)
    return float(np.clip(adjusted * 100, 0.0, 100.0))


# ── Context multiplier ─────────────────────────────────────────────────────────

def context_risk_multiplier(
    action:             str,
    amount:             float = 0,
    is_new_beneficiary: bool  = False,
    hour:               int   = 12,
    device_known:       bool  = True,
) -> float:
    mult = 1.0
    if not device_known:
        mult *= 1.35
    if action == "transfer":
        if amount > 50_000:
            mult *= 1.5
        if amount > 200_000:
            mult *= 1.3
        if is_new_beneficiary:
            mult *= 1.6
    if not (8 <= hour <= 22):
        mult *= 1.2
    return mult


# ── Smoothing + trust schedule ─────────────────────────────────────────────────

def apply_ema(current_score: float, new_score: float, alpha: float = 0.3) -> float:
    return alpha * new_score + (1 - alpha) * current_score


def trust_day_for_total_active(
    total_lifetime_active_windows: int,
    enrolling: bool,
) -> int:
    if enrolling:
        return 1
    t = total_lifetime_active_windows
    if t < 5:   return 2
    if t < 15:  return 4
    if t < 30:  return 6
    return 7


# ── Legacy 2-tier (unused) ─────────────────────────────────────────────────────

def get_weights(weight_day: int) -> tuple[float, float]:
    schedule = {
        0: (1.00, 0.00), 1: (0.70, 0.30), 2: (0.50, 0.50),
        3: (0.35, 0.65), 4: (0.25, 0.75), 5: (0.20, 0.80), 6: (0.15, 0.85),
    }
    return schedule.get(min(weight_day, 6), (0.15, 0.85))