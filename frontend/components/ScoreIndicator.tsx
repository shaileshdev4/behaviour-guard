'use client'
import { useSessionStore } from '@/lib/store'

function ImprintMark() {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.14em',
        color: 'rgba(255,255,255,0.5)',
        flexShrink: 0,
      }}
    >
      IMPRINT
    </span>
  )
}

export default function ScoreIndicator() {
  const { score, state, phase, enrollmentProgress } = useSessionStore()

  if (phase === 'enrolling') {
    return (
      <div
        title="Imprint — building your behavioral profile"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 12px',
          borderRadius: 20,
          background: 'rgba(59,130,246,0.18)',
          border: '1px solid rgba(59,130,246,0.35)',
        }}
      >
        <ImprintMark />
        <div
          style={{
            width: 1,
            height: 12,
            background: 'rgba(59,130,246,0.4)',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            background: '#60A5FA',
            animation: 'pulse-dot 2s infinite',
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#93C5FD' }}>
          Learning {enrollmentProgress}%
        </span>
      </div>
    )
  }

  const cfg = {
    green: {
      bg: 'rgba(16,185,129,0.18)',
      border: 'rgba(16,185,129,0.35)',
      color: '#34D399',
      label: 'Verified',
    },
    yellow: {
      bg: 'rgba(245,158,11,0.18)',
      border: 'rgba(245,158,11,0.35)',
      color: '#FCD34D',
      label: 'Monitoring',
    },
    red: {
      bg: 'rgba(239,68,68,0.18)',
      border: 'rgba(239,68,68,0.35)',
      color: '#F87171',
      label: 'Alert',
    },
  }[state] ?? {
    bg: 'rgba(59,130,246,0.18)',
    border: 'rgba(59,130,246,0.35)',
    color: '#93C5FD',
    label: '',
  }

  return (
    <div
      title="Imprint session trust score"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 12px',
        borderRadius: 20,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <ImprintMark />
      <div
        style={{
          width: 1,
          height: 12,
          background: cfg.border,
          opacity: 0.7,
          flexShrink: 0,
        }}
      />
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          background: cfg.color,
          ...(state !== 'green' ? { animation: 'pulse-dot 1.5s infinite' } : {}),
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: cfg.color,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {score.toFixed(0)}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  )
}
