'use client'
import { useSessionStore } from '@/lib/store'

export default function FeatureDeviationChart() {
  const { signals, state } = useSessionStore()

  const signalsWithBoth = signals.filter(s => s.value !== null && s.baseline !== null)
  if (signalsWithBoth.length === 0) return null

  const getDeviation = (s: typeof signals[0]) => {
    if (s.value === null || s.baseline === null || s.baseline === 0) return 0
    return ((s.value - s.baseline) / s.baseline) * 100
  }

  const maxDev = Math.max(...signalsWithBoth.map(s => Math.abs(getDeviation(s))), 20)

  const stateColors = {
    green:  { accent: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
    yellow: { accent: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    red:    { accent: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  }[state] ?? { accent: '#4361EE', bg: '#EEF2FF', border: '#C7D2FE' }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
    }}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          Feature Deviation from Baseline
        </span>
        <div style={{
          padding: '3px 10px', borderRadius: 10,
          background: stateColors.bg, border: `1px solid ${stateColors.border}`,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: stateColors.accent,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {state.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Zero line label */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginBottom: 12,
        }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            -{Math.round(maxDev)}%
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            Baseline
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            +{Math.round(maxDev)}%
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {signalsWithBoth.map((sig) => {
            const dev = getDeviation(sig)
            const devPct = (dev / maxDev) * 50  // max 50% from center
            const isPositive = dev >= 0
            const absDevPct = Math.abs(devPct)
            const isAnomaly = Math.abs(dev) > 30

            return (
              <div key={sig.key}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 5,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
                    {sig.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      color: 'var(--text3)',
                    }}>
                      {sig.baseline?.toFixed(0)}{sig.unit}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>→</span>
                    <span style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: isAnomaly ? stateColors.accent : 'var(--text)',
                    }}>
                      {sig.value?.toFixed(0)}{sig.unit}
                    </span>
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: isAnomaly ? stateColors.accent : 'var(--green)',
                    }}>
                      ({dev > 0 ? '+' : ''}{dev.toFixed(0)}%)
                    </span>
                  </div>
                </div>

                {/* Centered bar */}
                <div style={{ position: 'relative', height: 8 }}>
                  {/* Track */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'var(--surface2)',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                  }} />

                  {/* Center line */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: '50%', width: 1,
                    background: 'var(--border2)',
                  }} />

                  {/* Deviation bar */}
                  <div style={{
                    position: 'absolute', top: 1, bottom: 1,
                    borderRadius: 3,
                    left: isPositive ? '50%' : `${50 - absDevPct}%`,
                    width: `${absDevPct}%`,
                    background: isAnomaly
                      ? `linear-gradient(${isPositive ? '90deg' : '270deg'}, ${stateColors.accent}, ${stateColors.accent}88)`
                      : `linear-gradient(${isPositive ? '90deg' : '270deg'}, #047857, #04785788)`,
                    transition: 'all 0.5s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Threshold reference */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 16,
          padding: '8px 12px', borderRadius: 8,
          background: 'var(--surface2)', border: '1px solid var(--border)',
        }}>
          <div style={{ width: 20, height: 2, background: '#94A3B8', borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>
            Bars represent deviation from your enrolled baseline.
            Deviation above ±30% triggers elevated monitoring.
          </span>
        </div>
      </div>
    </div>
  )
}