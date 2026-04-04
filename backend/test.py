
import joblib, numpy as np, math
from pathlib import Path

pop_model  = joblib.load('models/population_model.pkl')
pop_scaler = joblib.load('models/population_scaler.pkl')

# CMU-like vector (what training data looks like)
cmu = np.array([108, 26, 92, 47, 201, 59, 2.8, 0, 0, 0, 0, 0, 1, 10, 0, 0, 0.54, 0.30])

# Mask browser features (what scorer.py now does)
masked = cmu.copy()
for idx, val in {7:0, 8:0, 9:0, 10:0, 11:0, 12:1.0, 14:0, 15:0}.items():
    masked[idx] = val

scaled = pop_scaler.transform(masked.reshape(1,-1))
raw    = pop_model.score_samples(scaled)[0]
print(f'CMU-like masked score: raw={raw:.4f}  sigmoid*0.05={1/(1+math.exp(-raw*0.05)):.4f}')

# Browser runtime vector
browser = cmu.copy()
browser[8]=0.8; browser[9]=0.3; browser[10]=15; browser[11]=8; browser[12]=0.85; browser[14]=25; browser[15]=2.5

# With masking — same as CMU
scaled2 = pop_scaler.transform(masked.reshape(1,-1))  # still using masked
raw2    = pop_model.score_samples(scaled2)[0]
print(f'Browser vector MASKED: raw={raw2:.4f}  sigmoid*0.05={1/(1+math.exp(-raw2*0.05)):.4f}')
print(f'Score difference after masking: {abs(raw-raw2):.4f}  (want: 0.0000)')
