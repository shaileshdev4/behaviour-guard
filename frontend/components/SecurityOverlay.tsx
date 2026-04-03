'use client'
import { useState } from 'react'
import { useSessionStore } from '@/lib/store'
import { sendFeedback } from '@/lib/api'

export default function SecurityOverlay() {
  const { showOverlay, explanation, sessionId, setOverlay, updateScore } = useSessionStore()
  const [otp, setOtp]       = useState('')
  const [loading, setLoading] = useState(false)

  if (!showOverlay) return null

  const handleVerify = async () => {
    if (!sessionId || loading) return
    setLoading(true)
    await sendFeedback(sessionId, true)
    updateScore({ score: 70, state: 'green' })
    setOverlay(false)
    setOtp('')
    setLoading(false)
  }

  const handleNotMe = async () => {
    if (!sessionId) return
    await sendFeedback(sessionId, false)
    setOverlay(false)
    alert('Account secured. Please contact BharatBank support at 1800-258-3838.')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(12,26,58,0.6)',
      backdropFilter: 'blur(6px)',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(12,26,58,0.2)',
      }}>
        {/* Red accent bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #B91C1C, #EF4444)' }} />

        <div style={{ padding: 28 }}>
          {/* Header */}
          <div style={{
            display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 8, flexShrink: 0,
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'var(--red)'
            }}>
              &#9888;
            </div>
            <div>
              <h2 style={{
                fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em'
              }}>
                Identity Verification Required
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>
                Imprint detected unusual behavioral patterns in this session
              </p>
            </div>
          </div>

          {/* Explanation */}
          {(explanation?.messages?.length ?? 0) > 0 && (
            <div style={{
              padding: 16, borderRadius: 8, marginBottom: 20,
              background: 'var(--surface2)', border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                What was detected
              </p>
              {explanation?.messages?.map((msg: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: 2.5, marginTop: 5, flexShrink: 0,
                    background: 'var(--yellow)',
                  }} />
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{msg}</p>
                </div>
              ))}
              {explanation?.advice && (
                <p style={{
                  fontSize: 12, color: 'var(--text2)', marginTop: 10,
                  paddingTop: 10, borderTop: '1px solid var(--border)'
                }}>
                  {explanation?.advice}
                </p>
              )}
            </div>
          )}

          {/* OTP */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6
            }}>
              One-Time Password — sent to +91 98765-XXXXX
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit OTP"
              style={{
                width: '100%', padding: '13px 16px',
                borderRadius: 8, fontSize: 20, fontWeight: 700,
                fontFamily: 'monospace', letterSpacing: '0.25em',
                textAlign: 'center', color: 'var(--text)',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleVerify}
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#93C5FD' : 'var(--primary)',
                color: '#fff', border: 'none', borderRadius: 9,
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(30,58,138,0.25)',
              }}
            >
              {loading ? 'Verifying...' : 'Verify — This was me'}
            </button>
            <button
              onClick={handleNotMe}
              style={{
                width: '100%', padding: '11px',
                background: 'transparent',
                border: '1.5px solid var(--red-border)',
                color: 'var(--red)', borderRadius: 9,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              This was not me — Secure my account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}