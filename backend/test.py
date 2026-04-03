
from core.scorer import load_all_models
from core.session_manager import create_session
from core.response_engine import process_window
import numpy as np

load_all_models()

# Local smoke test user id (no DB); not a login account.
session = create_session('00000000-0000-0000-0000-000000000001', 'desktop')

# Simulate 10 enrollment windows (normal user typing)
def make_keys(base_dwell=75, base_flight=70):
    keys = []
    t = 1000.0
    for i in range(20):
        keys.append({'type':'keydown','key':chr(65+i),'timestamp':t})
        t += base_dwell + np.random.normal(0,5)
        keys.append({'type':'keyup','key':chr(65+i),'timestamp':t})
        t += base_flight + np.random.normal(0,8)
    return keys

print('--- Enrollment phase ---')
for i in range(9):
    r = process_window(session, make_keys(), [], [])
    print(f"Window {i+1}: phase={r['phase']} progress={r['enrollment_progress']}%")

print()
print('--- Active phase (normal user) ---')
for i in range(4):
    r = process_window(session, make_keys(), [], [])
    print(f"Window {i+1}: score={r['score']} state={r['state']}")

print()
print('--- Fraudster takes over (very different timing) ---')
for i in range(6):
    r = process_window(session, make_keys(base_dwell=200, base_flight=300), [], [])
    print(f"Window {i+1}: score={r['score']} state={r['state']} action={r['action']}")
