import { authHeaders, getAccessToken } from '@/lib/auth'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export type VoiceVerifyStatus =
  | 'verified'
  | 'not_configured'
  | 'too_short'

export interface VoiceVerifyResponse {
  status: VoiceVerifyStatus
  detail?: string
  mode?: string
}

export async function verifyVoiceBlob(blob: Blob): Promise<VoiceVerifyResponse> {
  if (!getAccessToken()) {
    throw new Error('Sign in required for voice verification')
  }
  const form = new FormData()
  form.append('file', blob, 'clip.webm')

  const res = await fetch(`${BASE}/voice/verify`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: form,
  })

  const data = (await res.json()) as VoiceVerifyResponse & { detail?: unknown }
  if (!res.ok) {
    const msg =
      typeof data.detail === 'string'
        ? data.detail
        : res.statusText || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as VoiceVerifyResponse
}
