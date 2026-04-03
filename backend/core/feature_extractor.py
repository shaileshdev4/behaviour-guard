import numpy as np
from typing import Optional

# ── Keystroke helpers ──────────────────────────────────────────────────────────

def extract_dwell_times(keystrokes: list) -> list:
    """
    Dwell time = how long a key is held down.
    keyup.timestamp - keydown.timestamp per key.
    """
    downs = {}
    dwells = []

    for e in keystrokes:
        key = e.get("key", "")
        ts  = e.get("timestamp", 0)

        if e["type"] == "keydown":
            downs[key] = ts
        elif e["type"] == "keyup" and key in downs:
            dt = ts - downs.pop(key)
            if 20 < dt < 500:          # realistic range only
                dwells.append(dt)

    return dwells


def extract_flight_times(keystrokes: list) -> list:
    """
    Flight time = gap between releasing one key and pressing the next.
    next_keydown.timestamp - prev_keyup.timestamp
    """
    last_keyup = None
    flights    = []

    for e in keystrokes:
        ts = e.get("timestamp", 0)

        if e["type"] == "keyup":
            last_keyup = ts
        elif e["type"] == "keydown" and last_keyup is not None:
            ft = ts - last_keyup
            if 0 < ft < 800:           # ignore if user paused
                flights.append(ft)

    return flights


def extract_digraph_latencies(keystrokes: list) -> list:
    """
    Digraph latency = keydown(i+1) - keydown(i).
    Most stable and distinctive feature per CMU research.
    """
    keydowns = [e for e in keystrokes if e["type"] == "keydown"]
    dls      = []

    for i in range(len(keydowns) - 1):
        dl = keydowns[i + 1]["timestamp"] - keydowns[i]["timestamp"]
        if 20 < dl < 1000:
            dls.append(dl)

    return dls


def compute_entropy(values: list) -> float:
    """
    Shannon entropy of dwell time distribution.
    Low = robotic/bot. Moderate = natural human. High = erratic/fraudster.
    """
    if len(values) < 3:
        return 0.0

    hist, _ = np.histogram(values, bins=30, range=(0, 300))
    total   = hist.sum()
    if total == 0:
        return 0.0

    probs = hist / total
    probs = probs[probs > 0]
    return float(-np.sum(probs * np.log2(probs)))


def compute_error_rate(keystrokes: list) -> float:
    """
    Fraction of keystrokes that are Backspace.
    Each person has a characteristic error rate.
    """
    total     = len([e for e in keystrokes if e["type"] == "keydown"])
    backspace = len([e for e in keystrokes
                     if e["type"] == "keydown" and e.get("key") == "Backspace"])
    if total == 0:
        return 0.0
    return backspace / total


# ── Mouse helpers ──────────────────────────────────────────────────────────────

def extract_mouse_velocities(mouse_events: list) -> list:
    """
    Speed of cursor movement in pixels/ms.
    Computed between consecutive mousemove events.
    """
    velocities = []

    for i in range(len(mouse_events) - 1):
        p1 = mouse_events[i]
        p2 = mouse_events[i + 1]
        dt = p2["timestamp"] - p1["timestamp"]
        if dt <= 0:
            continue
        dx = p2["x"] - p1["x"]
        dy = p2["y"] - p1["y"]
        v  = np.sqrt(dx**2 + dy**2) / dt
        if v < 10:                     # ignore idle mouse
            velocities.append(float(v))

    return velocities


# ── Navigation helpers ─────────────────────────────────────────────────────────

def compute_nav_similarity(current_pages: list, historical_pages: list) -> float:
    """
    How similar is current navigation to the user's usual pattern?
    Uses Levenshtein distance, normalized to 0.0-1.0.
    1.0 = identical pattern. 0.0 = completely different.
    """
    if not historical_pages:
        return 1.0                     # no history → no penalty

    a, b = current_pages, historical_pages
    m, n = len(a), len(b)

    # Standard DP Levenshtein
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])

    max_len = max(m, n, 1)
    return 1.0 - (dp[m][n] / max_len)


# ── Master feature vector ──────────────────────────────────────────────────────

def compute_feature_vector(
    keystrokes:    list,
    mouse_events:  list,
    nav_events:    list,
    historical_nav: list,
    session_elapsed_min: float = 0.0
) -> Optional[np.ndarray]:
    """
    Combines all signals into one 18-dimensional feature vector.
    Returns None if there isn't enough data in this window.
    """
    dwells   = extract_dwell_times(keystrokes)
    flights  = extract_flight_times(keystrokes)
    digraphs = extract_digraph_latencies(keystrokes)
    vels     = extract_mouse_velocities(mouse_events)

    # Need at least 5 keystrokes for a meaningful window
    if len(dwells) < 5:
        return None

    current_pages  = [e.get("to", "") for e in nav_events]
    nav_similarity = compute_nav_similarity(current_pages, historical_nav)

    # Page dwell times from navigation events
    page_dwells = []
    for i in range(len(nav_events) - 1):
        dwell = nav_events[i + 1]["timestamp"] - nav_events[i]["timestamp"]
        if 0 < dwell < 300_000:        # max 5 minutes on one page
            page_dwells.append(dwell / 1000)  # convert to seconds

    def safe_mean(lst): return float(np.mean(lst)) if lst else 0.0
    def safe_std(lst):  return float(np.std(lst))  if lst else 0.0

    vector = np.array([
        safe_mean(dwells),             #  0 mean dwell time (ms)
        safe_std(dwells),              #  1 std dwell time
        safe_mean(flights),            #  2 mean flight time (ms)
        safe_std(flights),             #  3 std flight time
        safe_mean(digraphs),           #  4 mean digraph latency (ms) ← key feature
        safe_std(digraphs),            #  5 std digraph latency
        compute_entropy(dwells),       #  6 typing rhythm entropy (bits)
        compute_error_rate(keystrokes),#  7 error / backspace rate
        safe_mean(vels),               #  8 mean mouse velocity (px/ms)
        safe_std(vels),                #  9 std mouse velocity
        safe_mean(page_dwells),        # 10 mean page dwell (seconds)
        safe_std(page_dwells),         # 11 std page dwell
        nav_similarity,                # 12 nav sequence similarity (0-1)
        float(len(dwells)),            # 13 keystroke count this window
        float(len(vels)),              # 14 mouse event count
        session_elapsed_min,           # 15 how long session has been running
        safe_mean(dwells) / max(safe_mean(digraphs), 1),  # 16 dwell/digraph ratio
        safe_std(digraphs) / max(safe_mean(digraphs), 1), # 17 digraph coefficient of variation
    ], dtype=np.float32)

    return vector