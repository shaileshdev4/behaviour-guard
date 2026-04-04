'use client'
import { useState } from 'react'
import { useSessionStore } from '@/lib/store'
import { injectImpostorEvents } from '@/lib/api'

const C = {
  surface: '#0F1729',
  border: '#1C2A45',
  text: '#E8EEFF',
  text2: '#6B80A0',
  text3: '#374B6A',
}

type Props = {
  /** When set (e.g. from security console session list), impostor events target this session. */
  adminSessionId?: string | null
}

export default function DemoControlPanel({ adminSessionId = null }: Props) {
  const storeSessionId = useSessionStore((s) => s.sessionId)
  const updateScore = useSessionStore((s) => s.updateScore)
  const setOverlay = useSessionStore((s) => s.setOverlay)

  const sid = adminSessionId || storeSessionId
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleImpostor = async () => {
    if (!sid) {
      setErr('No session — log in to banking or pick a session above.')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const r = await injectImpostorEvents(sid)
      updateScore({
        score: r.score,
        state: r.state,
        phase: r.phase,
        enrollmentProgress: r.enrollment_progress,
        windowCount: r.window_count,
        action: r.action,
        cohortId: r.cohort_id ?? undefined,
        tierScores: r.tier_scores
          ? {
              population: r.tier_scores.population,
              cohort: r.tier_scores.cohort,
              individual: r.tier_scores.individual,
              trust_day: r.tier_scores.trust_day,
              cohort_id: r.tier_scores.cohort_id,
            }
          : undefined,
      })
      if (r.state === 'red' && r.explanation) {
        setOverlay(true, r.explanation)
      }
      console.log('[Trinetra POST /session/events impostor]', {
        window_id: 999,
        sent: { keystrokes: 'synthetic slow', mouse: 0, navigation: 0 },
        received: {
          score: r.score,
          state: r.state,
          phase: r.phase,
          window_count: r.window_count,
          enrollment_progress: r.enrollment_progress,
          tier_scores: r.tier_scores ?? null,
        },
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.text3,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 10,
        }}
      >
        Demo controls
      </p>
      <p style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, marginBottom: 12 }}>
        Sends one batch of slow keystrokes through the same <code style={{ color: C.text }}>/session/events</code>{' '}
        pipeline. Usually pushes score toward RED within 1–2 windows after EMA.
      </p>
      <button
        type="button"
        onClick={handleImpostor}
        disabled={busy}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          background: busy ? '#4B5563' : '#B91C1C',
          border: 'none',
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? 'Sending…' : 'Simulate Impostor'}
      </button>
      {err && (
        <p style={{ fontSize: 11, color: '#FCA5A5', marginTop: 10, lineHeight: 1.4 }}>
          {err}
        </p>
      )}
      {sid && (
        <p
          style={{
            fontSize: 9,
            color: C.text3,
            marginTop: 10,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          Target: {sid.slice(0, 8)}…
        </p>
      )}
    </div>
  )
}
