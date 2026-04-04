import numpy as np
from core.session_manager import Session, State, Phase
from core.scorer import (
    assign_cohort_id,
    score_population,
    score_cohort,
    score_individual,
    train_individual_model,
    fuse_scores,
    apply_ema,
    context_risk_multiplier,
    trust_day_for_total_active,
)
from core.feature_extractor import compute_feature_vector
from datetime import datetime

from db.database import db_available
from db.profile_store import persist_bg_session_profile


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
    "mean_DT":             "how long you hold each key",
    "std_DT":              "consistency of your key hold timing",
    "mean_FT":             "gap between releasing one key and pressing the next",
    "std_FT":              "consistency of your inter-key gaps",
    "mean_DL":             "your natural typing rhythm",
    "std_DL":              "consistency of your typing rhythm",
    "entropy":             "randomness in your typing pattern",
    "error_rate":          "how often you use backspace",
    "mean_mouse_vel":      "how fast you move the mouse",
    "std_mouse_vel":       "consistency of your mouse speed",
    "nav_similarity":      "which pages you visit and in what order",
    "mean_PDT":            "how long you spend reading each page",
    "std_PDT":             "consistency of your time on each page",
    "dwell_digraph_ratio": "the pressure pattern of your typing",
    "digraph_cv":          "how evenly spaced your keystrokes are",
}

# Plain-English sentences for each feature deviation
# Each entry: (too_high_message, too_low_message)
_PLAIN_MESSAGES: dict[str, tuple[str, str]] = {
    "mean_DT": (
        "You're holding keys down much longer than usual — like typing through gloves or with unfamiliar hands.",
        "You're pressing keys much faster than you normally do — unusually quick taps.",
    ),
    "std_DT": (
        "Your key hold times are all over the place. You normally type very consistently.",
        "Your typing is unusually robotic — too perfectly consistent, unlike your normal pattern.",
    ),
    "mean_FT": (
        "There are long pauses between your keystrokes — much more hesitation than usual.",
        "You're typing with almost no gaps between keys — faster than you normally do.",
    ),
    "std_FT": (
        "The gaps between your keys vary wildly. You normally have a steady rhythm.",
        "Your inter-key timing is suspiciously uniform — unlike your natural style.",
    ),
    "mean_DL": (
        "Your overall typing rhythm is significantly slower than your baseline.",
        "Your typing rhythm is much faster than your enrolled profile.",
    ),
    "std_DL": (
        "Your keystroke timing is extremely irregular — very unlike your normal cadence.",
        "Your typing rhythm is unnaturally consistent — not how you usually type.",
    ),
    "entropy": (
        "Your typing pattern is much more erratic and unpredictable than usual.",
        "Your typing pattern is unusually mechanical and repetitive.",
    ),
    "error_rate": (
        "You're making far more typos and backspace corrections than you normally do.",
        "You haven't made a single correction — you normally make a few typos naturally.",
    ),
    "mean_mouse_vel": (
        "Your mouse is moving much faster than your usual comfortable speed.",
        "Your mouse is moving very slowly — unusually deliberate compared to your style.",
    ),
    "nav_similarity": (
        "You're navigating the app in an unusual order — not how you normally use it.",
        "You're navigating in an unusual order — not how you normally use it.",
    ),
    "mean_PDT": (
        "You're spending much more time on each page than you usually do.",
        "You're moving through pages very quickly — faster than your normal reading pace.",
    ),
    "dwell_digraph_ratio": (
        "The pressure pattern of your typing is different from your enrolled fingerprint.",
        "The pressure pattern of your typing is different from your enrolled fingerprint.",
    ),
    "std_mouse_vel": (
        "Your mouse speed varies a lot more than it usually does.",
        "Your mouse movement is unusually steady — different from your normal style.",
    ),
    "std_PDT": (
        "The time you spend on each page is much less consistent than usual.",
        "You're pacing through pages with unusual uniformity — unlike your normal browsing.",
    ),
    "digraph_cv": (
        "The spacing between your keystrokes is much more uneven than your enrolled pattern.",
        "The spacing between your keystrokes is unusually even compared to how you normally type.",
    ),
}


def _deviation_direction(_name: str, curr: float, base: float) -> str:
    return "higher" if curr > base else "lower"


def explain_anomaly(
    current_vector: np.ndarray,
    baseline_means: np.ndarray,
) -> dict:
    """
    Produce plain-English explanations a non-technical user can understand.
    Returns top 3 deviations with human-readable messages, a confidence
    statement, and actionable advice.
    """
    if baseline_means is None:
        return {
            "messages":   ["Your behavioral pattern couldn't be matched to your profile."],
            "details":    [],
            "confidence": "medium",
            "advice":     "If this is you, tap 'This was me' below and continue normally.",
        }

    deviations: list[tuple[str, float, float, float]] = []  # (name, pct, curr, base)

    for i, name in enumerate(FEATURE_NAMES):
        base = float(baseline_means[i])
        curr = float(current_vector[i])

        # Skip noisy / uninformative dimensions
        if name in ("keystroke_count", "mouse_count", "elapsed_min"):
            continue
        if base < 1e-6:
            continue

        pct = abs(curr - base) / (base + 1e-6) * 100
        deviations.append((name, pct, curr, base))

    deviations.sort(key=lambda x: x[1], reverse=True)
    top = deviations[:3]

    if not top:
        return {
            "messages":   ["Imprint couldn't compare this session to your saved profile in enough detail."],
            "details":    [],
            "confidence": "low",
            "confidence_msg": "Not enough comparable signals in this window.",
            "advice":     "If this is you, tap 'This was me' below and continue normally.",
        }

    messages: list[str] = []
    details: list[dict] = []

    for name, pct, curr, base in top:
        direction = _deviation_direction(name, curr, base)
        pair = _PLAIN_MESSAGES.get(name)

        if pair:
            plain = pair[0] if direction == "higher" else pair[1]
        else:
            readable = READABLE.get(name, name.replace("_", " "))
            plain = f"Your {readable} is {pct:.0f}% {direction} than usual."

        messages.append(plain)

        # Technical detail for the expandable section (judges love this)
        details.append({
            "signal":    READABLE.get(name, name),
            "technical": name,
            "current":   round(curr, 2),
            "baseline":  round(base, 2),
            "deviation": f"{pct:.0f}%",
            "direction": direction,
        })

    # Confidence label based on top deviation magnitude
    top_pct = top[0][1] if top else 0
    if top_pct > 150:
        confidence = "high"
        confidence_msg = "Imprint is highly confident this doesn't match your pattern."
    elif top_pct > 75:
        confidence = "medium"
        confidence_msg = "Imprint detected a significant behavioral shift."
    else:
        confidence = "low"
        confidence_msg = "Imprint noticed a mild deviation — could be fatigue or a new keyboard."

    return {
        "messages":        messages,
        "details":         details,
        "confidence":      confidence,
        "confidence_msg":  confidence_msg,
        "advice":          (
            "If this is you, tap 'This was me' and continue normally. "
            "Imprint will recalibrate. If not, secure your account immediately."
        ),
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
    Called each flush interval (~5s) with a new batch of behavioral events.
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

    # Assign cohort from mean dwell (feature 0) once
    if session.cohort_id is None:
        session.cohort_id = assign_cohort_id(float(vector[0]))

    s_pop = score_population(vector)
    s_coh = score_cohort(vector, session.cohort_id)

    # ── Enrollment phase ──
    if session.phase == Phase.ENROLLING:
        session.enrollment_vectors.append(vector.tolist())

        td = trust_day_for_total_active(0, enrolling=True)
        session.last_tier_scores = {
            "population": round(s_pop, 4),
            "cohort": None if s_coh is None else round(s_coh, 4),
            "individual": None,
            "trust_day": td,
            "cohort_id": session.cohort_id,
        }

        if len(session.enrollment_vectors) >= session.enrollment_target:
            # Train individual model
            session.model, session.scaler = train_individual_model(
                session.enrollment_vectors, session_count=0
            )
            # Store baseline means for explainability
            session.baseline_means = np.mean(
                np.array(session.enrollment_vectors, dtype=np.float32),
                axis=0,
            ).astype(np.float32)
            session.phase = Phase.ACTIVE
            print(f"[engine] Session {session.session_id[:8]} -> ACTIVE")
            if persist_bg_session_profile(session):
                print(f"[engine] Session {session.session_id[:8]} profile written to DB")

            fp = getattr(session, "device_fingerprint", "")
            if fp and db_available():
                try:
                    from db.database import SessionLocal as _SL
                    from db import crud as _crud

                    _db = _SL()
                    try:
                        _crud.register_device(_db, session.user_id, fp)
                        session.device_known = True
                        print(
                            f"[device] Enrollment device trusted for "
                            f"{session.user_id[:12]}… fp={fp[:8]}…"
                        )
                    finally:
                        _db.close()
                except Exception as _e:
                    print(f"[device] Failed to register enrollment device: {_e}")

        return _build_response(session, explanation=None)

    # ── Active scoring phase (3-tier fusion: SVM + GMM + Isolation Forest) ──
    session.active_scoring_windows += 1
    total_active = session.lifetime_windows_prior + session.active_scoring_windows
    trust_day = trust_day_for_total_active(total_active, enrolling=False)

    s_ind = (
        score_individual(session.model, session.scaler, vector)
        if session.model
        else None
    )

    ctx_mult = context_risk_multiplier(
        action=context.get("action", "browse"),
        amount=context.get("amount", 0),
        is_new_beneficiary=context.get("is_new_beneficiary", False),
        hour=datetime.now().hour,
        device_known=getattr(session, "device_known", True),
    )

    raw_score = fuse_scores(s_pop, s_coh, s_ind, trust_day, context_mult=ctx_mult)

    session.last_tier_scores = {
        "population": round(s_pop, 4),
        "cohort": None if s_coh is None else round(s_coh, 4),
        "individual": None if s_ind is None else round(s_ind, 4),
        "trust_day": trust_day,
        "cohort_id": session.cohort_id,
    }

    # EMA smoothing
    session.current_score = apply_ema(session.current_score, raw_score, alpha=0.3)
    session.add_score(session.current_score)

    # State transition
    new_state = determine_state(session.current_score, session)
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
        "cohort_id":           session.cohort_id,
        "action":              action_data["action"],
        "restrict":            action_data["restrict"],
        "ui":                  action_data["ui"],
        "explanation":         explanation,
        "tier_scores":         session.last_tier_scores,
    }