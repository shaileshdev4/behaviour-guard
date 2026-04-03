import numpy as np
import joblib
import os
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Optional


# ── Population model (pre-trained, loads once at startup) ─────────────────────

_population_model: Optional[IsolationForest] = None
_population_scaler: Optional[StandardScaler] = None


def load_population_model():
    """
    Load pre-trained population model from disk.
    If it doesn't exist yet, train a basic one on synthetic data.
    """
    global _population_model, _population_scaler

    model_path  = "models/population_model.pkl"
    scaler_path = "models/population_scaler.pkl"

    if os.path.exists(model_path) and os.path.exists(scaler_path):
        _population_model  = joblib.load(model_path)
        _population_scaler = joblib.load(scaler_path)
        print("[scorer] Population model loaded from disk.")
    else:
        print("[scorer] No population model found. Training on synthetic data...")
        _train_synthetic_population()


def _train_synthetic_population():
    """
    Train a population model on synthetic 'normal human typing' data.
    In production this would use the CMU dataset.
    Synthetic data covers realistic ranges for each feature.
    """
    global _population_model, _population_scaler

    np.random.seed(42)
    n = 2000  # synthetic samples

    # Generate realistic feature distributions
    # [mean_DT, std_DT, mean_FT, std_FT, mean_DL, std_DL,
    #  entropy, error_rate, mean_mouse_vel, std_mouse_vel,
    #  mean_PDT, std_PDT, nav_sim, keystroke_count, mouse_count,
    #  elapsed_min, dwell_digraph_ratio, digraph_cv]

    data = np.column_stack([
        np.random.normal(80,  15,  n),   #  0 mean_DT        80ms avg
        np.random.normal(12,   4,  n),   #  1 std_DT
        np.random.normal(75,  20,  n),   #  2 mean_FT        75ms avg
        np.random.normal(15,   5,  n),   #  3 std_FT
        np.random.normal(150, 30,  n),   #  4 mean_DL       150ms avg
        np.random.normal(20,   8,  n),   #  5 std_DL
        np.random.normal(2.5,  0.5, n),  #  6 entropy
        np.random.normal(0.04, 0.02, n), #  7 error_rate
        np.random.normal(0.8,  0.3, n),  #  8 mean_mouse_vel
        np.random.normal(0.2,  0.1, n),  #  9 std_mouse_vel
        np.random.normal(15,   8,  n),   # 10 mean_PDT (sec)
        np.random.normal(5,    3,  n),   # 11 std_PDT
        np.random.normal(0.85, 0.1, n),  # 12 nav_similarity
        np.random.normal(40,  15,  n),   # 13 keystroke_count
        np.random.normal(20,  10,  n),   # 14 mouse_count
        np.random.normal(5,    3,  n),   # 15 elapsed_min
        np.random.normal(0.5,  0.1, n),  # 16 dwell_digraph_ratio
        np.random.normal(0.15, 0.05, n), # 17 digraph_cv
    ])

    # Clip to realistic ranges — no negative times
    data = np.clip(data, 0, None)

    scaler = StandardScaler()
    data_scaled = scaler.fit_transform(data)

    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42
    )
    model.fit(data_scaled)

    os.makedirs("models", exist_ok=True)
    joblib.dump(model,  "models/population_model.pkl")
    joblib.dump(scaler, "models/population_scaler.pkl")

    _population_model  = model
    _population_scaler = scaler
    print("[scorer] Synthetic population model trained and saved.")


def score_population(vector: np.ndarray) -> float:
    """
    Score vector against population model.
    Returns 0.0 (very anomalous) to 1.0 (normal human behavior).
    """
    if _population_model is None or _population_scaler is None:
        return 0.8  # fallback if model not loaded

    scaled = _population_scaler.transform(vector.reshape(1, -1))
    raw    = _population_model.score_samples(scaled)[0]

    # IsolationForest score_samples: more negative = more anomalous
    # Typical range: -0.7 (anomaly) to -0.1 (normal)
    # Map to 0.0 → 1.0
    normalized = float(np.clip((raw + 0.7) / 0.6, 0.0, 1.0))
    return normalized


# ── Individual model (trained per user during enrollment) ─────────────────────

def train_individual_model(
    vectors: list,
    session_count: int = 0
) -> tuple[IsolationForest, StandardScaler]:
    """
    Train an Isolation Forest on this user's own behavioral data.
    Called once enrollment phase completes (8+ windows collected).

    contamination decreases as we get more sessions — we become
    more confident in what "normal" looks like for this user.
    """
    X = np.array(vectors, dtype=np.float32)

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    contamination = max(0.02, 0.10 - (session_count * 0.01))

    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_samples='auto',
        random_state=42
    )
    model.fit(X_scaled)

    return model, scaler


def score_individual(
    model:  IsolationForest,
    scaler: StandardScaler,
    vector: np.ndarray
) -> float:
    """
    Score vector against the user's personal model.
    Returns 0.0 (anomalous) to 1.0 (matches user's baseline).
    """
    scaled = scaler.transform(vector.reshape(1, -1))
    raw    = model.score_samples(scaled)[0]
    return float(np.clip((raw + 0.7) / 0.6, 0.0, 1.0))


# ── Score fusion ───────────────────────────────────────────────────────────────

def get_weights(weight_day: int) -> tuple[float, float]:
    """
    Returns (w_population, w_individual).
    w_individual grows as we accumulate more sessions.
    Day 0-1: trust population only.
    Day 7+:  trust individual mostly.
    """
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


def context_risk_multiplier(action: str, amount: float = 0,
                             is_new_beneficiary: bool = False,
                             hour: int = 12) -> float:
    """
    Increases required confidence for high-risk actions.
    multiplier > 1.0 means the score is divided — needs higher base score
    to maintain the same final score.
    """
    mult = 1.0

    if action == "transfer":
        if amount > 50_000:
            mult *= 1.5
        if amount > 200_000:
            mult *= 1.3          # stacks with above
        if is_new_beneficiary:
            mult *= 1.6

    if not (8 <= hour <= 22):    # unusual hour
        mult *= 1.2

    return mult


def fuse_scores(
    s_pop:      float,
    s_ind:      float,
    weight_day: int,
    context_mult: float = 1.0
) -> float:
    """
    Combine population and individual scores into final 0-100 score.
    Applies EMA smoothing externally (in session_manager flow).
    """
    w_pop, w_ind = get_weights(weight_day)
    raw = (w_pop * s_pop) + (w_ind * s_ind)

    # Context multiplier reduces effective score for risky actions
    adjusted = raw / context_mult

    return float(np.clip(adjusted * 100, 0.0, 100.0))


def apply_ema(current_score: float, new_score: float, alpha: float = 0.3) -> float:
    """
    Exponential Moving Average smoothing.
    alpha=0.3: new window has 30% weight, history has 70%.
    Prevents single noisy window from tanking the score.
    """
    return alpha * new_score + (1 - alpha) * current_score