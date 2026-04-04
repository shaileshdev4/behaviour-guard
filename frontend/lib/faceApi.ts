import { authHeaders, getAccessToken } from '@/lib/auth'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export type FaceVerifyStatus =
  | 'verified'
  | 'no_face'
  | 'unknown'
  | 'not_configured'
  | 'deps_missing'

export interface FaceVerifyResponse {
  status: FaceVerifyStatus
  detail?: string
  distance?: number
  mode?: string
}

/**
 * POST /api/face/verify — multipart image, Bearer JWT required.
 * Do not set Content-Type; browser sets multipart boundary for FormData.
 */
export async function verifyFaceImage(blob: Blob): Promise<FaceVerifyResponse> {
  if (!getAccessToken()) {
    throw new Error('Sign in required for face verification')
  }
  const form = new FormData()
  form.append('file', blob, 'capture.jpg')

  const res = await fetch(`${BASE}/face/verify`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: form,
  })

  const data = (await res.json()) as FaceVerifyResponse & { detail?: unknown }
  if (!res.ok) {
    const msg =
      typeof data.detail === 'string'
        ? data.detail
        : res.statusText || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as FaceVerifyResponse
}
