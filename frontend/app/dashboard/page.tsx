'use client'
import { useState, useEffect, useRef } from 'react'
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import { getAdminSessions } from '@/lib/api'

interface S { session_id: string; user_id: string; score: number; state: string; phase: string; window_count: number; elapsed_min: number }
interface Pt { window: number; score: number; state: string }
interface Al { time: string; state: string; score: number; window: number }

const C = (s: string) => ({ green: '#10b981', yellow: '#f59e0b', red: '#ef4444' }[s] ?? '#3b7eff')
const B = (s: string) => ({
  green:  { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  color: '#10b981' },
  yellow: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  color: '#f59e0b' },
  red:    { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   color: '#ef4444' },
}[s] ?? { bg: 'rgba(59,126,255,0.1)', border: 'rgba(59,126,255,0.2)', color: '#3b7eff' })

const Dot = (props: { cx?: number; cy?: number; payload?: { state?: string } }) => {
  const { cx, cy, payload } = props
  if (!payload || payload.state === 'green') return null
  return <circle cx={cx} cy={cy} r={4} fill={C(payload.state ?? '')} stroke="#FFFFFF" strokeWidth={2} />
}

export default function SecurityDashboard() {
  const [sessions, setSessions] = useState<S[]>([])
  const [history,  setHistory]  = useState<Pt[]>([])
  const [alerts,   setAlerts]   = useState<Al[]>([])
  const [active,   setActive]   = useState<string | null>(null)
  const prev = useRef<Record<string, number>>({})

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await getAdminSessions()
        const list: S[] = data.sessions ?? []
        setSessions(list)
        if (list.length > 0 && !active) setActive(list[0].session_id)
        const t = active ? list.find(s => s.session_id === active) : list[0]
        if (t && prev.current[t.session_id] !== t.score) {
          prev.current[t.session_id] = t.score
          setHistory(h => [...h, { window: t.window_count, score: t.score, state: t.state }].slice(-40))
          if (t.state !== 'green') {
            setAlerts(a => [{ time: new Date().toLocaleTimeString(), state: t.state, score: t.score, window: t.window_count }, ...a].slice(0, 15))
          }
        }
      } catch {}
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [active])

  const focused = sessions.find(s => s.session_id === active) ?? sessions[0]
  const b = focused ? B(focused.state) : B('green')

  return (
    <div className="min-h-screen grid-bg" style={{ background: 'var(--bg)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: '#3b7eff' }}>B</div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>BehaviorGuard</span>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold tracking-wide"
                  style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>
              SECURITY CONSOLE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
            <span className="text-xs" style={{ color: '#10b981' }}>LIVE</span>
            <span className="text-xs" style={{ color: 'var(--text3)' }}>
              · {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Sessions sidebar */}
        <div className="xl:col-span-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest px-1"
             style={{ color: 'var(--text3)' }}>Active Sessions</p>

          {sessions.length === 0 && (
            <div className="rounded-xl p-4 text-xs"
                 style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
              No sessions. Login to the banking app.
            </div>
          )}

          {sessions.map(s => {
            const sb = B(s.state)
            return (
              <button key={s.session_id}
                      onClick={() => { setActive(s.session_id); setHistory([]) }}
                      className="w-full text-left rounded-xl p-4 transition-all"
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid ${active === s.session_id ? '#3b7eff' : 'var(--border)'}`,
                      }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{s.user_id}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                        style={{ background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>
                    {s.state.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-xs" style={{ color: 'var(--text2)' }}>{s.phase}</span>
                  <span className="text-lg font-bold mono" style={{ color: sb.color }}>
                    {s.score.toFixed(0)}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${s.score}%`, background: C(s.state) }} />
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text3)' }}>
                  {s.window_count}w · {s.elapsed_min.toFixed(1)}m
                </p>
              </button>
            )
          })}
        </div>

        {/* Main content */}
        <div className="xl:col-span-4 space-y-4">

          {/* Stat cards */}
          {focused && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Trust Score', value: `${focused.score.toFixed(0)}/100`, color: b.color },
                { label: 'Auth State', value: focused.state.toUpperCase(), color: b.color },
                { label: 'Windows', value: focused.window_count, color: '#3b7eff' },
                { label: 'Alerts', value: alerts.length, color: alerts.length > 0 ? '#ef4444' : '#10b981' },
              ].map(c => (
                <div key={c.label} className="rounded-xl p-4"
                     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text2)' }}>{c.label}</p>
                  <p className="text-xl font-bold mono" style={{ color: c.color as string }}>{c.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          <div className="rounded-2xl p-5"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Trust Score Timeline
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                  Updates every 10 seconds · Score 55+ = Verified · 28-55 = Monitor · &lt;28 = Alert
                </p>
              </div>
              {focused && (
                <div className="text-right">
                  <p className="text-2xl font-bold mono" style={{ color: b.color }}>
                    {focused.score.toFixed(0)}
                  </p>
                </div>
              )}
            </div>

            {history.length < 2 ? (
              <div className="h-52 flex flex-col items-center justify-center gap-2"
                   style={{ color: 'var(--text3)' }}>
                <p className="text-sm">Waiting for behavioral data</p>
                <p className="text-xs">Type in the transfer form to see scores appear</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b7eff" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b7eff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="window" stroke="var(--border2)" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="var(--border2)" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(12,26,58,0.08)',
                    }}
                    formatter={(v, _name, item) => {
                      const val = Number(v ?? 0)
                      const state = (item?.payload as { state?: string } | undefined)?.state
                      return [`${val.toFixed(1)} — ${state ?? ''}`, 'Score']
                    }}
                  />
                  <ReferenceLine y={55} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={28} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="score" stroke="#3b7eff" strokeWidth={2}
                        fill="url(#scoreGrad)" dot={<Dot />} activeDot={{ r: 5, fill: '#3b7eff' }}
                        isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Alert log */}
          <div className="rounded-2xl p-5"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Alert Log</h2>
              <span className="text-xs" style={{ color: 'var(--text3)' }}>
                {alerts.length === 0 ? 'Clean session' : `${alerts.length} event${alerts.length > 1 ? 's' : ''}`}
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 py-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
                <p className="text-xs" style={{ color: 'var(--text2)' }}>
                  No anomalies detected. Session is clean.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {alerts.map((a, i) => {
                  const ab = B(a.state)
                  return (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                         style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-md font-semibold"
                              style={{ background: ab.bg, color: ab.color, border: `1px solid ${ab.border}` }}>
                          {a.state.toUpperCase()}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text2)' }}>Window {a.window}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold mono" style={{ color: ab.color }}>
                          {a.score.toFixed(1)}
                        </span>
                        <span className="text-xs mono" style={{ color: 'var(--text3)' }}>{a.time}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}