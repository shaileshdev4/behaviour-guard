'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSession, loginUser, registerUser } from '@/lib/api'
import { setAuth } from '@/lib/auth'
import { useSessionStore } from '@/lib/store'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#EEF2F7',
            color: 'var(--text2)',
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      }
    >
      <AuthForms />
    </Suspense>
  )
}

function AuthForms() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSession = useSessionStore((s) => s.setSession)
  const updateScore = useSessionStore((s) => s.updateScore)
  const setDeviceTrustFromSession = useSessionStore((s) => s.setDeviceTrustFromSession)

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [emailPass, setEmailPass] = useState('')
  const [signupPass, setSignupPass] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') setMode('signup')
  }, [searchParams])

  const goSignin = useCallback(() => {
    setError('')
    setMode('signin')
    router.replace('/login', { scroll: false })
  }, [router])

  const goSignup = useCallback(() => {
    setError('')
    setMode('signup')
    router.replace('/login?mode=signup', { scroll: false })
  }, [router])

  const finishLogin = (
    data: Awaited<ReturnType<typeof createSession>>,
    displayId: string,
    fingerprintSent: string | null
  ) => {
    if (!data.session_id) {
      setError('Server returned an invalid response')
      return
    }
    setDeviceTrustFromSession(fingerprintSent, data)
    setSession(data.session_id, displayId)
    const raw = data.state
    const state: 'green' | 'yellow' | 'red' =
      raw === 'yellow' || raw === 'red' ? raw : 'green'
    const phase: 'enrolling' | 'active' =
      data.phase === 'active' ? 'active' : 'enrolling'
    updateScore({
      phase,
      state,
      enrollmentProgress: phase === 'active' ? 100 : 0,
      cohortId: data.cohort_id ?? null,
      tierScores: null,
    })
    router.push('/banking/dashboard')
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (emailPass.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const auth = await loginUser(email.trim(), emailPass)
      setAuth(auth.access_token, auth.user_id, auth.email)
      const { getDeviceFingerprint } = await import('@/lib/deviceFingerprint')
      const fp = await getDeviceFingerprint()
      const data = await createSession({ deviceFingerprint: fp })
      finishLogin(data, auth.email, fp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (signupPass.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (signupPass !== signupConfirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const auth = await registerUser(email.trim(), signupPass)
      setAuth(auth.access_token, auth.user_id, auth.email)
      const { getDeviceFingerprint } = await import('@/lib/deviceFingerprint')
      const fp = await getDeviceFingerprint()
      const data = await createSession({ deviceFingerprint: fp })
      if (!data.session_id) {
        setError('Could not start session')
        return
      }
      finishLogin(data, auth.email, fp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#EEF2F7' }}>
      <div
        className="hidden lg:flex flex-col justify-between"
        style={{
          width: '420px',
          flexShrink: 0,
          background: 'linear-gradient(160deg, #1E3A8A 0%, #1e40af 60%, #1d4ed8 100%)',
          padding: '48px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 800,
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              B
            </div>
            <span
              style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: '-0.02em',
              }}
            >
              BharatBank
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 46 }}>
            Personal Banking Portal
          </p>
        </div>

        <div>
          <h2
            style={{
              color: '#fff',
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: '-0.03em',
              marginBottom: 16,
            }}
          >
            Secure banking
            <br />
            you can trust.
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 40,
            }}
          >
            Create an account or sign in. Imprint verifies how you type and move the mouse — not what you
            type.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Continuous Identity Verification', 'Monitors behavior every 5 seconds silently'],
              ['Zero Friction for You', 'Invisible to legitimate users — only alerts on anomalies'],
              ['Your profile is saved', 'Returning users skip enrollment when a model exists in the database'],
            ].map(([title, sub]) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    marginTop: 1,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
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

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="lg:hidden" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: 'var(--primary)',
                  borderRadius: 7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                B
              </div>
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>BharatBank</span>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: mode === 'signup' ? 520 : 400,
              transition: 'min-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '200%',
                transform: mode === 'signin' ? 'translateX(0%)' : 'translateX(-50%)',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
              }}
            >
              {/* Sign in panel */}
              <div style={{ width: '50%', flexShrink: 0, paddingRight: 0 }}>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--text)',
                    letterSpacing: '-0.03em',
                    marginBottom: 6,
                  }}
                >
                  Sign in
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
                  Use the email and password you registered with.
                </p>

                <form onSubmit={handleEmailLogin}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={emailPass}
                        onChange={(e) => setEmailPass(e.target.value)}
                        placeholder="At least 8 characters"
                        minLength={8}
                        style={{ ...inputStyle, paddingRight: 52 }}
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} style={togglePassStyle}>
                        {showPass ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>
                  {error && mode === 'signin' && <ErrorBox msg={error} />}
                  <button type="submit" disabled={loading && mode === 'signin'} style={submitStyle(loading && mode === 'signin')}>
                    {loading && mode === 'signin' ? 'Signing in…' : 'Sign in'}
                  </button>
                  <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 18 }}>
                    New here?{' '}
                    <button
                      type="button"
                      onClick={goSignup}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                      }}
                    >
                      Create an account
                    </button>
                  </p>
                </form>
              </div>

              {/* Sign up panel */}
              <div style={{ width: '50%', flexShrink: 0, paddingLeft: 0 }}>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--text)',
                    letterSpacing: '-0.03em',
                    marginBottom: 6,
                  }}
                >
                  Create account
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.5 }}>
                  Register with email. Your behavioral profile is stored securely and tied to this account.
                </p>

                <form onSubmit={handleSignup}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Password</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={signupPass}
                      onChange={(e) => setSignupPass(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Confirm password</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      placeholder="Repeat password"
                      style={inputStyle}
                    />
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: 'var(--text2)',
                      marginBottom: 16,
                      cursor: 'pointer',
                    }}
                  >
                    <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} />
                    Show passwords
                  </label>
                  {error && mode === 'signup' && <ErrorBox msg={error} />}
                  <button
                    type="submit"
                    disabled={loading && mode === 'signup'}
                    style={submitStyle(loading && mode === 'signup')}
                  >
                    {loading && mode === 'signup' ? 'Creating account…' : 'Sign up & start banking'}
                  </button>
                  <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 18 }}>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={goSignin}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                      }}
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 24 }}>
            Protected by Imprint continuous authentication
          </p>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text2)',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  fontSize: 14,
  color: 'var(--text)',
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
}

const togglePassStyle: React.CSSProperties = {
  position: 'absolute',
  right: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 11,
  color: 'var(--text2)',
  fontWeight: 600,
}

function submitStyle(loading: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '13px',
    background: loading ? '#93C5FD' : 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    letterSpacing: '-0.01em',
    boxShadow: loading ? 'none' : '0 4px 14px rgba(30,58,138,0.3)',
  }
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        marginBottom: 16,
        background: 'var(--red-bg)',
        border: '1px solid var(--red-border)',
        fontSize: 13,
        color: 'var(--red)',
      }}
    >
      {msg}
    </div>
  )
}
