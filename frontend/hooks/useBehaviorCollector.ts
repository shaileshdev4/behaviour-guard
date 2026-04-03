'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore } from '@/lib/store'
import { sendEvents } from '@/lib/api'

interface KeyEvent {
  type:      string
  key:       string
  timestamp: number
}

interface MouseEvt {
  x:         number
  y:         number
  timestamp: number
}

interface NavEvent {
  from_page: string
  to:        string
  timestamp: number
}

export function useBehaviorCollector() {
  const { sessionId, updateScore, setOverlay } = useSessionStore()

  const keystrokeBuffer = useRef<KeyEvent[]>([])
  const mouseBuffer     = useRef<MouseEvt[]>([])
  const navBuffer       = useRef<NavEvent[]>([])
  const windowIdRef     = useRef(0)
  const lastMouseTime   = useRef(0)
  const currentPage     = useRef('unknown')

  const flush = useCallback(async () => {
    if (!sessionId) return
    if (keystrokeBuffer.current.length < 3 &&
        mouseBuffer.current.length < 3) return

    const payload = {
      session_id: sessionId,
      window_id:  ++windowIdRef.current,
      keystrokes: [...keystrokeBuffer.current],
      mouse:      [...mouseBuffer.current],
      navigation: [...navBuffer.current],
    }

    keystrokeBuffer.current = []
    mouseBuffer.current     = []
    navBuffer.current       = []

    try {
      const result = await sendEvents(payload)

      updateScore({
        score:              result.score,
        state:              result.state,
        phase:              result.phase,
        enrollmentProgress: result.enrollment_progress,
        windowCount:        result.window_count,
        action:             result.action,
      })

      if (result.state === 'red' && result.explanation) {
        setOverlay(true, result.explanation)
      }

      // Log to console for demo visibility
      console.log(
        `[BG] Window ${windowIdRef.current} | ` +
        `Score: ${result.score} | State: ${result.state} | ` +
        `Phase: ${result.phase}`
      )
    } catch (e) {
      console.error('[BG] Failed to send events:', e)
    }
  }, [sessionId, updateScore, setOverlay])

  useEffect(() => {
    if (!sessionId) return

    const onKeyDown = (e: KeyboardEvent) => {
      keystrokeBuffer.current.push({
        type:      'keydown',
        key:       e.key,
        timestamp: performance.now(),
      })
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keystrokeBuffer.current.push({
        type:      'keyup',
        key:       e.key,
        timestamp: performance.now(),
      })
    }

    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - lastMouseTime.current < 50) return   // throttle to 20/sec
      lastMouseTime.current = now
      mouseBuffer.current.push({ x: e.clientX, y: e.clientY, timestamp: now })
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup',   onKeyUp)
    document.addEventListener('mousemove', onMouseMove)

    // Flush often enough that enrollment can finish while the user banks (was 10s).
    const interval = setInterval(flush, 5_000)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup',   onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      clearInterval(interval)
    }
  }, [sessionId, flush])

  // Call this on page transitions
  const trackNavigation = useCallback((from: string, to: string) => {
    navBuffer.current.push({
      from_page: from,
      to,
      timestamp: performance.now(),
    })
    currentPage.current = to
  }, [])

  return { trackNavigation, flush }
}