/**
 * Browser-side device fingerprint for Imprint.
 *
 * - If consent is `denied`, `getDeviceFingerprint()` returns `null` → `createSession` sends no
 *   `device_fingerprint` → backend skips known-device logic (treats as no client hash).
 * - If consent is unset, first successful compute sets consent to `granted` and caches the hash.
 * - Revoking clears local hash only; server `known_device_hashes` are cleared via profile delete
 *   or remain until overwritten on next login with fingerprint enabled.
 */
const STORAGE_KEY     = 'imprint_device_fp'
const CONSENT_KEY     = 'imprint_device_fp_consent'
const FP_VERSION      = 'v1'

/**
 * Compute a stable SHA-256 device fingerprint from passive browser signals.
 * No PII — only hardware/rendering characteristics.
 */
async function computeFingerprint(): Promise<string> {
  const components: string[] = []

  // Browser + OS signals
  components.push(navigator.userAgent)
  components.push(navigator.language)
  components.push(navigator.languages?.join(',') ?? '')
  components.push(String(navigator.hardwareConcurrency ?? ''))
  components.push(
    String(
      typeof navigator !== 'undefined' &&
        'deviceMemory' in navigator &&
        typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
        ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
        : ''
    )
  )

  // Screen geometry
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`)
  components.push(String(window.devicePixelRatio ?? '1'))

  // Timezone
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch { components.push('') }

  // WebGL renderer — most stable cross-session signal
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      if (ext) {
        components.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '')
        components.push(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) ?? '')
      }
      components.push(gl.getParameter(gl.RENDERER) ?? '')
      components.push(gl.getParameter(gl.VENDOR) ?? '')
    }
  } catch { components.push('') }

  // Canvas 2D rendering fingerprint — subtle font/AA differences per device
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200; canvas.height = 40
    const ctx = canvas.getContext('2d')!
    ctx.font = '14px Arial'
    ctx.fillStyle = '#1B2059'
    ctx.fillText('Imprint behavioral auth 🔒', 10, 28)
    components.push(canvas.toDataURL().slice(-64)) // last 64 chars = rendering diff
  } catch { components.push('') }

  // Plugin count (not names — too volatile)
  components.push(String(navigator.plugins?.length ?? 0))

  // Touch support
  components.push(String('ontouchstart' in window))
  components.push(String(navigator.maxTouchPoints ?? 0))

  // Version prefix for future invalidation
  const raw = FP_VERSION + '|' + components.join('|||')

  // SHA-256 via Web Crypto API
  const encoded = new TextEncoder().encode(raw)
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded)
  const hashArr = Array.from(new Uint8Array(hashBuf))
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get fingerprint from localStorage cache, or compute + cache it.
 * Returns null if user has not given consent.
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  // Respect consent
  const consent = localStorage.getItem(CONSENT_KEY)
  if (consent === 'denied') return null

  // Return cached if available
  const cached = localStorage.getItem(STORAGE_KEY)
  if (cached && cached.length === 64) return cached

  // Compute and cache
  try {
    const fp = await computeFingerprint()
    localStorage.setItem(STORAGE_KEY, fp)
    if (!localStorage.getItem(CONSENT_KEY)) {
      // Implicit consent on first compute — explicit UI in privacy page
      localStorage.setItem(CONSENT_KEY, 'granted')
    }
    return fp
  } catch (e) {
    console.warn('[Imprint] Device fingerprint computation failed:', e)
    return null
  }
}

/** User explicitly opts out — deletes stored fingerprint. */
export function revokeDeviceFingerprint(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.setItem(CONSENT_KEY, 'denied')
}

/** User re-enables after revoking. */
export function grantDeviceFingerprintConsent(): void {
  localStorage.setItem(CONSENT_KEY, 'granted')
  // Will recompute on next getDeviceFingerprint() call
  localStorage.removeItem(STORAGE_KEY)
}

export function getDeviceFingerprintConsent(): 'granted' | 'denied' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown'
  const v = localStorage.getItem(CONSENT_KEY)
  if (v === 'granted') return 'granted'
  if (v === 'denied') return 'denied'
  return 'unknown'
}

/** True when the user turned off fingerprinting — nothing is sent to the API. */
export function isDeviceFingerprintOptOut(): boolean {
  return getDeviceFingerprintConsent() === 'denied'
}

/** Short display version for UI — first 8 chars. */
export function shortFingerprint(fp: string): string {
  return fp.slice(0, 8).toUpperCase()
}