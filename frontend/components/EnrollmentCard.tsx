'use client'
import { useSessionStore } from '@/lib/store'

const STEPS = [
  { label: 'Capturing keystroke timing',   threshold: 15 },
  { label: 'Measuring typing rhythm',      threshold: 35 },
  { label: 'Recording navigation habits',  threshold: 55 },
  { label: 'Analyzing mouse dynamics',     threshold: 75 },
  { label: 'Building behavioral model',    threshold: 95 },
]

export default function EnrollmentCard() {
  const { phase, enrollmentProgress } = useSessionStore()
  if (phase !== 'enrolling') return null

  const seconds    = Math.round((100 - enrollmentProgress) * 0.4)
  const doneCount  = STEPS.filter((s) => enrollmentProgress >= s.threshold).length

  return (
    <div style={{
      borderRadius: 'var(--r-xl)', overflow: 'hidden',
      background: 'var(--surface)',
      border: '1px solid var(--border2)',
      boxShadow: '0 4px 20px rgba(67,97,238,0.10)',
    }}>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${enrollmentProgress}%`,
          background: 'linear-gradient(90deg, var(--primary), var(--accent), var(--cyan))',
          transition: 'width 0.6s ease',
        }} />
      </div>

      <div style={{ padding: '22px 26px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 'var(--r)',
              background: 'var(--primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 11, height: 11, borderRadius: 6, background: 'var(--accent)', animation: 'pulse-dot 1.5s infinite' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                Building your behavioral fingerprint
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>
                Type normally — this happens automatically
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{
              fontSize: 30, fontWeight: 800, lineHeight: 1,
              fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em',
              color: 'var(--accent)',
            }}>
              {enrollmentProgress}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text3)' }}>%</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>~{seconds}s remaining</p>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {STEPS.map((step, i) => {
            const done    = enrollmentProgress >= step.threshold
            const current = i === doneCount && !done
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 'var(--r)',
                background: done ? 'var(--green-bg)' : 'var(--surface2)',
                border: `1px solid ${done ? 'var(--green-border)' : 'var(--border)'}`,
                transition: 'all var(--t-slow)',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                  background: done ? 'var(--green)' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background var(--t-slow)',
                }}>
                  {done
                    ? <span style={{ fontSize: 10, color: '#fff', fontWeight: 800 }}>✓</span>
                    : <div style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--text3)' }} />
                  }
                </div>
                <span style={{
                  fontSize: 12, fontWeight: done ? 600 : 500,
                  color: done ? 'var(--green)' : 'var(--text2)',
                  transition: 'color var(--t-slow)',
                }}>
                  {step.label}
                </span>
                {current && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 10,
                    color: 'var(--accent)', fontWeight: 600,
                    animation: 'pulse-dot 1.5s infinite',
                  }}>
                    In progress…
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <p style={{ marginTop: 14, fontSize: 11, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6 }}>
          Trinetra learns how you type — not what you type.
          No keystrokes stored. Only timing patterns.
        </p>
      </div>
    </div>
  )
}