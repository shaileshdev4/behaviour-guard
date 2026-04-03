'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore, Signal } from '@/lib/store'
import { sendEvents } from '@/lib/api'

interface KeyEvt  { type: string; key: string; timestamp: number }
interface MouseEvt { x: number; y: number; timestamp: number }
interface NavEvt   { from_page: string; to: string; timestamp: number }

/* ── Client-side feature computation (mirrors backend) ── */
function computeClientSignals(
  keystrokes: KeyEvt[],
  mouse: MouseEvt[],
  baseline: Record<string, number> | null
): Signal[] {
  const downs: Record<string, number> = {}
  const dwells: number[] = []
  const flights: number[] = []
  const digraphs: number[] = []
  let lastUp: number | null = null
  let lastDown: number | null = null
  let backspace = 0

  for (const e of keystrokes) {
    if (e.type === 'keydown') {
      if (lastDown !== null) {
        const dl = e.timestamp - lastDown
        if (dl > 20 && dl < 1000) digraphs.push(dl)
      }
      if (e.key === 'Backspace') backspace++
      downs[e.key] = e.timestamp
      lastDown = e.timestamp
    } else if (e.type === 'keyup' && downs[e.key]) {
      const dt = e.timestamp - downs[e.key]
      if (dt > 20 && dt < 500) dwells.push(dt)
      if (lastUp !== null) {
        const ft = e.timestamp - lastUp
        if (ft > 0 && ft < 800) flights.push(ft)
      }
      lastUp = e.timestamp
      delete downs[e.key]
    }
  }

  const vels: number[] = []
  for (let i = 1; i < mouse.length; i++) {
    const dt = mouse[i].timestamp - mouse[i-1].timestamp
    if (dt <= 0) continue
    const d = Math.sqrt((mouse[i].x-mouse[i-1].x)**2 + (mouse[i].y-mouse[i-1].y)**2)
    if (d / dt < 10) vels.push(d / dt * 1000) // px/s
  }

  const mean = (a: number[]) => a.length ? a.reduce((s,v) => s+v, 0) / a.length : 0

  // Shannon entropy of dwell distribution
  let entropy = 0
  if (dwells.length >= 3) {
    const bins = new Array(30).fill(0)
    dwells.forEach(d => { const i = Math.min(Math.floor(d / 10), 29); bins[i]++ })
    const total = bins.reduce((s, v) => s + v, 0)
    bins.forEach(b => { if (b > 0) { const p = b/total; entropy -= p * Math.log2(p) } })
  }

  const errorRate = keystrokes.filter(e => e.type === 'keydown').length > 0
    ? (backspace / keystrokes.filter(e => e.type === 'keydown').length) * 100
    : 0

  const values = {
    mean_DT:    Math.round(mean(dwells)),
    mean_FT:    Math.round(mean(flights)),
    mean_DL:    Math.round(mean(digraphs)),
    entropy:    parseFloat(entropy.toFixed(2)),
    error_rate: parseFloat(errorRate.toFixed(1)),
    mouse_vel:  Math.round(mean(vels)),
  }

  const thresholds: Record<string, number> = {
    mean_DT: 0.35, mean_FT: 0.40, mean_DL: 0.35,
    entropy: 0.45, error_rate: 0.60, mouse_vel: 0.50,
  }

  return [
    { key: 'mean_DT',    label: 'Dwell Time',     unit: 'ms',   value: values.mean_DT    || null, baseline: baseline?.mean_DT    ?? null, status: 'normal' },
    { key: 'mean_FT',    label: 'Flight Time',    unit: 'ms',   value: values.mean_FT    || null, baseline: baseline?.mean_FT    ?? null, status: 'normal' },
    { key: 'mean_DL',    label: 'Key Rhythm',     unit: 'ms',   value: values.mean_DL    || null, baseline: baseline?.mean_DL    ?? null, status: 'normal' },
    { key: 'entropy',    label: 'Type Entropy',   unit: 'bits', value: values.entropy    || null, baseline: baseline?.entropy    ?? null, status: 'normal' },
    { key: 'error_rate', label: 'Error Rate',     unit: '%',    value: values.error_rate,          baseline: baseline?.error_rate ?? null, status: 'normal' },
    { key: 'mouse_vel',  label: 'Mouse Velocity', unit: 'px/s', value: values.mouse_vel  || null, baseline: baseline?.mouse_vel  ?? null, status: 'normal' },
  ].map(sig => {
    if (sig.value === null || sig.baseline === null) return { ...sig, status: 'learning' as const }
    const dev = Math.abs(sig.value - sig.baseline) / (sig.baseline + 0.001)
    const thresh = thresholds[sig.key] ?? 0.4
    const status: Signal['status'] = dev > thresh * 2 ? 'critical' : dev > thresh ? 'elevated' : 'normal'
    return { ...sig, status }
  })
}

export function useBehaviorCollector() {
  const { sessionId, updateScore, setOverlay, updateSignals, phase } = useSessionStore()

  const keystrokeBuffer = useRef<KeyEvt[]>([])
  const mouseBuffer     = useRef<MouseEvt[]>([])
  const navBuffer       = useRef<NavEvt[]>([])
  const windowIdRef     = useRef(0)
  const lastMouseTime   = useRef(0)
  const currentPage     = useRef('unknown')
  const baselineRef     = useRef<Record<string, number> | null>(null)

  const flush = useCallback(async () => {
    if (!sessionId) return
    const ks = [...keystrokeBuffer.current]
    const ms = [...mouseBuffer.current]
    const ns = [...navBuffer.current]
    keystrokeBuffer.current = []
    mouseBuffer.current     = []
    navBuffer.current       = []

    if (ks.length < 3 && ms.length < 3) return

    // Compute + push live signals immediately (before backend response)
    const clientSignals = computeClientSignals(ks, ms, baselineRef.current)
    updateSignals(clientSignals)

    const payload = {
      session_id: sessionId,
      window_id:  ++windowIdRef.current,
      keystrokes: ks,
      mouse:      ms,
      navigation: ns,
    }

    try {
      const result = await sendEvents(payload)

      const ts = result.tier_scores
      updateScore({
        score:              result.score,
        state:              result.state,
        phase:              result.phase,
        enrollmentProgress: result.enrollment_progress,
        windowCount:        result.window_count,
        action:             result.action,
        cohortId:           result.cohort_id ?? undefined,
        tierScores:         ts
          ? {
              population: ts.population,
              cohort:     ts.cohort,
              individual: ts.individual,
              trust_day:  ts.trust_day,
              cohort_id:  ts.cohort_id,
            }
          : undefined,
      })

      // After first active window, store baseline
      if (result.phase === 'active' && !baselineRef.current && clientSignals[0].value !== null) {
        const bl: Record<string, number> = {}
        clientSignals.forEach(s => { if (s.value !== null) bl[s.key] = s.value })
        baselineRef.current = bl
      }

      if (result.state === 'red' && result.explanation) {
        setOverlay(true, result.explanation)
      }

      console.log(`[Imprint] W${windowIdRef.current} | Score:${result.score} | ${result.state} | ${result.phase}`)
    } catch (e) {
      console.error('[Imprint] Send failed:', e)
    }
  }, [sessionId, updateScore, setOverlay, updateSignals])

  useEffect(() => {
    if (!sessionId) return

    const onKeyDown = (e: KeyboardEvent) =>
      keystrokeBuffer.current.push({ type: 'keydown', key: e.key, timestamp: performance.now() })

    const onKeyUp = (e: KeyboardEvent) =>
      keystrokeBuffer.current.push({ type: 'keyup', key: e.key, timestamp: performance.now() })

    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - lastMouseTime.current < 50) return
      lastMouseTime.current = now
      mouseBuffer.current.push({ x: e.clientX, y: e.clientY, timestamp: now })
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup',   onKeyUp)
    document.addEventListener('mousemove', onMouseMove)
    const interval = setInterval(flush, 5_000)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup',   onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      clearInterval(interval)
    }
  }, [sessionId, flush])

  const trackNavigation = useCallback((from: string, to: string) => {
    navBuffer.current.push({ from_page: from, to, timestamp: performance.now() })
    currentPage.current = to
  }, [])

  return { trackNavigation, flush }
}