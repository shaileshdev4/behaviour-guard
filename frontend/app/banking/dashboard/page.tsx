'use client'
import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts'
import { getAdminSessions } from '@/lib/api'

interface SessionData {
  session_id:   string
  user_id:      string
  score:        number
  state:        string
  phase:        string
  window_count: number
  elapsed_min:  number
}

interface ScorePoint {
  window: number
  score:  number
  state:  string
}

interface AlertEntry {
  time:    string
  state:   string
  score:   number
  window:  number
}

// Colour helpers
const stateColor = (state: string) => ({
  green:  '#22c55e',
  yellow: '#f59e0b',
  red:    '#ef4444',
}[state] ?? '#94a3b8')

const stateBadge = (state: string) => ({
  green:  'bg-green-500/20 text-green-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
  red:    'bg-red-500/20 text-red-400',
}[state] ?? 'bg-slate-700 text-slate-400')

// Custom dot: green = invisible, yellow/red = coloured
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  if (payload.state === 'green') return null
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={stateColor(payload.state)}
      stroke="#0f172a" strokeWidth={2}
    />
  )
}

export default function SecurityDashboard() {
  const [sessions, setSessions]       = useState<SessionData[]>([])
  const [scoreHistory, setHistory]    = useState<ScorePoint[]>([])
  const [alerts, setAlerts]           = useState<AlertEntry[]>([])
  const [activeSession, setActive]    = useState<string | null>(null)
  const prevScores = useRef<Record<string, number>>({})

  // Poll admin sessions every 3 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await getAdminSessions()
        const list: SessionData[] = data.sessions ?? []
        setSessions(list)

        // Auto-select first session
        if (list.length > 0 && !activeSession) {
          setActive(list[0].session_id)
        }

        // Track score history for the active (first) session
        const target = activeSession
          ? list.find(s => s.session_id === activeSession)
          : list[0]

        if (target) {
          const prev = prevScores.current[target.session_id]
          if (prev !== target.score) {
            prevScores.current[target.session_id] = target.score

            setHistory(h => {
              const next = [...h, {
                window: target.window_count,
                score:  target.score,
                state:  target.state,
              }].slice(-40)           // keep last 40 points
              return next
            })

            // Log alert if not green
            if (target.state !== 'green') {
              setAlerts(a => [{
                time:   new Date().toLocaleTimeString(),
                state:  target.state,
                score:  target.score,
                window: target.window_count,
              }, ...a].slice(0, 20))
            }
          }
        }
      } catch { /* backend might be warming up */ }
    }

    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [activeSession])

  const focused = sessions.find(s => s.session_id === activeSession) ?? sessions[0]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4">

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            🛡️ BehaviorGuard — Security Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time continuous authentication monitor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm">Live</span>
          <span className="text-slate-600 text-sm ml-2">
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* ── Left column: sessions list ── */}
        <div className="xl:col-span-1 space-y-3">
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-1">
            Active Sessions
          </h2>

          {sessions.length === 0 && (
            <div className="bg-slate-800 rounded-xl p-4 text-slate-500 text-sm border border-slate-700">
              No active sessions. Log in to the banking app.
            </div>
          )}

          {sessions.map(s => (
            <button
              key={s.session_id}
              onClick={() => { setActive(s.session_id); setHistory([]) }}
              className={`w-full text-left bg-slate-800 rounded-xl p-4 border transition-all ${
                activeSession === s.session_id
                  ? 'border-blue-500'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">{s.user_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${stateBadge(s.state)}`}>
                  {s.state.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">{s.phase}</span>
                <span className="text-white text-lg font-bold">
                  {s.score.toFixed(0)}
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${s.score}%`,
                    background: stateColor(s.state)
                  }}
                />
              </div>
              <div className="text-slate-600 text-xs mt-1.5">
                {s.window_count} windows · {s.elapsed_min.toFixed(1)} min
              </div>
            </button>
          ))}
        </div>

        {/* ── Right columns: charts + alerts ── */}
        <div className="xl:col-span-3 space-y-4">

          {/* Score overview cards */}
          {focused && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Trust Score',   value: `${focused.score.toFixed(0)}/100`, color: stateColor(focused.state) },
                { label: 'Session State', value: focused.state.toUpperCase(),       color: stateColor(focused.state) },
                { label: 'Windows Scored',value: focused.window_count.toString(),   color: '#60a5fa' },
              ].map(card => (
                <div key={card.label}
                     className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-500 text-xs mb-1">{card.label}</p>
                  <p className="text-xl font-bold" style={{ color: card.color }}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Score timeline chart */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-4">
              Trust Score Timeline
              <span className="text-slate-500 text-xs font-normal ml-2">
                (updates every 10 seconds)
              </span>
            </h2>

            {scoreHistory.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
                Waiting for behavioral data...
                <br />
                Type in the banking app transfer form.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="window"
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    label={{ value: 'Window', position: 'insideBottom',
                             offset: -2, fill: '#475569', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155',
                                    borderRadius: 8, color: '#f1f5f9' }}
                    formatter={(v: any, _: any, props: any) => [
                      `${Number(v).toFixed(1)}`,
                      `Score (${props.payload?.state ?? ''})`
                    ]}
                  />
                  {/* Zone reference lines */}
                  <ReferenceLine y={55} stroke="#22c55e" strokeDasharray="4 4"
                                 label={{ value: 'GREEN', fill: '#22c55e', fontSize: 10 }} />
                  <ReferenceLine y={28} stroke="#f59e0b" strokeDasharray="4 4"
                                 label={{ value: 'YELLOW', fill: '#f59e0b', fontSize: 10 }} />

                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#60a5fa"
                    strokeWidth={2.5}
                    dot={<CustomDot />}
                    activeDot={{ r: 6, fill: '#60a5fa' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Alert log */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-4">
              Alert Log
              <span className="text-slate-500 text-xs font-normal ml-2">
                non-green events only
              </span>
            </h2>

            {alerts.length === 0 ? (
              <p className="text-slate-600 text-sm">No alerts yet. Session is clean.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.map((a, i) => (
                  <div key={i}
                       className="flex items-center justify-between py-2 px-3
                                  rounded-lg bg-slate-700/40">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stateBadge(a.state)}`}>
                        {a.state.toUpperCase()}
                      </span>
                      <span className="text-slate-400 text-xs">Window {a.window}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white text-sm font-mono">
                        {a.score.toFixed(1)}
                      </span>
                      <span className="text-slate-600 text-xs">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}