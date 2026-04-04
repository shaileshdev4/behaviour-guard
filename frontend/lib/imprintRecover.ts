import type { CreateSessionResponse } from '@/lib/api'
import { createSession } from '@/lib/api'
import { getAccessToken, getStoredEmail } from '@/lib/auth'
import { getDeviceFingerprint } from '@/lib/deviceFingerprint'
import { useSessionStore } from '@/lib/store'

export function isSessionNotFoundError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  return /session not found/i.test(e.message)
}

/** Same Zustand updates as login after `createSession` (keeps login page DRY). */
export function applyCreateSessionResponse(
  data: CreateSessionResponse,
  displayId: string,
  fingerprintSent: string | null
): void {
  if (!data.session_id) return
  const { setSession, updateScore, setDeviceTrustFromSession } =
    useSessionStore.getState()
  setDeviceTrustFromSession(fingerprintSent, data)
  setSession(data.session_id, displayId)
  const raw = data.state
  const state: 'green' | 'yellow' | 'red' =
    raw === 'yellow' || raw === 'red' ? raw : 'green'
  const phase: 'enrolling' | 'active' =
    data.phase === 'active' ? 'active' : 'enrolling'
  updateScore({
    ...(typeof data.score === 'number' ? { score: data.score } : {}),
    phase,
    state,
    enrollmentProgress: phase === 'active' ? 100 : 0,
    cohortId: data.cohort_id ?? null,
    tierScores: null,
    windowCount: 0,
    action: 'none',
  })
}

let recoverInFlight: Promise<boolean> | null = null

async function doRecreateImprintSession(): Promise<boolean> {
  if (!getAccessToken()) {
    useSessionStore.getState().clearSession()
    return false
  }
  const displayId =
    useSessionStore.getState().userId ?? getStoredEmail() ?? ''
  if (!displayId) {
    useSessionStore.getState().clearSession()
    return false
  }
  try {
    const fp = await getDeviceFingerprint()
    const data = await createSession({ deviceFingerprint: fp })
    applyCreateSessionResponse(data, displayId, fp)
    return true
  } catch {
    return false
  }
}

/**
 * After a backend restart, in-memory Trinetra sessions are gone but the client
 * still holds the old `session_id`. Recreate via JWT + fingerprint.
 */
export async function recreateImprintSession(): Promise<boolean> {
  if (recoverInFlight) return recoverInFlight
  const p = doRecreateImprintSession()
  recoverInFlight = p
  void p.finally(() => {
    if (recoverInFlight === p) recoverInFlight = null
  })
  return p
}
