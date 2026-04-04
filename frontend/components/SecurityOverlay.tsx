'use client'
import { useState } from 'react'
import { useSessionStore } from '@/lib/store'
import { sendFeedback, type EventsExplanationDetail } from '@/lib/api'

/* ── Confidence badge ── */
function ConfidenceBadge({ level }: { level?: string }) {
  const cfg = {
    high:   { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C', label: 'High confidence' },
    medium: { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', label: 'Medium confidence' },
    low:    { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', label: 'Low confidence'    },
  }[level ?? 'medium'] ?? { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C', label: '' }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: 3, background: cfg.color }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {cfg.label}
      </span>
    </div>
  )
}

/* ── Signal deviation bar ── */
function DeviationBar({ detail }: { detail: EventsExplanationDetail }) {
  const pct       = parseFloat(detail.deviation)
  const isHigh    = pct > 100
  const barColor  = isHigh ? '#DC2626' : '#F59E0B'
  const barWidth  = Math.min(pct / 2, 100) // scale 200% → full bar

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: '#FEF9F9', border: '1px solid #FECACA',
    }}>
      {/* Signal name + deviation */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 6,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          {detail.signal}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: barColor,
        }}>
          {detail.direction === 'higher' ? '+' : '-'}{detail.deviation} from baseline
        </span>
      </div>

      {/* Bar */}
      <div style={{
        height: 4, borderRadius: 2,
        background: '#FEE2E2', overflow: 'hidden', marginBottom: 6,
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${barWidth}%`,
          background: barColor,
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* Baseline vs current */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <p style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your normal
          </p>
          <p style={{
            fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--font-mono)', color: 'var(--green)',
          }}>
            {detail.baseline}
          </p>
        </div>
        <div style={{ width: 1, background: '#FECACA' }} />
        <div>
          <p style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Right now
          </p>
          <p style={{
            fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--font-mono)', color: barColor,
          }}>
            {detail.current}
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <p style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Signal
          </p>
          <p style={{
            fontSize: 10, fontWeight: 700,
            fontFamily: 'var(--font-mono)', color: 'var(--text3)',
          }}>
            {detail.technical}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SecurityOverlay() {
  const { showOverlay, explanation, sessionId, setOverlay, updateScore } = useSessionStore()
  const [otp,         setOtp]         = useState('')
  const [loading,     setLoading]     = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!showOverlay) return null

  const exp = explanation

  const handleVerify = async () => {
    if (!sessionId || loading) return
    setLoading(true)
    try {
      await sendFeedback(sessionId, true)
      updateScore({ score: 70, state: 'green' })
      setOverlay(false)
      setOtp('')
    } catch (e) {
      console.error('[Imprint] Feedback failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleNotMe = async () => {
    if (!sessionId) return
    try {
      await sendFeedback(sessionId, false)
    } catch {
      /* still close overlay */
    }
    setOverlay(false)
    alert('Account secured. Please contact BharatBank support at 1800-258-3838 immediately.')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(12,26,58,0.65)',
      backdropFilter: 'blur(8px)',
      padding: '16px',
      overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 32px 64px rgba(12,26,58,0.22)',
        margin: 'auto',
      }}>

        {/* Red accent bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #B91C1C, #EF4444, #F87171)' }} />

        <div style={{ padding: '24px 24px 20px' }}>

          {/* Header */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: '#FEF2F2', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              ⚠
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <h2 style={{
                  fontSize: 16, fontWeight: 800,
                  color: 'var(--text)', letterSpacing: '-0.02em',
                }}>
                  We don&apos;t recognise this typing pattern
                </h2>
                <ConfidenceBadge level={exp?.confidence} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                {exp?.confidence_msg ?? 'Imprint detected unusual behavioral patterns in this session.'}
              </p>
            </div>
          </div>

          {/* What happened — plain English */}
          {exp?.messages && exp.messages.length > 0 && (
            <div style={{
              padding: '14px 16px', borderRadius: 12, marginBottom: 14,
              background: '#FFFBEB', border: '1px solid #FDE68A',
            }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: '#92400E',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10,
              }}>
                What Imprint noticed
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {exp.messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                      background: '#FEF3C7', border: '1px solid #FDE68A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: '#92400E',
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.55, marginTop: 1 }}>
                      {msg}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expandable technical details — for judges */}
          {exp?.details && exp.details.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 0', marginBottom: showDetails ? 10 : 0,
                }}
              >
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}>
                  {showDetails ? 'Hide' : 'Show'} signal breakdown
                </span>
                <span style={{
                  fontSize: 10, color: 'var(--accent)',
                  transform: showDetails ? 'rotate(180deg)' : 'none',
                  display: 'inline-block', transition: 'transform 0.2s',
                }}>
                  ▾
                </span>
                <span style={{
                  fontSize: 10, color: 'var(--text3)', marginLeft: 4,
                }}>
                  ({exp.details.length} signal{exp.details.length > 1 ? 's' : ''} flagged)
                </span>
              </button>

              {showDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {exp.details.map((d, i) => (
                    <DeviationBar key={i} detail={d} />
                  ))}

                  {/* What normal looks like */}
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--text)' }}>How this works:</strong>{' '}
                      Imprint built your behavioral fingerprint from your first 90 seconds
                      of typing. Each number above is a biometric signal — the baseline is
                      your normal, the current is what&apos;s happening right now.
                      Deviations above 30% trigger elevated monitoring. Above 75% trigger this alert.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Advice */}
          <div style={{
            padding: '11px 14px', borderRadius: 10, marginBottom: 18,
            background: '#F0FDF4', border: '1px solid #BBF7D0',
          }}>
            <p style={{ fontSize: 12, color: '#065F46', lineHeight: 1.6 }}>
              <strong>Common reasons:</strong> new keyboard, typing on your phone instead of laptop,
              background noise distracting you, or someone else using your device.
              {' '}
              {exp?.advice ?? 'If this is you, enter the OTP and continue.'}
            </p>
          </div>

          {/* OTP */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: 'var(--text2)', textTransform: 'uppercase',
              letterSpacing: '0.07em', marginBottom: 8,
            }}>
              One-Time Password — sent to your registered mobile
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="• • • • • •"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px',
                borderRadius: 10, fontSize: 22, fontWeight: 700,
                fontFamily: 'var(--font-mono)', letterSpacing: '0.3em',
                textAlign: 'center', color: 'var(--text)',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
              For this demo, any 6 digits will work
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || otp.length < 6}
              style={{
                width: '100%', padding: '14px',
                background: loading || otp.length < 6 ? '#93C5FD' : 'var(--primary)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700,
                cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer',
                boxShadow: otp.length >= 6 && !loading
                  ? '0 4px 14px rgba(30,58,138,0.25)' : 'none',
                letterSpacing: '-0.01em',
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Verifying...' : 'Verify — This was me'}
            </button>

            <button
              type="button"
              onClick={handleNotMe}
              style={{
                width: '100%', padding: '12px',
                background: 'transparent',
                border: '1.5px solid #FECACA',
                color: '#B91C1C', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              This was NOT me — Lock my account
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          background: 'var(--surface2)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              background: 'linear-gradient(135deg, #1B2059, #4361EE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.9)' }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12, fontWeight: 700, color: 'var(--text2)',
            }}>
              Imprint Auth
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>
            Behavioral biometrics · DPDPA 2023 compliant
          </p>
        </div>
      </div>
    </div>
  )
}
