'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSession } from '@/lib/api'
import { useSessionStore } from '@/lib/store'

const DEMO_USERS = [
  { id: 'USR_001', name: 'Rahul Sharma',  account: 'SB •••• 4821', type: 'Savings Account' },
  { id: 'USR_002', name: 'Priya Mehta',   account: 'SB •••• 3047', type: 'Savings Account' },
  { id: 'USR_003', name: 'Amit Verma',    account: 'CA •••• 7293', type: 'Current Account' },
]

export default function LoginPage() {
  const router      = useRouter()
  const setSession  = useSessionStore((s) => s.setSession)
  const updateScore = useSessionStore((s) => s.updateScore)

  const [selected, setSelected] = useState(DEMO_USERS[0])
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 4) { setError('Minimum 4 characters required'); return }
    setLoading(true); setError('')
    try {
      const data = await createSession(selected.id, 'desktop')
      if (!data.session_id) { setError('Server returned an invalid response'); return }
      setSession(data.session_id, selected.id)
      const raw = data.state
      const state: 'green' | 'yellow' | 'red' =
        raw === 'yellow' || raw === 'red' ? raw : 'green'
      updateScore({ phase: 'enrolling', state, enrollmentProgress: 0 })
      router.push('/banking/dashboard')
    } catch {
      setError('Unable to connect. Ensure the backend is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#EEF2F7' }}>

      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between"
        style={{
          width: '420px',
          flexShrink: 0,
          background: 'linear-gradient(160deg, #1E3A8A 0%, #1e40af 60%, #1d4ed8 100%)',
          padding: '48px',
        }}
      >
        {/* Logo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: 36, height: 36,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>B</div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>
              BharatBank
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 46 }}>
            Personal Banking Portal
          </p>
        </div>

        {/* Main copy */}
        <div>
          <h2 style={{
            color: '#fff', fontSize: 32, fontWeight: 800,
            lineHeight: 1.25, letterSpacing: '-0.03em', marginBottom: 16
          }}>
            Secure banking<br />you can trust.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, marginBottom: 40 }}>
            Powered by BehaviorGuard — your identity is verified continuously throughout every session, not just at login.
          </p>

          {/* Trust points */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Continuous Identity Verification', 'Monitors behavior every 10 seconds silently'],
              ['Zero Friction for You', 'Invisible to legitimate users — only alerts on anomalies'],
              ['DPDPA 2023 Compliant', 'No raw data stored. Privacy by design.'],
            ].map(([title, sub]) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 10, marginTop: 1, flexShrink: 0,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff', fontWeight: 700
                }}>
                  ✓
                </div>
                <div>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          RBI Regulated · ISO 27001 Certified · NPCI Approved
        </p>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, background: 'var(--primary)',
                borderRadius: 7, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14
              }}>B</div>
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>BharatBank</span>
            </div>
          </div>

          <h1 style={{
            fontSize: 26, fontWeight: 800, color: 'var(--text)',
            letterSpacing: '-0.03em', marginBottom: 6
          }}>
            Sign in to your account
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 32 }}>
            Select a demo profile to continue
          </p>

          {/* Account selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Account
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_USERS.map((u) => {
                const active = selected.id === u.id
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelected(u)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', borderRadius: 10, textAlign: 'left',
                      background: active ? 'var(--primary-light)' : 'var(--surface)',
                      border: `1.5px solid ${active ? 'var(--primary-mid)' : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: active ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 19, flexShrink: 0,
                      background: active ? 'var(--primary)' : '#C7D2FE',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                      color: active ? '#fff' : 'var(--primary)',
                    }}>
                      {u.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                        {u.name}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>
                        {u.type} · {u.account}
                      </p>
                    </div>
                    {active && (
                      <div style={{
                        width: 18, height: 18, borderRadius: 9,
                        background: 'var(--primary-mid)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#fff', fontWeight: 700, flexShrink: 0
                      }}>
                        ✓
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Password */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--text2)', marginBottom: 8,
                textTransform: 'uppercase', letterSpacing: '0.06em'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Type anything — we track how, not what"
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px',
                    borderRadius: 10, fontSize: 14, color: 'var(--text)',
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    transition: 'all 0.15s'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, color: 'var(--text2)', fontWeight: 600
                  }}
                >
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: 'var(--red-bg)', border: '1px solid var(--red-border)',
                fontSize: 13, color: 'var(--red)'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#93C5FD' : 'var(--primary)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.01em', transition: 'background 0.15s',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(30,58,138,0.3)'
              }}
            >
              {loading ? 'Connecting...' : 'Sign In Securely'}
            </button>
          </form>

          <p style={{
            textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 24
          }}>
            Protected by BehaviorGuard continuous authentication
          </p>
        </div>
      </div>
    </div>
  )
}