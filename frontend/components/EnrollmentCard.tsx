'use client'
import { useSessionStore } from '@/lib/store'

export default function EnrollmentCard() {
  const { phase, enrollmentProgress } = useSessionStore()
  if (phase !== 'enrolling') return null

  const steps = [
    { label: 'Capturing keystroke timing', done: enrollmentProgress >= 15 },
    { label: 'Measuring typing rhythm',    done: enrollmentProgress >= 35 },
    { label: 'Recording navigation habits', done: enrollmentProgress >= 55 },
    { label: 'Analyzing mouse dynamics',   done: enrollmentProgress >= 75 },
    { label: 'Building behavioral model',  done: enrollmentProgress >= 95 },
  ]

  const seconds = Math.round((100 - enrollmentProgress) * 0.4)

  return (
    <div style={{
      borderRadius: 16,
      overflow: 'hidden',
      background: '#fff',
      border: '1px solid #C7D2FE',
      boxShadow: '0 4px 20px rgba(67,97,238,0.1)',
    }}>
      {/* Top progress bar */}
      <div style={{ height: 4, background: '#EEF2FF', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${enrollmentProgress}%`,
          background: 'linear-gradient(90deg, #1B2059, #4361EE, #06B6D4)',
          transition: 'width 0.6s ease',
          boxShadow: '2px 0 8px rgba(67,97,238,0.4)',
        }} />
      </div>

      <div style={{ padding: '24px 28px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #EEF2FF, #C7D2FE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: 6,
                background: '#4361EE',
                animation: 'pulse-dot 1.5s infinite',
              }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.01em' }}>
                Building your behavioral fingerprint
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>
                Type normally — this happens automatically
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{
              fontSize: 32, fontWeight: 800, lineHeight: 1,
              fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em',
              color: 'var(--accent)',
            }}>
              {enrollmentProgress}
              <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text3)' }}>%</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
              ~{seconds}s remaining
            </p>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: step.done ? '#ECFDF5' : 'var(--surface2)',
              border: `1px solid ${step.done ? '#A7F3D0' : 'var(--border)'}`,
              transition: 'all 0.4s ease',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                background: step.done ? '#047857' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s',
              }}>
                {step.done ? (
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 800 }}>✓</span>
                ) : (
                  <div style={{
                    width: 6, height: 6, borderRadius: 3,
                    background: '#94A3B8',
                  }} />
                )}
              </div>
              <span style={{
                fontSize: 12, fontWeight: step.done ? 600 : 500,
                color: step.done ? '#047857' : 'var(--text2)',
                transition: 'color 0.3s',
              }}>
                {step.label}
              </span>
              {!step.done && i === steps.filter(s => s.done).length && (
                <span style={{
                  marginLeft: 'auto', fontSize: 10,
                  color: '#4361EE', fontWeight: 600,
                  animation: 'pulse-dot 1.5s infinite',
                }}>
                  In progress...
                </span>
              )}
            </div>
          ))}
        </div>

        <p style={{
          marginTop: 16, fontSize: 11, color: 'var(--text3)',
          textAlign: 'center', lineHeight: 1.6,
        }}>
          Imprint is learning how you type — not what you type.
          No keystrokes are stored. Only timing patterns.
        </p>
      </div>
    </div>
  )
}