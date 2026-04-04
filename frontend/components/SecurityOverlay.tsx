'use client'
import { useEffect, useState } from 'react'
import { useSessionStore } from '@/lib/store'
import { sendFeedback, type EventsExplanationDetail } from '@/lib/api'
import FaceStepUpCapture from '@/components/FaceStepUpCapture'
import AudioStepUpCapture from '@/components/AudioStepUpCapture'

type StepUpPhase = 'choose' | 'face' | 'voice'

function DeviationBar({ detail }: { detail: EventsExplanationDetail }) {
  const pct      = parseFloat(detail.deviation)
  const isHigh   = pct > 100
  const barColor = isHigh ? 'var(--red)' : 'var(--yellow)'
  const barWidth = Math.min(pct / 2, 100)

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 'var(--r)',
      background: 'var(--red-bg)', border: '1px solid var(--red-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{detail.signal}</span>
        <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)', color: barColor }}>
          {detail.direction === 'higher' ? '+' : '-'}{detail.deviation} from baseline
        </span>
      </div>

      <div style={{ height: 4, borderRadius: 2, background: 'var(--red-border)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', borderRadius: 2, width: `${barWidth}%`, background: barColor, transition: 'width 0.6s ease' }} />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <p style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your normal</p>
          <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{detail.baseline}</p>
        </div>
        <div style={{ width: 1, background: 'var(--red-border)' }} />
        <div>
          <p style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Right now</p>
          <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: barColor }}>{detail.current}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <p style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signal</p>
          <p style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{detail.technical}</p>
        </div>
      </div>
    </div>
  )
}

export default function SecurityOverlay() {
  const { showOverlay, explanation, sessionId, setOverlay, updateScore } = useSessionStore()
  const [loading, setLoading]       = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [stepUpPhase, setStepUpPhase] = useState<StepUpPhase>('choose')
  const [stepUpVerified, setStepUpVerified] = useState(false)
  const [stepUpHint, setStepUpHint]         = useState<string | null>(null)

  useEffect(() => {
    if (!showOverlay) {
      setStepUpPhase('choose')
      setStepUpVerified(false)
      setStepUpHint(null)
    }
  }, [showOverlay])

  if (!showOverlay) return null

  const exp = explanation

  const confidenceCfg = {
    high:   { label: 'High confidence'   },
    medium: { label: 'Medium confidence' },
    low:    { label: 'Low confidence'    },
  }[exp?.confidence ?? 'medium'] ?? { label: '' }

  const handleVerify = async () => {
    if (!sessionId || loading) return
    setLoading(true)
    try {
      await sendFeedback(sessionId, true)
      updateScore({ score: 70, state: 'green' })
      setOverlay(false)
    } catch (e) {
      console.error('[Trinetra] Feedback failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleNotMe = async () => {
    if (!sessionId) return
    try { await sendFeedback(sessionId, false) } catch { /* still close */ }
    setOverlay(false)
    alert('Account secured. Contact Trinetra support at 1800-258-3838 immediately.')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(12,26,58,0.65)',
      backdropFilter: 'blur(8px)',
      padding: 16, overflowY: 'auto',
    }}>
      <div className="card-lg" style={{ width: '100%', maxWidth: 480, margin: 'auto', overflow: 'hidden' }}>

        {/* Red top bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, var(--red), var(--red-dot))' }} />

        <div style={{ padding: '22px 22px 20px' }}>

          {/* Header */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 'var(--r-md)', flexShrink: 0,
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>⚠</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', fontFamily: 'var(--font-body)' }}>
                  We don&apos;t recognise this typing pattern
                </h2>
                <span className="badge badge-red">{confidenceCfg.label}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                {exp?.confidence_msg ?? 'Trinetra detected unusual behavioral patterns in this session.'}
              </p>
            </div>
          </div>

          {/* Plain-English messages */}
          {exp?.messages && exp.messages.length > 0 && (
            <div style={{
              padding: '13px 14px', borderRadius: 'var(--r-md)', marginBottom: 14,
              background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                What Trinetra noticed
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {exp.messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                      background: 'var(--yellow-border)', border: '1px solid var(--yellow-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: 'var(--yellow)',
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--yellow)', lineHeight: 1.55, marginTop: 1 }}>{msg}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expandable technical details */}
          {exp?.details && exp.details.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                  marginBottom: showDetails ? 10 : 0,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  {showDetails ? 'Hide' : 'Show'} signal breakdown
                </span>
                <span style={{ fontSize: 10, color: 'var(--accent)', transform: showDetails ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>
                  ▾
                </span>
                <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>
                  ({exp.details.length} signal{exp.details.length > 1 ? 's' : ''} flagged)
                </span>
              </button>

              {showDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {exp.details.map((d, i) => <DeviationBar key={i} detail={d} />)}
                  <div style={{
                    padding: '10px 12px', borderRadius: 'var(--r)',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--text)' }}>How this works:</strong>{' '}
                      Trinetra built your profile from your first 90 seconds of typing.
                      Each number is a biometric signal — baseline is your normal,
                      current is right now. Deviations above 75% trigger this alert.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Advice */}
          <div style={{
            padding: '11px 14px', borderRadius: 'var(--r)', marginBottom: 16,
            background: 'var(--green-bg)', border: '1px solid var(--green-border)',
          }}>
            <p style={{ fontSize: 12, color: 'var(--green)', lineHeight: 1.6 }}>
              <strong>Common reasons:</strong> new keyboard, typing on your phone, background noise,
              or someone else using your device.{' '}
              {exp?.advice ?? 'If this is you, complete face or voice verification to continue.'}
            </p>
          </div>

          {/*
            OTP — commented out while integrating face & voice step-up.
            const [otp, setOtp] = useState('')
            …and in handleVerify after setOverlay(false): setOtp('')
          <div style={{ marginBottom: 14 }}>
            <label className="input-label">
              One-Time Password — sent to your registered mobile
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="• • • • • •"
              autoFocus
              style={{
                width: '100%', padding: '13px 16px',
                borderRadius: 'var(--r)', fontSize: 22, fontWeight: 700,
                fontFamily: 'var(--font-mono)', letterSpacing: '0.3em',
                textAlign: 'center', color: 'var(--text)',
                background: 'var(--surface)', border: '1.5px solid var(--border)',
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, textAlign: 'center' }}>
              For this demo, any 6 digits will work
            </p>
          </div>
          */}

          {/* Step-up: image or audio (replaces OTP) */}
          <div
            style={{
              marginBottom: 16,
              padding: 16,
              borderRadius: 'var(--r-md)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 10px rgba(15,18,41,0.06)',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--text2)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 6,
              }}
            >
              Verify your identity
            </p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.5 }}>
              Trinetra flagged this session. Choose one way to continue — same idea as a one-time
              code, but with biometrics.
            </p>

            {stepUpPhase === 'choose' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => {
                    setStepUpPhase('face')
                    setStepUpVerified(false)
                    setStepUpHint(null)
                  }}
                  style={{ padding: '12px 10px', fontSize: 13, width: '100%' }}
                >
                  Verify with image
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => {
                    setStepUpPhase('voice')
                    setStepUpVerified(false)
                    setStepUpHint(null)
                  }}
                  style={{ padding: '12px 10px', fontSize: 13, width: '100%' }}
                >
                  Verify with audio
                </button>
              </div>
            )}

            {stepUpPhase !== 'choose' && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={loading}
                onClick={() => {
                  setStepUpPhase('choose')
                  setStepUpVerified(false)
                  setStepUpHint(null)
                }}
                style={{ padding: '4px 0', fontSize: 12, marginBottom: 12, width: '100%', textAlign: 'left' }}
              >
                ← Other verification options
              </button>
            )}

            {stepUpPhase === 'face' && (
              <FaceStepUpCapture
                frameless
                disabled={loading}
                onVerified={() => {
                  setStepUpVerified(true)
                  setStepUpHint(null)
                }}
                onFailure={(msg) => {
                  setStepUpVerified(false)
                  setStepUpHint(msg)
                }}
              />
            )}
            {stepUpPhase === 'voice' && (
              <AudioStepUpCapture
                frameless
                disabled={loading}
                onVerified={() => {
                  setStepUpVerified(true)
                  setStepUpHint(null)
                }}
                onFailure={(msg) => {
                  setStepUpVerified(false)
                  setStepUpHint(msg)
                }}
              />
            )}
          </div>

          {stepUpVerified && (
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--green)',
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              Step-up verified — you can confirm below.
            </p>
          )}
          {stepUpHint && !stepUpVerified && (
            <p
              style={{
                fontSize: 12,
                color: 'var(--red)',
                marginBottom: 12,
                textAlign: 'center',
                lineHeight: 1.45,
              }}
            >
              {stepUpHint}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || !stepUpVerified}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '13px', fontSize: 14,
                background: loading || !stepUpVerified ? '#93C5FD' : 'var(--primary)',
                cursor: loading || !stepUpVerified ? 'not-allowed' : 'pointer',
                boxShadow: stepUpVerified && !loading ? '0 4px 14px rgba(30,58,138,0.25)' : 'none',
              }}
            >
              {loading ? 'Verifying…' : 'Confirm — This was me'}
            </button>

            <button type="button" onClick={handleNotMe} className="btn btn-danger" style={{ width: '100%', padding: '12px', fontSize: 13 }}>
              This was NOT me — Lock my account
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 22px',
          background: 'var(--surface2)', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.9)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
              Trinetra
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