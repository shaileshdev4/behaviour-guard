'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSession, registerUser } from '@/lib/api'
import { setAuth } from '@/lib/auth'
import { useSessionStore } from '@/lib/store'

export default function SignupPage() {
  const router = useRouter()
  const setSession = useSessionStore((s) => s.setSession)
  const updateScore = useSessionStore((s) => s.updateScore)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const auth = await registerUser(email.trim(), password)
      setAuth(auth.access_token, auth.user_id, auth.email)
      const data = await createSession({})
      if (!data.session_id) {
        setError('Could not start session')
        return
      }
      setSession(data.session_id, auth.email)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2F7', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: '36px 32px', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(15,18,41,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--primary)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 15,
          }}>B</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>Create account</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28, lineHeight: 1.5 }}>
          Register with email. Your behavioral profile is stored securely and tied to this account.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={lb}>Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inp}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lb}>Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              style={inp}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lb}>Confirm password</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              style={inp}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)', marginBottom: 20, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} />
            Show passwords
          </label>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              fontSize: 13, color: 'var(--red)',
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px', border: 'none', borderRadius: 10,
              background: loading ? '#93C5FD' : 'var(--primary)', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(30,58,138,0.3)',
            }}
          >
            {loading ? 'Creating account…' : 'Sign up & start banking'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 22 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const lb: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)',
  marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
  border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
}
