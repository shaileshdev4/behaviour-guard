import { authHeaders, clearAuth, getAccessToken, setAuth } from '@/lib/auth'

/** Full API base including `/api` (e.g. `http://localhost:8000/api`). */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

function formatErrorDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (detail === undefined || detail === null) return ''
  try {
    return JSON.stringify(detail)
  } catch {
    return String(detail)
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { detail?: unknown }
  if (!res.ok) {
    const msg =
      formatErrorDetail(data.detail) || res.statusText || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export interface TierScoresPayload {
  population:  number
  cohort:      number | null
  individual:  number | null
  trust_day:   number
  cohort_id:   string | null
}

export interface CreateSessionResponse {
  session_id:           string
  user_id?:             string
  phase?:               string
  state?:               string
  enrollment_progress?: number
  cohort_id?:           string | null
  profile_loaded?:      boolean
  database?:            boolean
  device_known?:        boolean
  message?:             string
}

export interface DeleteProfileResponse {
  deleted:                 boolean
  user_id:                 string
  device_hashes_cleared:   boolean
  message:                 string
}
export interface AuthTokenResponse {
  access_token: string
  token_type:   string
  user_id:      string
  email:        string
}

/** Register — requires DATABASE_URL on backend. Returns JWT; does not create Imprint session. */
export async function registerUser(
  email: string,
  password: string
): Promise<AuthTokenResponse> {
  const res = await fetch(`${BASE}/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  })
  return parseJson<AuthTokenResponse>(res)
}

/** Login — returns JWT. */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthTokenResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  })
  return parseJson<AuthTokenResponse>(res)
}

/** Start Imprint session. Requires JWT from register/login (`authHeaders`). */
export async function createSession(options: {
  deviceType?:        string
  deviceFingerprint?: string | null
} = {}): Promise<CreateSessionResponse> {
  const { deviceType = 'desktop', deviceFingerprint } = options
  if (!getAccessToken()) {
    throw new Error('Sign in with email and password first')
  }
  const body: Record<string, unknown> = { device_type: deviceType }
  if (deviceFingerprint) body.device_fingerprint = deviceFingerprint

  const res = await fetch(`${BASE}/session/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  })
  return parseJson<CreateSessionResponse>(res)
}

/** DPDPA erasure — delete behavioral profile and server-side device hashes (JWT `sub`). */
export async function deleteProfileData(): Promise<DeleteProfileResponse> {
  if (!getAccessToken()) {
    throw new Error('Sign in with email and password first')
  }
  const res = await fetch(`${BASE}/auth/profile`, {
    method:  'DELETE',
    headers: { ...authHeaders() },
  })
  return parseJson<DeleteProfileResponse>(res)
}

/** Persist profile and end server session (best-effort). */
export async function endBankingSession(sessionId: string): Promise<void> {
  try {
    await fetch(`${BASE}/session/${encodeURIComponent(sessionId)}/end`, {
      method: 'POST',
    })
  } catch {
    /* offline */
  }
}

export { setAuth, clearAuth, getAccessToken }

export interface EventsExplanationDetail {
  signal:    string
  technical: string
  current:   number
  baseline:  number
  deviation: string
  direction: 'higher' | 'lower'
}

export interface EventsExplanation {
  messages:        string[]
  advice?:         string
  details?:        EventsExplanationDetail[]
  confidence?:     'high' | 'medium' | 'low'
  confidence_msg?: string
}

export interface EventsResponse {
  score:                 number
  state:                 'green' | 'yellow' | 'red'
  phase:                 'enrolling' | 'active'
  enrollment_progress:   number
  window_count:          number
  cohort_id?:            string | null
  action:                string
  explanation?:          EventsExplanation | null
  tier_scores?:          TierScoresPayload | null
}

export interface SessionSnapshot {
  session_id:          string
  user_id?:            string
  phase:               'enrolling' | 'active'
  state:               'green' | 'yellow' | 'red'
  score:               number
  enrollment_progress: number
  window_count:        number
  cohort_id?:          string | null
  tier_scores?:        TierScoresPayload | null
}

/** GET /session/{id} — keeps phase/score in sync if event batches are slow or fail. */
export async function getSession(sessionId: string): Promise<SessionSnapshot> {
  const res = await fetch(`${BASE}/session/${encodeURIComponent(sessionId)}`)
  return parseJson<SessionSnapshot>(res)
}

export async function sendEvents(payload: object): Promise<EventsResponse> {
  const res = await fetch(`${BASE}/session/events`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  return parseJson<EventsResponse>(res)
}

export async function sendFeedback(sessionId: string, wasLegitimate: boolean) {
  const res = await fetch(`${BASE}/session/feedback`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ session_id: sessionId, was_legitimate: wasLegitimate }),
  })
  return parseJson<{
    acknowledged: boolean
    score_reset_to?: number
    profile_updated?: boolean
    model_retrained?: boolean
  }>(res)
}

export interface AdminSessionRow {
  session_id:   string
  user_id:      string
  score:        number
  state:        string
  phase:        string
  window_count: number
  elapsed_min:  number
}

export async function getAdminSessions(): Promise<{
  count: number
  sessions: AdminSessionRow[]
}> {
  const res = await fetch(`${BASE}/admin/sessions`)
  return parseJson(res)
}

/** Build synthetic keystrokes with extreme dwell/flight — demo only. */
function makeImpostorKeystrokes(dwellMs: number, flightMs: number) {
  const events: Array<{ type: string; key: string; timestamp: number }> = []
  let t = 1000.0
  const keys = 'the quick brown fox jumps'.split('')
  for (const k of keys) {
    events.push({ type: 'keydown', key: k, timestamp: t })
    t += dwellMs + (Math.random() * 40 - 20)
    events.push({ type: 'keyup', key: k, timestamp: t })
    t += flightMs + (Math.random() * 60 - 30)
  }
  return events
}

/**
 * Injects extreme timing values to push scoring toward RED — demo / staging only.
 * POSTs to the same `/session/events` pipeline as real telemetry.
 */
export async function injectImpostorEvents(sessionId: string): Promise<EventsResponse> {
  const res = await fetch(`${BASE}/session/events`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      session_id: sessionId,
      window_id:  999,
      keystrokes: makeImpostorKeystrokes(220, 350),
      mouse:      [],
      navigation: [],
    }),
  })
  return parseJson<EventsResponse>(res)
}
