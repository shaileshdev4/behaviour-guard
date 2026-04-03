import json
import math
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM

# ── Paths (works regardless of CWD when using uvicorn) ────────────────────────

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# ── Global artifacts ───────────────────────────────────────────────────────────

_population_model: Any = None
_population_scaler: Optional[StandardScaler] = None
_population_kind: str = "iforest"  # "svm" | "iforest"

_cohort_models: dict[str, Any] = {}
_cohort_scalers: dict[str, StandardScaler] = {}
_cohort_stats: dict[str, dict] = {}
_cohort_config: dict = {}
_cohorts_ready: bool = False


def _sigmoid(x: float) -> float:
    """1/(1+exp(-x)) without OverflowError for extreme x (cohort z-scores, SVM margin)."""
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


# ── Load all trained artifacts (notebook output) ──────────────────────────────

def load_population_model():
    """Backward-compatible name: loads population + cohort stack."""
    load_all_models()


def load_all_models():
    """
    Load models from BehaviorGuard_ML_Training.ipynb outputs:
      - population_model.pkl / population_scaler.pkl (OneClassSVM or IsolationForest)
      - cohort_XX_model.pkl / scaler.pkl + cohort_stats.json + cohort_config.json
    Falls back to synthetic Isolation Forest if population pickles are missing.
    """
    global _population_model, _population_scaler, _population_kind
    global _cohort_models, _cohort_scalers, _cohort_stats, _cohort_config, _cohorts_ready

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    pop_path = MODELS_DIR / "population_model.pkl"
    sc_path = MODELS_DIR / "population_scaler.pkl"

    if pop_path.exists() and sc_path.exists():
        _population_model = joblib.load(pop_path)
        _population_scaler = joblib.load(sc_path)
        if isinstance(_population_model, OneClassSVM):
            _population_kind = "svm"
        else:
            _population_kind = "iforest"
        print(f"[scorer] Population model loaded ({_population_kind}).")
    else:
        print("[scorer] No population model found. Training synthetic IsolationForest...")
        _train_synthetic_population()

    _cohort_models.clear()
    _cohort_scalers.clear()
    _cohort_stats.clear()
    _cohort_config = {}
    _cohorts_ready = False

    cfg_path = MODELS_DIR / "cohort_config.json"
    stats_path = MODELS_DIR / "cohort_stats.json"

    if cfg_path.exists() and stats_path.exists():
        with open(cfg_path, encoding="utf-8") as f:
            _cohort_config = json.load(f)
        with open(stats_path, encoding="utf-8") as f:
            raw_stats = json.load(f)
        n = int(_cohort_config.get("n_cohorts", 0))
        for i in range(n):
            cid = f"cohort_{i:02d}"
            mp = MODELS_DIR / f"{cid}_model.pkl"
            sp = MODELS_DIR / f"{cid}_scaler.pkl"
            if not mp.exists() or not sp.exists():
                continue
            if cid not in raw_stats:
                continue
            _cohort_models[cid] = joblib.load(mp)
            _cohort_scalers[cid] = joblib.load(sp)
            _cohort_stats[cid] = raw_stats[cid]
        _cohorts_ready = len(_cohort_models) == n and n > 0
        if _cohorts_ready:
            print(f"[scorer] Cohort GMMs loaded: {n} cohorts.")
        elif n > 0:
            print("[scorer] Cohort config present but some .pkl files missing — cohort scoring disabled.")
    else:
        print("[scorer] No cohort_config/cohort_stats — cohort tier skipped (population + individual only).")


def _train_synthetic_population():
    global _population_model, _population_scaler, _population_kind

    np.random.seed(42)
    n = 2000
    data = np.column_stack([
        np.random.normal(80, 15, n),
        np.random.normal(12, 4, n),
        np.random.normal(75, 20, n),
        np.random.normal(15, 5, n),
        np.random.normal(150, 30, n),
        np.random.normal(20, 8, n),
        np.random.normal(2.5, 0.5, n),
        np.random.normal(0.04, 0.02, n),
        np.random.normal(0.8, 0.3, n),
        np.random.normal(0.2, 0.1, n),
        np.random.normal(15, 8, n),
        np.random.normal(5, 3, n),
        np.random.normal(0.85, 0.1, n),
        np.random.normal(40, 15, n),
        np.random.normal(20, 10, n),
        np.random.normal(5, 3, n),
        np.random.normal(0.5, 0.1, n),
        np.random.normal(0.15, 0.05, n),
    ])
    data = np.clip(data, 0, None)
    scaler = StandardScaler()
    data_scaled = scaler.fit_transform(data)
    model = IsolationForest(
        n_estimators=200, contamination=0.05, random_state=42
    )
    model.fit(data_scaled)
    sample_scores = model.score_samples(data_scaled[:100])
    print(
        "[scorer] Synthetic IF score_samples range (train sample): "
        f"min={float(np.min(sample_scores)):.3f} max={float(np.max(sample_scores)):.3f}"
    )
    joblib.dump(model, MODELS_DIR / "population_model.pkl")
    joblib.dump(scaler, MODELS_DIR / "population_scaler.pkl")
    _population_model = model
    _population_scaler = scaler
    _population_kind = "iforest"
    print("[scorer] Synthetic population model trained and saved.")


def assign_cohort_id(mean_dwell_ms: float) -> Optional[str]:
    """Map mean dwell (feature 0) to cohort_XX using notebook quantile boundaries."""
    if not _cohort_config:
        return None
    bounds = _cohort_config.get("boundaries_ms") or []
    n = int(_cohort_config.get("n_cohorts", 0))
    if len(bounds) < n + 1 or n <= 0:
        return None
    for i in range(n):
        if mean_dwell_ms <= float(bounds[i + 1]) + 1e-9:
            return f"cohort_{i:02d}"
    return f"cohort_{n - 1:02d}"


def score_population(vector: np.ndarray) -> float:
    if _population_model is None or _population_scaler is None:
        return 0.8
    scaled = _population_scaler.transform(vector.reshape(1, -1))
    raw = float(_population_model.score_samples(scaled)[0])
    if _population_kind == "svm":
        return _sigmoid(raw * 3)
    # IsolationForest: synthetic / notebook ranges differ from CMU-only tuning
    # Map roughly -0.6 (more anomalous) → 0, -0.05 (typical inlier) → 1
    return float(np.clip((raw + 0.6) / 0.55, 0.0, 1.0))


def score_cohort(vector: np.ndarray, cohort_id: Optional[str]) -> Optional[float]:
    if not cohort_id or not _cohorts_ready or cohort_id not in _cohort_models:
        return None
    model = _cohort_models[cohort_id]
    scaler = _cohort_scalers[cohort_id]
    stats = _cohort_stats.get(cohort_id) or {}
    mean_ll = float(stats.get("mean_ll", 0.0))
    std_ll = float(stats.get("std_ll", 1.0))
    v = scaler.transform(vector.reshape(1, -1))
    ll = float(model.score_samples(v)[0])
    if std_ll < 1e-6:
        return 0.5
    z = (ll - mean_ll) / std_ll
    return _sigmoid(z)


# ── Individual model (enrollment) ────────────────────────────────────────────

def train_individual_model(
    vectors: list,
    session_count: int = 0,
) -> tuple[IsolationForest, StandardScaler]:
    X = np.array(vectors, dtype=np.float32)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    contamination = max(0.02, 0.10 - (session_count * 0.01))
    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_samples="auto",
        random_state=42,
    )
    model.fit(X_scaled)
    return model, scaler


def score_individual(
    model: IsolationForest,
    scaler: StandardScaler,
    vector: np.ndarray,
) -> float:
    scaled = scaler.transform(vector.reshape(1, -1))
    raw = float(model.score_samples(scaled)[0])
    return float(np.clip((raw + 0.7) / 0.6, 0.0, 1.0))


# ── 3-tier fusion (matches BehaviorGuard_ML_Training notebook) ───────────────

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
    s_pop: float,
    s_coh: Optional[float],
    s_ind: Optional[float],
    trust_day: int,
    context_mult: float = 1.0,
) -> float:
    """
    Combine population, cohort GMM, and individual Isolation Forest → 0–100.
    s_ind None → redistribute individual weight to pop+cohort (cold start).
    s_coh None → cohort term uses s_pop.
    """
    wp, wc, wi = get_three_tier_weights(trust_day)

    if s_ind is None:
        total = wp + wc
        if total > 0:
            wp, wc = wp / total, wc / total
        wi = 0.0
        s_ind_val = 0.0
    else:
        s_ind_val = s_ind

    if s_coh is None:
        s_coh_use = s_pop
    else:
        s_coh_use = s_coh

    raw = wp * s_pop + wc * s_coh_use + wi * s_ind_val
    adjusted = raw / max(context_mult, 1e-9)
    return float(np.clip(adjusted * 100, 0.0, 100.0))


# Legacy 2-way schedule (unused; kept for reference / tests)
def get_weights(weight_day: int) -> tuple[float, float]:
    schedule = {
        0: (1.00, 0.00),
        1: (0.70, 0.30),
        2: (0.50, 0.50),
        3: (0.35, 0.65),
        4: (0.25, 0.75),
        5: (0.20, 0.80),
        6: (0.15, 0.85),
    }
    return schedule.get(min(weight_day, 6), (0.15, 0.85))


def context_risk_multiplier(
    action: str,
    amount: float = 0,
    is_new_beneficiary: bool = False,
    hour: int = 12,
) -> float:
    mult = 1.0
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


def apply_ema(current_score: float, new_score: float, alpha: float = 0.3) -> float:
    return alpha * new_score + (1 - alpha) * current_score


def trust_day_for_total_active(
    total_lifetime_active_windows: int,
    enrolling: bool,
) -> int:
    """
    trust_day drives WEIGHT_SCHEDULE. Day 1 = no individual (enrollment).
    total_lifetime_active_windows = prior sessions (DB) + this session's active windows.
    """
    if enrolling:
        return 1
    t = total_lifetime_active_windows
    if t < 5:
        return 2
    if t < 15:
        return 4
    if t < 30:
        return 6
    return 7
