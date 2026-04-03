'use client'
import { useSessionStore, Signal } from '@/lib/store'

function SignalRow({ signal }: { signal: Signal }) {
  const hasValue   = signal.value !== null
  const hasBaseline = signal.baseline !== null

  const deviation = hasValue && hasBaseline && signal.baseline !== 0
    ? ((signal.value! - signal.baseline!) / signal.baseline!) * 100
    : null

  const statusStyle: Record<Signal['status'], { bar: string; text: string; bg: string; border: string }> = {
    learning:  { bar: '#94A3B8', text: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
    normal:    { bar: '#047857', text: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
    elevated:  { bar: '#D97706', text: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
    critical:  { bar: '#DC2626', text: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
  }

  const s = statusStyle[signal.status]

  // Bar width: normalize to 0-100 range for display
  const denom = signal.baseline ?? (signal.value! * 1.5 || 200)
  const barPct = hasValue && denom > 0 ? Math.min((signal.value! / denom) * 60, 95) : 0

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '100px 1fr 80px',
      alignItems: 'center', gap: 12,
      padding: '9px 14px',
      borderRadius: 8,
      background: hasValue ? s.bg : '#FAFBFF',
      border: `1px solid ${hasValue ? s.border : 'var(--border)'}`,
      transition: 'all 0.35s ease',
    }}>
      {/* Label */}
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.02em' }}>
        {signal.label}
      </span>

      {/* Bar */}
      <div style={{ position: 'relative' }}>
        <div style={{
          height: 4, borderRadius: 2,
          background: 'var(--border)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: hasValue ? `${barPct}%` : '0%',
            background: s.bar,
            transition: 'width 0.5s ease, background 0.35s ease',
          }} />
        </div>
        {/* Baseline marker */}
        {hasBaseline && hasValue && (
          <div style={{
            position: 'absolute', top: -2, bottom: -2,
            left: '60%', width: 1,
            background: 'rgba(0,0,0,0.15)',
          }} />
        )}
      </div>

      {/* Value + deviation */}
      <div style={{ textAlign: 'right' }}>
        {!hasValue ? (
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>—</span>
        ) : (
          <div>
            <span style={{
              fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: s.text,
            }}>
              {signal.value?.toFixed(signal.unit === 'bits' || signal.unit === '%' ? 1 : 0)}
              <span style={{ fontSize: 9, fontWeight: 500, marginLeft: 2, opacity: 0.7 }}>{signal.unit}</span>
            </span>
            {deviation !== null && (
              <div style={{ fontSize: 9, color: s.text, opacity: 0.7, marginTop: 1, fontFamily: 'var(--font-mono)' }}>
                {deviation > 0 ? '+' : ''}{deviation.toFixed(0)}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LiveSignalFeed({ compact = false }: { compact?: boolean }) {
  const { signals, phase, enrollmentProgress } = useSessionStore()

  return (
    <div style={{
      background: '#fff',
      borderRadius: compact ? 12 : 16,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: compact ? '12px 16px' : '14px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: 3,
            background: phase === 'active' ? '#047857' : '#4361EE',
            animation: 'pulse-dot 1.5s infinite',
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Live Behavioral Signals
          </span>
        </div>
        <div style={{
          padding: '2px 10px', borderRadius: 10,
          background: phase === 'active' ? '#ECFDF5' : '#EEF2FF',
          border: `1px solid ${phase === 'active' ? '#A7F3D0' : '#C7D2FE'}`,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: phase === 'active' ? '#047857' : '#4361EE',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {phase === 'enrolling' ? `Learning ${enrollmentProgress}%` : 'Active'}
          </span>
        </div>
      </div>

      {/* Signals */}
      <div style={{ padding: compact ? '10px 12px' : '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {signals.map((sig) => (
          <SignalRow key={sig.key} signal={sig} />
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, padding: compact ? '8px 14px' : '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface2)',
      }}>
        {[
          { color: '#047857', label: 'Normal' },
          { color: '#D97706', label: 'Elevated' },
          { color: '#DC2626', label: 'Critical' },
          { color: '#94A3B8', label: 'Learning' },
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