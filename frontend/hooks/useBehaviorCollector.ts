'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore, Signal } from '@/lib/store'
import { sendEvents } from '@/lib/api'

interface KeyEvt   { type: string; key: string; timestamp: number }
interface MouseEvt { x: number; y: number; timestamp: number }
interface NavEvt   { from_page: string; to: string; timestamp: number }
interface TouchEvt { x: number; y: number; timestamp: number; force: number }

/* ── Client-side feature computation ── */
function computeClientSignals(
  keystrokes: KeyEvt[],
  mouse: MouseEvt[],
  touch: TouchEvt[],
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

  // Combine mouse + touch velocity signals
  const vels: number[] = []

  for (let i = 1; i < mouse.length; i++) {
    const dt = mouse[i].timestamp - mouse[i - 1].timestamp
    if (dt <= 0) continue
    const d = Math.sqrt(
      (mouse[i].x - mouse[i - 1].x) ** 2 +
      (mouse[i].y - mouse[i - 1].y) ** 2
    )
    if (d / dt < 10) vels.push((d / dt) * 1000)
  }

  // Touch swipe velocities — same computation, different input
  const touchVels: number[] = []
  for (let i = 1; i < touch.length; i++) {
    const dt = touch[i].timestamp - touch[i - 1].timestamp
    if (dt <= 0) continue
    const d = Math.sqrt(
      (touch[i].x - touch[i - 1].x) ** 2 +
      (touch[i].y - touch[i - 1].y) ** 2
    )
    if (d / dt < 15) touchVels.push((d / dt) * 1000)
  }

  // Average touch force (pressure) — 0 if device doesn't support it
  const touchForces = touch.map(t => t.force).filter(f => f > 0)

  const mean = (a: number[]) =>
    a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0

  let entropy = 0
  if (dwells.length >= 3) {
    const bins = new Array(30).fill(0)
    dwells.forEach(d => { bins[Math.min(Math.floor(d / 10), 29)]++ })
    const total = bins.reduce((s, v) => s + v, 0)
    bins.forEach(b => {
      if (b > 0) { const p = b / total; entropy -= p * Math.log2(p) }
    })
  }

  const errorRate =
    keystrokes.filter(e => e.type === 'keydown').length > 0
      ? (backspace / keystrokes.filter(e => e.type === 'keydown').length) * 100
      : 0

  // Combined velocity — prefer mouse if available, supplement with touch
  const combinedVel = vels.length > 0
    ? mean(vels)
    : mean(touchVels)

  const values = {
    mean_DT:    Math.round(mean(dwells)),
    mean_FT:    Math.round(mean(flights)),
    mean_DL:    Math.round(mean(digraphs)),
    entropy:    parseFloat(entropy.toFixed(2)),
    error_rate: parseFloat(errorRate.toFixed(1)),
    mouse_vel:  Math.round(combinedVel),
    touch_vel:  Math.round(mean(touchVels)),
    touch_force: parseFloat(mean(touchForces).toFixed(3)),
  }

  const thresholds: Record<string, number> = {
    mean_DT: 0.35, mean_FT: 0.40, mean_DL: 0.35,
    entropy: 0.45, error_rate: 0.60, mouse_vel: 0.50,
  }

  const signals: Signal[] = [
    { key: 'mean_DT',    label: 'Dwell Time',     unit: 'ms',   value: values.mean_DT    || null, baseline: baseline?.mean_DT    ?? null, status: 'normal' },
    { key: 'mean_FT',    label: 'Flight Time',    unit: 'ms',   value: values.mean_FT    || null, baseline: baseline?.mean_FT    ?? null, status: 'normal' },
    { key: 'mean_DL',    label: 'Key Rhythm',     unit: 'ms',   value: values.mean_DL    || null, baseline: baseline?.mean_DL    ?? null, status: 'normal' },
    { key: 'entropy',    label: 'Type Entropy',   unit: 'bits', value: values.entropy    || null, baseline: baseline?.entropy    ?? null, status: 'normal' },
    { key: 'error_rate', label: 'Error Rate',     unit: '%',    value: values.error_rate,          baseline: baseline?.error_rate ?? null, status: 'normal' },
    { key: 'mouse_vel',  label: 'Pointer Speed',  unit: 'px/s', value: values.mouse_vel  || null, baseline: baseline?.mouse_vel  ?? null, status: 'normal' },
  ]

  return signals.map(sig => {
    if (sig.value === null || sig.baseline === null) return { ...sig, status: 'learning' as const }
    const dev = Math.abs(sig.value - sig.baseline) / (sig.baseline + 0.001)
    const thresh = thresholds[sig.key] ?? 0.4
    const status: Signal['status'] =
      dev > thresh * 2 ? 'critical' : dev > thresh ? 'elevated' : 'normal'
    return { ...sig, status }
  })
}

export function useBehaviorCollector() {
  const { sessionId, updateScore, setOverlay, updateSignals } = useSessionStore()

  const keystrokeBuffer = useRef<KeyEvt[]>([])
  const mouseBuffer     = useRef<MouseEvt[]>([])
  const touchBuffer     = useRef<TouchEvt[]>([])
  const navBuffer       = useRef<NavEvt[]>([])
  const windowIdRef     = useRef(0)
  const lastMouseTime   = useRef(0)
  const lastTouchTime   = useRef(0)
  const baselineRef     = useRef<Record<string, number> | null>(null)

  const flush = useCallback(async () => {
    if (!sessionId) return

    const ks = [...keystrokeBuffer.current]
    const ms = [...mouseBuffer.current]
    const ts = [...touchBuffer.current]
    const ns = [...navBuffer.current]
    keystrokeBuffer.current = []
    mouseBuffer.current     = []
    touchBuffer.current     = []
    navBuffer.current       = []

    // Need at least some signal to bother sending
    if (ks.length < 3 && ms.length < 3 && ts.length < 3) return

    // Compute live signals for UI
    const clientSignals = computeClientSignals(ks, ms, ts, baselineRef.current)
    updateSignals(clientSignals)

    // Merge touch into mouse for backend (backend feature extractor handles mouse)
    // Touch events are translated to {x, y, timestamp} — same schema
    const touchAsMouse: MouseEvt[] = ts.map(t => ({ x: t.x, y: t.y, timestamp: t.timestamp }))
    const combinedMouse = [...ms, ...touchAsMouse]
      .sort((a, b) => a.timestamp - b.timestamp)

    const payload = {
      session_id: sessionId,
      window_id:  ++windowIdRef.current,
      keystrokes: ks,
      mouse:      combinedMouse,
      navigation: ns,
      // Touch-specific extras for future backend support
      touch_summary: ts.length > 0 ? {
        count:       ts.length,
        mean_force:  ts.reduce((s, t) => s + t.force, 0) / (ts.length || 1),
        touch_used:  true,
      } : null,
    }

    try {
      const result = await sendEvents(payload)

      const tierScores = result.tier_scores
      updateScore({
        score:              result.score,
        state:              result.state,
        phase:              result.phase,
        enrollmentProgress: result.enrollment_progress,
        windowCount:        result.window_count,
        action:             result.action,
        cohortId:           result.cohort_id ?? undefined,
        tierScores:         tierScores
          ? {
              population: tierScores.population,
              cohort:     tierScores.cohort,
              individual: tierScores.individual,
              trust_day:  tierScores.trust_day,
              cohort_id:  tierScores.cohort_id,
            }
          : undefined,
      })

      // Snapshot baseline after first active window
      if (result.phase === 'active' && !baselineRef.current) {
        const bl: Record<string, number> = {}
        clientSignals.forEach(s => { if (s.value !== null) bl[s.key] = s.value })
        if (Object.keys(bl).length > 0) baselineRef.current = bl
      }

      if (result.state === 'red' && result.explanation) {
        setOverlay(true, result.explanation)
      }

      console.log(
        `[Imprint] W${windowIdRef.current} | ` +
        `Score:${result.score} | ${result.state} | ${result.phase} | ` +
        `ks:${ks.length} mouse:${ms.length} touch:${ts.length}`
      )
    } catch (e) {
      console.error('[Imprint] Send failed:', e)
    }
  }, [sessionId, updateScore, setOverlay, updateSignals])

  useEffect(() => {
    if (!sessionId) return

    // ── Keyboard ──
    const onKeyDown = (e: KeyboardEvent) =>
      keystrokeBuffer.current.push({
        type: 'keydown', key: e.key,
        timestamp: performance.now(),
      })

    const onKeyUp = (e: KeyboardEvent) =>
      keystrokeBuffer.current.push({
        type: 'keyup', key: e.key,
        timestamp: performance.now(),
      })

    // ── Mouse ──
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - lastMouseTime.current < 50) return
      lastMouseTime.current = now
      mouseBuffer.current.push({ x: e.clientX, y: e.clientY, timestamp: now })
    }

    // ── Touch — mobile behavioral signals ──
    const onTouchMove = (e: TouchEvent) => {
      const now = performance.now()
      if (now - lastTouchTime.current < 50) return
      lastTouchTime.current = now
      // Track first touch point
      const t = e.touches[0]
      if (!t) return
      touchBuffer.current.push({
        x:         t.clientX,
        y:         t.clientY,
        timestamp: now,
        force:     (t as any).force ?? 0,  // force = touch pressure (0 on unsupported devices)
      })
    }

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      touchBuffer.current.push({
        x:         t.clientX,
        y:         t.clientY,
        timestamp: performance.now(),
        force:     (t as any).force ?? 0,
      })
    }

    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0]
      if (!t) return
      // Record lift position — useful for swipe length analysis
      touchBuffer.current.push({
        x:         t.clientX,
        y:         t.clientY,
        timestamp: performance.now(),
        force:     0,
      })
    }

    document.addEventListener('keydown',    onKeyDown)
    document.addEventListener('keyup',      onKeyUp)
    document.addEventListener('mousemove',  onMouseMove)
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend',   onTouchEnd,   { passive: true })

    const interval = setInterval(flush, 5_000)

    return () => {
      document.removeEventListener('keydown',    onKeyDown)
      document.removeEventListener('keyup',      onKeyUp)
      document.removeEventListener('mousemove',  onMouseMove)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend',   onTouchEnd)
      clearInterval(interval)
    }
  }, [sessionId, flush])

  const trackNavigation = useCallback((from: string, to: string) => {
    navBuffer.current.push({
      from_page: from, to,
      timestamp: performance.now(),
    })
  }, [])

  return { trackNavigation, flush }
}