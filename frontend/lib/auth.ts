const TOKEN_KEY = 'bg_access_token'
const USER_ID_KEY = 'bg_user_id'
const EMAIL_KEY = 'bg_user_email'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(accessToken: string, userId: string, email: string) {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(USER_ID_KEY, userId)
  localStorage.setItem(EMAIL_KEY, email)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(EMAIL_KEY)
}

export function getStoredEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(EMAIL_KEY)
}

export function authHeaders(): Record<string, string> {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
