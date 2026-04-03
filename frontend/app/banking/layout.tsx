'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSessionStore } from '@/lib/store'
import { useBehaviorCollector } from '@/hooks/useBehaviorCollector'
import SecurityOverlay from '@/components/SecurityOverlay'
import ScoreIndicator from '@/components/ScoreIndicator'
import { endBankingSession, getSession } from '@/lib/api'
import { clearAuth } from '@/lib/auth'

const NAV = [
  { href: '/banking/dashboard', label: 'Dashboard' },
  { href: '/banking/transfer', label: 'Transfer' },
  { href: '/banking/history', label: 'Transactions' },
  { href: '/banking/privacy', label: 'Privacy' },
]

export default function BankingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const sessionId = useSessionStore((s) => s.sessionId)
  const userId = useSessionStore((s) => s.userId)
  const updateScore = useSessionStore((s) => s.updateScore)
  const clearSession = useSessionStore((s) => s.clearSession)
  const { trackNavigation } = useBehaviorCollector()
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!sessionId) router.push('/login')
  }, [sessionId, router])

  useEffect(() => {
    const from = prevPathRef.current ?? 'initial'
    trackNavigation(from, pathname)
    prevPathRef.current = pathname
  }, [pathname, trackNavigation])

  // Slow poll — event flush already updates the store in real time.
  // Fallback when batches fail or go offline.
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    const tick = () => {
      getSession(sessionId)
        .then((snap) => {
          if (cancelled) return
          updateScore({
            score: snap.score,
            state: snap.state,
            phase: snap.phase,
            enrollmentProgress: snap.enrollment_progress,
            windowCount: snap.window_count,
            cohortId: snap.cohort_id ?? undefined,
            tierScores: snap.tier_scores
              ? {
                  population: snap.tier_scores.population,
                  cohort: snap.tier_scores.cohort,
                  individual: snap.tier_scores.individual,
                  trust_day: snap.tier_scores.trust_day,
                  cohort_id: snap.tier_scores.cohort_id,
                }
              : undefined,
          })
        })
        .catch(() => {
          /* offline */
        })
    }
    const t0 = setTimeout(tick, 3_000)
    const id = setInterval(tick, 15_000)
    return () => {
      cancelled = true
      clearTimeout(t0)
      clearInterval(id)
    }
  }, [sessionId, updateScore])

  const handleSignOut = async () => {
    if (sessionId) await endBankingSession(sessionId)
    clearAuth()
    clearSession()
    router.push('/login')
  }

  const chipInitial = !userId
    ? 'U'
    : userId.includes('@')
      ? userId.charAt(0).toUpperCase()
      : (userId.replace(/-/g, '').slice(0, 1) || 'U').toUpperCase()

  const chipLabel = userId
    ? userId.includes('@')
      ? userId.split('@')[0]
      : userId.length > 14
        ? `${userId.slice(0, 8)}…`
        : userId
    : 'User'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          background: 'var(--primary)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: '0 auto',
            padding: '0 20px',
            height: 54,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              flexShrink: 0,
            }}
          >
            <Link
              href="/banking/dashboard"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>B</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <span
                  style={{
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  BharatBank
                </span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 8,
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    lineHeight: 1,
                  }}
                >
                  IMPRINT
                </span>
              </div>
            </Link>

            <nav style={{ display: 'flex', gap: 2 }}>
              {NAV.map((n) => {
                const active = pathname === n.href
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 7,
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                      background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <ScoreIndicator />

            <Link
              href="/dashboard"
              target="_blank"
              style={{
                padding: '4px 11px',
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Console
            </Link>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '3px 10px 3px 3px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {chipInitial}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.8)',
                  maxWidth: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {chipLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              style={{
                padding: '4px 11px',
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.14)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div
        style={{
          height: 2,
          background:
            'linear-gradient(90deg, #3B82F6 0%, #93C5FD 50%, transparent 100%)',
        }}
      />

      <main
        style={{
          flex: 1,
          maxWidth: 1160,
          margin: '0 auto',
          padding: '24px 20px',
          width: '100%',
        }}
      >
        {children}
      </main>

      <SecurityOverlay />
    </div>
  )
}
