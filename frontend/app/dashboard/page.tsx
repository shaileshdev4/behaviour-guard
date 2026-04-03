'use client'
import { useState, useEffect, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts'
import { getAdminSessions } from '@/lib/api'
import FeatureDeviationChart from '@/components/FeatureDeviationChart'
import DemoControlPanel from '@/components/DemoControlPanel'
import { useSessionStore } from '@/lib/store'

interface S  { session_id: string; user_id: string; score: number; state: string; phase: string; window_count: number; elapsed_min: number }
interface Pt { window: number; score: number; state: string }
interface Al { time: string; state: string; score: number; window: number }

const SC = (s: string) => ({ green: '#10B981', yellow: '#F59E0B', red: '#EF4444' }[s] ?? '#4361EE')

const badge = (s: string) => {
  const m: Record<string, { bg: string; color: string; border: string }> = {
    green:  { bg: 'rgba(16,185,129,0.12)', color: '#10B981', border: 'rgba(16,185,129,0.25)' },
    yellow: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
    red:    { bg: 'rgba(239,68,68,0.12)',  color: '#EF4444', border: 'rgba(239,68,68,0.25)'  },
  }
  return m[s] ?? { bg: 'rgba(67,97,238,0.12)', color: '#4361EE', border: 'rgba(67,97,238,0.25)' }
}

const CustomDot = (props: { cx?: number; cy?: number; payload?: Pt }) => {
  const { cx, cy, payload } = props
  if (!payload || payload.state === 'green') return null
  return <circle cx={cx} cy={cy} r={4} fill={SC(payload.state)} stroke="#0A0F1E" strokeWidth={2} />
}

const C = {
  bg: '#0A0F1E', surface: '#0F1729', surface2: '#151E35',
  border: '#1C2A45', border2: '#253550',
  text: '#E8EEFF', text2: '#6B80A0', text3: '#374B6A',
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
              score: t.score, window: t.window_count,
            }, ...a].slice(0, 15))
          }
        }
      } catch {}
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [active])

  const focused = sessions.find(s => s.session_id === active) ?? sessions[0]

  const cardStyle = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: 'Sora, sans-serif',
    }}>

      {/* Header */}
      <header style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, #1B2059, #4361EE)',
            borderRadius: 7, display: 'flex', alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.9)' }} />
          </div>
          <span style={{
            fontFamily: 'Cormorant Garant, serif',
            fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.02em',
          }}>
            Imprint
          </span>
          <div style={{
            padding: '2px 10px', borderRadius: 20,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            fontSize: 10, fontWeight: 700, color: '#10B981',
          }}>
            SECURITY CONSOLE
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: '#10B981', animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>LIVE</span>
          <span style={{ fontSize: 12, color: C.text3, marginLeft: 4 }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 16 }}>

          {/* Sessions list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: C.text3,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '0 4px',
            }}>
              Active Sessions
            </p>

            {sessions.length === 0 && (
              <div style={{ ...cardStyle, padding: 16, fontSize: 13, color: C.text2 }}>
                No active sessions. Open the banking app.
              </div>
            )}

            {sessions.map(s => {
              const b = badge(s.state)
              const isActive = active === s.session_id
              return (
                <button
                  key={s.session_id}
                  onClick={() => { setActive(s.session_id); setHistory([]) }}
                  style={{
                    ...cardStyle,
                    padding: 16, textAlign: 'left', cursor: 'pointer',
                    border: `1px solid ${isActive ? '#4361EE' : C.border}`,
                    background: isActive ? 'rgba(67,97,238,0.08)' : C.surface,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.user_id}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: b.bg, color: b.color, border: `1px solid ${b.border}`,
                    }}>
                      {s.state.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: C.text2 }}>{s.phase}</span>
                    <span style={{
                      fontSize: 28, fontWeight: 800, color: SC(s.state),
                      fontFamily: 'monospace', lineHeight: 1,
                    }}>
                      {s.score.toFixed(0)}
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${s.score}%`, background: SC(s.state),
                      transition: 'width 0.5s',
                    }} />
                  </div>
                  <p style={{
                    fontSize: 10, color: C.text3, marginTop: 6,
                    fontFamily: 'monospace',
                  }}>
                    {s.window_count}w · {s.elapsed_min.toFixed(1)}m
                  </p>
                </button>
              )
            })}

            {/* Demo control panel */}
            <DemoControlPanel />
          </div>

          {/* Main panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Stat row */}
            {focused && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: 'Trust Score',  value: `${focused.score.toFixed(0)}/100`, color: SC(focused.state) },
                  { label: 'Auth State',   value: focused.state.toUpperCase(),        color: SC(focused.state) },
                  { label: 'Windows',      value: focused.window_count,               color: '#4361EE' },
                  { label: 'Alerts',       value: alerts.length,                      color: alerts.length > 0 ? '#EF4444' : '#10B981' },
                ].map((c) => (
                  <div key={c.label} style={{ ...cardStyle, padding: '14px 18px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      {c.label}
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: c.color as string, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
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
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Trust Score Timeline</h2>
                  <p style={{ fontSize: 12, color: C.text2, marginTop: 3 }}>
                    Verified &gt;55 · Monitor 28–55 · Alert &lt;28 · Updates every 10s
                  </p>
                </div>
                {focused && (
                  <p style={{
                    fontSize: 32, fontWeight: 800,
                    color: SC(focused.state), fontFamily: 'monospace',
                    letterSpacing: '-0.04em',
                  }}>
                    {focused.score.toFixed(0)}
                  </p>
                )}
              </div>

              {history.length < 2 ? (
                <div style={{
                  height: 200, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <p style={{ fontSize: 14, color: C.text2 }}>Waiting for behavioral data</p>
                  <p style={{ fontSize: 12, color: C.text3 }}>Type in the banking app transfer form</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#4361EE" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4361EE" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="window" stroke={C.border2} tick={{ fill: C.text3, fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke={C.border2} tick={{ fill: C.text3, fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: C.surface2, border: `1px solid ${C.border}`,
                        borderRadius: 8, color: C.text, fontSize: 12,
                      }}
                      formatter={(v, _n, item) =>
                        [`${Number(v ?? 0).toFixed(1)} — ${(item as { payload?: Pt }).payload?.state ?? ''}`, 'Score']}
                    />
                    <ReferenceLine y={55} stroke="#10B981" strokeDasharray="4 4" strokeOpacity={0.4} />
                    <ReferenceLine y={28} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.4} />
                    <Area
                      type="monotone" dataKey="score"
                      stroke="#4361EE" strokeWidth={2.5}
                      fill="url(#sg)"
                      dot={<CustomDot />}
                      activeDot={{ r: 5, fill: '#4361EE' }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Feature deviation chart */}
            <FeatureDeviationChart />

            {/* Alert log */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 16,
              }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Alert Log</h2>
                <span style={{ fontSize: 11, color: C.text3 }}>
                  {alerts.length === 0 ? 'No anomalies' : `${alerts.length} event${alerts.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {alerts.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: '#10B981' }} />
                  <p style={{ fontSize: 13, color: C.text2 }}>Session clean — no behavioral anomalies flagged</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {alerts.map((a, i) => {
                    const ab = badge(a.state)
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 8,
                        background: C.surface2, border: `1px solid ${C.border}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                            background: ab.bg, color: ab.color, border: `1px solid ${ab.border}`,
                          }}>
                            {a.state.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 12, color: C.text2 }}>Window {a.window}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: ab.color, fontFamily: 'monospace' }}>
                            {a.score.toFixed(1)}
                          </span>
                          <span style={{ fontSize: 11, color: C.text3, fontFamily: 'monospace' }}>{a.time}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar — live signals */}
          <div style={{ position: 'sticky', top: 68, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Override LiveSignalFeed styles for dark console */}
            <div style={{
              background: C.surface,
              borderRadius: 12, border: `1px solid ${C.border}`,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
                background: C.surface2,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: 3,
                    background: '#10B981', animation: 'pulse-dot 1.5s infinite',
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Live Signals</span>
                </div>
              </div>

              {/* Re-render signals from store in dark theme */}
              <SignalsDark />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Dark-theme signal renderer for the security console */
function SignalsDark() {
    const signals = useSessionStore((s) => s.signals)
  
    const statusColor: Record<string, string> = {
      learning: '#374B6A',
      normal:   '#10B981',
      elevated: '#F59E0B',
      critical: '#EF4444',
    }
  
    return (
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {signals.map((sig) => {
          const color = statusColor[sig.status] ?? '#374B6A'
          const denom = sig.baseline ?? ((sig.value ?? 0) * 1.5 || 200)
          const barPct = sig.value !== null && denom > 0
            ? Math.min((sig.value / denom) * 60, 95)
            : 0
          return (
            <div key={sig.key} style={{
              display: 'grid', gridTemplateColumns: '90px 1fr',
              alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 7,
              background: '#151E35', border: '1px solid #1C2A45',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B80A0' }}>{sig.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#1C2A45', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2, background: color,
                    width: `${barPct}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                  color, minWidth: 36, textAlign: 'right',
                }}>
                  {sig.value !== null ? sig.value.toFixed(0) : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }