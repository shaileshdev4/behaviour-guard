'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Sign up UI lives on /login with a slide animation; keep /signup as a stable entry URL. */
export default function SignupRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login?mode=signup')
  }, [router])
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#EEF2F7',
        color: 'var(--text2)',
        fontSize: 14,
      }}
    >
      Redirecting…
    </div>
  )
}
