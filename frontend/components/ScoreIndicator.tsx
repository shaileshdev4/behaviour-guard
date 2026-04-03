'use client'
import { useSessionStore } from '@/lib/store'

export default function ScoreIndicator() {
  const { score, state, phase, enrollmentProgress } = useSessionStore()

  if (phase === 'enrolling') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 12px', borderRadius: 20,
        background: '#EFF6FF', border: '1px solid #BFDBFE',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: 3,
          background: '#2563EB', animation: 'pulse 2s infinite'
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>
          Learning {enrollmentProgress}%
        </span>
      </div>
    )
  }

  const cfg = {
    green:  { bg: 'var(--green-bg)',  border: 'var(--green-border)',  color: 'var(--green)',  label: 'Verified'   },
    yellow: { bg: 'var(--yellow-bg)', border: 'var(--yellow-border)', color: 'var(--yellow)', label: 'Monitoring' },
    red:    { bg: 'var(--red-bg)',    border: 'var(--red-border)',    color: 'var(--red)',    label: 'Alert'      },
  }[state] ?? { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', label: '' }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 12px', borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: 3,
        background: cfg.color,
        ...(state !== 'green' ? { animation: 'pulse 1.5s infinite' } : {})
      }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, fontFamily: 'monospace' }}>
        {score.toFixed(0)}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  )
}