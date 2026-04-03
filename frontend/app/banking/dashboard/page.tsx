'use client'
import { useState, useEffect, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts'
import { getAdminSessions } from '@/lib/api'

interface S  { session_id: string; user_id: string; score: number; state: string; phase: string; window_count: number; elapsed_min: number }
interface Pt { window: number; score: number; state: string }
interface Al { time: string; state: string; score: number; window: number }

const SC = (s: string) => ({ green: '#047857', yellow: '#B45309', red: '#B91C1C' }[s] ?? '#1E3A8A')

const badge = (s: string) => {
  const m: Record<string, { bg: string; color: string; border: string }> = {
    green:  { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-border)' },
    yellow: { bg: 'var(--yellow-bg)', color: 'var(--yellow)', border: 'var(--yellow-border)' },
    red:    { bg: 'var(--red-bg)', color: 'var(--red)', border: 'var(--red-border)' },
  }
  return m[s] ?? { bg: 'var(--primary-light)', color: 'var(--primary)', border: 'var(--border2)' }
}

const CustomDot = (props: { cx?: number; cy?: number; payload?: { state?: string } }) => {
  const { cx, cy, payload } = props
  if (!payload || payload.state === 'green') return null
  return <circle cx={cx} cy={cy} r={4} fill={SC(payload.state ?? '')} stroke="#FFFFFF" strokeWidth={2} />
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
            setAlerts(a => [{
              time: new Date().toLocaleTimeString(), state: t.state,
              score: t.score, window: t.window_count
            }, ...a].slice(0, 15))
          }
        }
      } catch { /* backend offline */ }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [active])

  const focused = sessions.find(s => s.session_id === active) ?? sessions[0]

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(12, 26, 58, 0.06)',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'Figtree, sans-serif',
    }}>

      {/* Header */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 0 rgba(12, 26, 58, 0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'var(--primary)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: '-0.02em',
          }}>
            B
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>BehaviorGuard</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.06em' }}>
              SECURITY CONSOLE
            </span>
          </div>
          <div style={{
            padding: '4px 12px',
            borderRadius: 6,
            background: 'var(--green-bg)',
            border: '1px solid var(--green-border)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--green)',
          }}>
            LIVE
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#10B981', boxShadow: '0 0 0 2px rgba(16,185,129,0.25)' }} />
          <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} monitored
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          Active Sessions
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

          {/* Sessions list */}
          <div>
            {sessions.length === 0 && (
              <div style={{ ...cardStyle, padding: 16, fontSize: 13, color: 'var(--text2)' }}>
                No active sessions. Open the banking app and log in.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map(s => {
                const b = badge(s.state)
                const isActive = active === s.session_id
                return (
                  <button
                    key={s.session_id}
                    onClick={() => { setActive(s.session_id); setHistory([]) }}
                    style={{
                      ...cardStyle,
                      padding: 16,
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: `1px solid ${isActive ? 'var(--primary-mid)' : 'var(--border)'}`,
                      background: isActive ? 'var(--primary-light)' : 'var(--surface)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.user_id}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: b.bg,
                        color: b.color,
                        border: `1px solid ${b.border}`,
                      }}>
                        {s.state.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{s.phase}</span>
                      <span style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: SC(s.state),
                        fontFamily: 'ui-monospace, monospace',
                        lineHeight: 1,
                      }}>
                        {s.score.toFixed(0)}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        borderRadius: 2,
                        width: `${s.score}%`,
                        background: SC(s.state),
                        transition: 'width 0.5s',
                      }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, fontFamily: 'ui-monospace, monospace' }}>
                      {s.window_count} windows · {s.elapsed_min.toFixed(1)} min
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {focused && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'Trust Score',  value: `${focused.score.toFixed(0)}/100`, color: SC(focused.state) },
                  { label: 'Auth State',   value: focused.state.toUpperCase(),        color: SC(focused.state) },
                  { label: 'Windows',      value: String(focused.window_count),       color: 'var(--primary-mid)' },
                  { label: 'Alerts',       value: String(alerts.length),              color: alerts.length > 0 ? 'var(--red)' : 'var(--green)' },
                ].map((c) => (
                  <div key={c.label} style={{ ...cardStyle, padding: '16px 18px' }}>
                    <p style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 8,
                    }}>
                      {c.label}
                    </p>
                    <p style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: c.color,
                      fontFamily: 'ui-monospace, monospace',
                      letterSpacing: '-0.02em',
                    }}>
                      {c.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Chart */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Trust Score Timeline</h2>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, lineHeight: 1.45 }}>
                    Verified &gt;55 · Monitor 28–55 · Alert &lt;28 · Refreshes every 3s
                  </p>
                </div>
                {focused && (
                  <p style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: SC(focused.state),
                    fontFamily: 'ui-monospace, monospace',
                    letterSpacing: '-0.04em',
                  }}>
                    {focused.score.toFixed(0)}
                  </p>
                )}
              </div>

              {history.length < 2 ? (
                <div style={{
                  height: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'var(--surface2)',
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>Waiting for behavioral data</p>
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>Type in the banking app transfer form</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="bgTrustGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
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
                    <ReferenceLine y={55} stroke="#10B981" strokeDasharray="4 4" strokeOpacity={0.6} />
                    <ReferenceLine y={28} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.6} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="url(#bgTrustGrad)"
                      dot={<CustomDot />}
                      activeDot={{ r: 5, fill: '#2563EB' }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Alert log */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Alert Log</h2>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {alerts.length === 0 ? 'No anomalies detected' : `${alerts.length} event${alerts.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {alerts.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 16px',
                  background: 'var(--green-bg)',
                  borderRadius: 8,
                  border: '1px solid var(--green-border)',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: '#10B981', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                    Session is clean — no behavioral anomalies flagged.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {alerts.map((a, i) => {
                    const ab = badge(a.state)
                    return (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: ab.bg,
                            color: ab.color,
                            border: `1px solid ${ab.border}`,
                          }}>
                            {a.state.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Window {a.window}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: ab.color, fontFamily: 'ui-monospace, monospace' }}>
                            {a.score.toFixed(1)}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'ui-monospace, monospace' }}>{a.time}</span>
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
    </div>
  )
}
