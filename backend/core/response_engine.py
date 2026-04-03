import numpy as np
from core.session_manager import Session, State, Phase
from core.scorer import (
    score_population, score_individual,
    train_individual_model, fuse_scores, apply_ema,
    context_risk_multiplier
)
from core.feature_extractor import compute_feature_vector
from datetime import datetime


# ── Thresholds ─────────────────────────────────────────────────────────────────

GREEN_MIN  = 55   # score >= 55 → green  (lowered from 65 to match our model range)
YELLOW_MIN = 28   # score >= 28 → yellow (lowered from 35)
# score < 28 → red


# ── State machine ──────────────────────────────────────────────────────────────

def determine_state(score: float, session: Session) -> State:
    """
    Asymmetric state transitions:
    - Going DOWN (worse): fast — 1-2 windows
    - Going UP (better): slow — 3-4 consecutive windows required

    This prevents a fraudster from 'warming up' the score
    and then acting once they reach GREEN.
    """
    history = session.state_history

    if score >= GREEN_MIN:
        candidate = State.GREEN
    elif score >= YELLOW_MIN:
        candidate = State.YELLOW
    else:
        candidate = State.RED

    current = session.state

    # ── Going DOWN: fast ──
    if _is_worse(candidate, current):
        if candidate == State.RED:
            return State.RED          # immediate
        if candidate == State.YELLOW:
            # Need 1 prior non-green window
            recent = history[-2:] if len(history) >= 2 else history
            if any(s != State.GREEN for s in recent):
                return State.YELLOW
            return State.GREEN        # first slip → stay green

    # ── Going UP: slow ──
    if _is_better(candidate, current):
        required = {
            (State.RED,    State.YELLOW): 3,
            (State.YELLOW, State.GREEN):  4,
            (State.RED,    State.GREEN):  5,
        }.get((current, candidate), 99)

        recent = history[-required:] if len(history) >= required else []
        if len(recent) == required and all(s == candidate for s in recent):
            return candidate
        return current               # not recovered yet

    return current                   # no change


def _is_worse(candidate: State, current: State) -> bool:
    order = {State.GREEN: 2, State.YELLOW: 1, State.RED: 0}
    return order[candidate] < order[current]


def _is_better(candidate: State, current: State) -> bool:
    order = {State.GREEN: 2, State.YELLOW: 1, State.RED: 0}
    return order[candidate] > order[current]


# ── Explainability ─────────────────────────────────────────────────────────────

FEATURE_NAMES = [
    "mean_DT", "std_DT", "mean_FT", "std_FT",
    "mean_DL", "std_DL", "entropy", "error_rate",
    "mean_mouse_vel", "std_mouse_vel",
    "mean_PDT", "std_PDT", "nav_similarity",
    "keystroke_count", "mouse_count", "elapsed_min",
    "dwell_digraph_ratio", "digraph_cv"
]

READABLE = {
    "mean_DT":           "typing speed (key hold time)",
    "mean_DL":           "typing rhythm (key transition speed)",
    "entropy":           "typing consistency",
    "error_rate":        "typing error rate",
    "mean_mouse_vel":    "mouse movement speed",
    "nav_similarity":    "navigation pattern",
    "mean_PDT":          "reading pace (time per page)",
    "mean_FT":           "gap between keystrokes",
    "dwell_digraph_ratio":"typing pressure pattern",
}


def explain_anomaly(
    current_vector: np.ndarray,
    baseline_means: np.ndarray
) -> dict:
    """
    Find top 2 features that deviated most from the user's baseline.
    Return human-readable explanation.
    """
    if baseline_means is None:
        return {"messages": [], "advice": "Verifying your identity."}

    deviations = []
    for i, name in enumerate(FEATURE_NAMES):
        base = baseline_means[i]
        curr = current_vector[i]
        if base == 0 or name in ("keystroke_count", "mouse_count", "elapsed_min"):
            continue
        pct = abs(curr - base) / (base + 1e-6) * 100
        direction = "faster" if curr < base else "slower"
        # For features where higher = more suspicious, flip direction label
        if name in ("entropy", "error_rate", "std_DT", "std_DL"):
            direction = "higher" if curr > base else "lower"
        deviations.append((name, pct, direction))

    deviations.sort(key=lambda x: x[1], reverse=True)
    top2 = deviations[:2]

    messages = []
    for name, pct, direction in top2:
        readable = READABLE.get(name, name)
        messages.append(
            f"Your {readable} is {pct:.0f}% {direction} than usual"
        )

    return {
        "messages": messages,
        "advice": (
            "This can happen on a new device or keyboard. "
            "Please verify it's you."
        )
    }


# ── Action map ─────────────────────────────────────────────────────────────────

def get_action(state: State) -> dict:
    return {
        State.GREEN: {
            "action":    "none",
            "restrict":  [],
            "ui":        None,
        },
        State.YELLOW: {
            "action":    "soft_alert",
            "restrict":  ["transfer_above_50k"],
            "ui":        {
                "type":        "banner",
                "message":     "Verifying session security...",
                "dismissible": True,
            },
        },
        State.RED: {
            "action":    "step_up_auth",
            "restrict":  ["all_transfers", "beneficiary_add", "profile_change"],
            "ui":        {
                "type":        "modal",
                "message":     "Security check required",
                "dismissible": False,
            },
        },
    }[state]


# ── Main processing function ───────────────────────────────────────────────────

def process_window(
    session:      Session,
    keystrokes:   list,
    mouse_events: list,
    nav_events:   list,
    context:      dict = None,
) -> dict:
    """
    Called every 10 seconds with a new batch of behavioral events.
    1. Extract feature vector
    2. Enrollment or scoring
    3. State transition
    4. Return response
    """
    if context is None:
        context = {}

    session.window_count += 1

    # ── Extract features ──
    vector = compute_feature_vector(
        keystrokes=keystrokes,
        mouse_events=mouse_events,
        nav_events=nav_events,
        historical_nav=session.nav_history,
        session_elapsed_min=session.elapsed_minutes()
    )

    # Not enough data in this window — hold previous score
    if vector is None:
        return _build_response(session, explanation=None)

    # Update nav history
    for e in nav_events:
        session.nav_history.append(e.get("to", ""))
    session.nav_history = session.nav_history[-20:]

    # ── Enrollment phase ──
    if session.phase == Phase.ENROLLING:
        session.enrollment_vectors.append(vector.tolist())

        if len(session.enrollment_vectors) >= session.enrollment_target:
            # Train individual model
            session.model, session.scaler = train_individual_model(
                session.enrollment_vectors, session_count=0
            )
            # Store baseline means for explainability
            session.baseline_means = np.mean(
                session.enrollment_vectors, axis=0
            )
            session.phase = Phase.ACTIVE
            print(f"[engine] Session {session.session_id[:8]} -> ACTIVE")

        return _build_response(session, explanation=None)

    # ── Active scoring phase ──
    s_pop = score_population(vector)

    s_ind = score_individual(session.model, session.scaler, vector) \
            if session.model else s_pop

    # Context multiplier (risky actions need higher confidence)
    ctx_mult = context_risk_multiplier(
        action=context.get("action", "browse"),
        amount=context.get("amount", 0),
        is_new_beneficiary=context.get("is_new_beneficiary", False),
        hour=datetime.now().hour
    )

    raw_score = fuse_scores(s_pop, s_ind, weight_day=1, context_mult=ctx_mult)

    # EMA smoothing
    session.current_score = apply_ema(session.current_score, raw_score, alpha=0.3)
    session.add_score(session.current_score)

    # State transition
    new_state  = determine_state(session.current_score, session)
    session.state = new_state
    session.add_state(new_state)

    # Explanation only on RED
    explanation = None
    if new_state == State.RED and session.baseline_means is not None:
        explanation = explain_anomaly(vector, session.baseline_means)

    return _build_response(session, explanation)


def _build_response(session: Session, explanation) -> dict:
    action_data = get_action(session.state)
    return {
        "session_id":          session.session_id,
        "score":               round(session.current_score, 1),
        "state":               session.state.value,
        "phase":               session.phase.value,
        "enrollment_progress": session.enrollment_progress(),
        "window_count":        session.window_count,
        "action":              action_data["action"],
        "restrict":            action_data["restrict"],
        "ui":                  action_data["ui"],
        "explanation":         explanation,
        "tier_scores": {
            "population": round(
                score_population(
                    np.array(session.enrollment_vectors[-1]
                             if session.enrollment_vectors else [0]*18,
                             dtype=np.float32)
                ), 3
            ) if session.enrollment_vectors else None,
        }
    }