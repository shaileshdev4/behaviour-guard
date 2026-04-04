'use client'
import { useSessionStore, Signal } from '@/lib/store'

function SignalRow({ signal }: { signal: Signal }) {
  const hasValue    = signal.value !== null
  const hasBaseline = signal.baseline !== null

  const deviation = hasValue && hasBaseline && signal.baseline !== 0
    ? ((signal.value! - signal.baseline!) / signal.baseline!) * 100
    : null

  /* Status → CSS variable names */
  const STATUS = {
    learning: { bar: 'var(--text3)',   text: 'var(--text2)', bg: 'var(--surface2)', border: 'var(--border)'        },
    normal:   { bar: 'var(--green)',   text: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)'  },
    elevated: { bar: 'var(--yellow)',  text: 'var(--yellow)',bg: 'var(--yellow-bg)',border: 'var(--yellow-border)' },
    critical: { bar: 'var(--red)',     text: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-border)'    },
  }
  const s = STATUS[signal.status] ?? STATUS.learning

  const denom  = signal.baseline ?? (signal.value! * 1.5 || 200)
  const barPct = hasValue && denom > 0 ? Math.min((signal.value! / denom) * 60, 95) : 0

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '96px 1fr 76px',
      alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 'var(--r)',
      background: hasValue ? s.bg : 'var(--surface2)',
      border: `1px solid ${hasValue ? s.border : 'var(--border)'}`,
      transition: 'all var(--t-slow)',
    }}>
      {/* Label */}
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
        {signal.label}
      </span>

      {/* Bar + baseline marker */}
      <div style={{ position: 'relative' }}>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: hasValue ? `${barPct}%` : '0%',
            background: s.bar,
            transition: 'width 0.5s ease, background var(--t-slow)',
          }} />
        </div>
        {hasBaseline && hasValue && (
          <div style={{ position: 'absolute', top: -2, bottom: -2, left: '60%', width: 1, background: 'rgba(0,0,0,0.12)' }} />
        )}
      </div>

      {/* Value */}
      <div style={{ textAlign: 'right' }}>
        {!hasValue ? (
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>—</span>
        ) : (
          <>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.text }}>
              {signal.value?.toFixed(signal.unit === 'bits' || signal.unit === '%' ? 1 : 0)}
              <span style={{ fontSize: 9, fontWeight: 500, marginLeft: 2, opacity: 0.7 }}>{signal.unit}</span>
            </span>
            {deviation !== null && (
              <div style={{ fontSize: 9, color: s.text, opacity: 0.65, marginTop: 1, fontFamily: 'var(--font-mono)' }}>
                {deviation > 0 ? '+' : ''}{deviation.toFixed(0)}%
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function LiveSignalFeed({ compact = false }: { compact?: boolean }) {
  const { signals, phase, enrollmentProgress } = useSessionStore()

  return (
    <div className={compact ? 'card' : 'card-md'} style={{ overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: compact ? '10px 14px' : '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 6, height: 6, borderRadius: 3,
            background: phase === 'active' ? 'var(--green-dot)' : 'var(--accent)',
            animation: 'pulse-dot 1.5s infinite',
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
            Live Behavioral Signals
          </span>
        </div>
        <span className={`badge ${phase === 'active' ? 'badge-green' : 'badge-blue'}`}>
          {phase === 'enrolling' ? `Learning ${enrollmentProgress}%` : 'Active'}
        </span>
      </div>

      {/* Signals list */}
      <div style={{ padding: compact ? '10px 10px' : '12px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {signals.map((sig) => <SignalRow key={sig.key} signal={sig} />)}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 14, padding: compact ? '8px 14px' : '10px 14px',
        borderTop: '1px solid var(--border)', background: 'var(--surface2)',
      }}>
        {[
          { color: 'var(--green-dot)',  label: 'Normal'   },
          { color: 'var(--yellow-dot)', label: 'Elevated' },
          { color: 'var(--red-dot)',    label: 'Critical' },
          { color: 'var(--text3)',      label: 'Learning' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: l.color }} />
            <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}