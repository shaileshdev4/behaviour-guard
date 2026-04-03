'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSession } from '@/lib/api'
import { useSessionStore } from '@/lib/store'

const DEMO_USERS = [
  { id: 'USR_001', name: 'Rahul Sharma',  account: 'XXXX XXXX 4821' },
  { id: 'USR_002', name: 'Priya Mehta',   account: 'XXXX XXXX 3047' },
  { id: 'USR_003', name: 'Amit Verma',    account: 'XXXX XXXX 7293' },
]

export default function LoginPage() {
  const router       = useRouter()
  const setSession   = useSessionStore((s) => s.setSession)
  const updateScore  = useSessionStore((s) => s.updateScore)

  const [selectedUser, setSelectedUser] = useState(DEMO_USERS[0])
  const [password, setPassword]         = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 4) { setError('Enter at least 4 characters'); return }

    setLoading(true)
    setError('')
    try {
      const data = await createSession(selectedUser.id, 'desktop')
      if (!data.session_id) {
        setError('Invalid response from server.')
        return
      }
      setSession(data.session_id, selectedUser.id)
      const phase: 'enrolling' | 'active' =
        data.phase === 'active' ? 'active' : 'enrolling'
      const stateRaw = data.state
      const state: 'green' | 'yellow' | 'red' =
        stateRaw === 'yellow' || stateRaw === 'red' ? stateRaw : 'green'
      updateScore({
        phase,
        state,
        enrollmentProgress: data.enrollment_progress ?? 0,
      })
      router.push('/banking/dashboard')
    } catch {
      setError('Could not connect to server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🛡️</span>
            <h1 className="text-2xl font-bold text-white">BharatBank</h1>
          </div>
          <p className="text-slate-400 text-sm">Secured by BehaviorGuard™</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">

          {/* User selector */}
          <div className="mb-5">
            <label className="text-slate-400 text-sm mb-2 block">Select Demo Account</label>
            <div className="space-y-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    selectedUser.id === u.id
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium text-sm">{u.name}</div>
                  <div className="text-xs opacity-60">{u.account}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label className="text-slate-400 text-sm mb-2 block">
                Password (type anything — we track HOW you type)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl
                           px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                         text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Connecting...' : 'Login Securely'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Behavioral monitoring starts immediately after login
        </p>
      </div>
    </div>
  )
}