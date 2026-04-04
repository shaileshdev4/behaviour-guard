'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSessionStore } from '@/lib/store'
import { useBehaviorCollector } from '@/hooks/useBehaviorCollector'
import SecurityOverlay from '@/components/SecurityOverlay'
import ScoreIndicator from '@/components/ScoreIndicator'
import DeviceTrustBanner from '@/components/DeviceTrustBanner'
import { endBankingSession, getSession } from '@/lib/api'
import { clearAuth } from '@/lib/auth'
import { isSessionNotFoundError, recreateImprintSession } from '@/lib/imprintRecover'

const NAV = [
  { href: '/banking/dashboard', label: 'Dashboard'    },
  { href: '/banking/transfer',  label: 'Transfer'     },
  { href: '/banking/mpin',      label: 'MPIN'         },
  { href: '/banking/history',   label: 'Transactions' },
  { href: '/banking/privacy',   label: 'Privacy'      },
]

export default function BankingLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter()
  const pathname  = usePathname()
  const sessionId = useSessionStore((s) => s.sessionId)
  const userId    = useSessionStore((s) => s.userId)
  const updateScore  = useSessionStore((s) => s.updateScore)
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
            tierScores: snap.tier_scores ?? undefined,
          })
        })
        .catch(async (err) => {
          if (cancelled) return
          if (isSessionNotFoundError(err)) {
            await recreateImprintSession()
          }
        })
    }
    const t0 = setTimeout(tick, 3_000)
    const id  = setInterval(tick, 15_000)
    return () => { cancelled = true; clearTimeout(t0); clearInterval(id) }
  }, [sessionId, updateScore])

  const handleSignOut = async () => {
    if (sessionId) await endBankingSession(sessionId)
    clearAuth()
    clearSession()
    router.push('/login')
  }

  /* User chip display */
  const chipInitial = !userId ? 'U'
    : userId.includes('@') ? userId.charAt(0).toUpperCase()
    : (userId.replace(/-/g, '').slice(0, 1) || 'U').toUpperCase()

  const chipLabel = userId
    ? userId.includes('@') ? userId.split('@')[0]
      : userId.length > 14 ? `${userId.slice(0, 8)}…`
      : userId
    : 'User'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ── */}
      <header style={{
        background: 'var(--primary)',
        position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          maxWidth: 1160, margin: '0 auto', padding: '0 var(--sp-5)',
          height: 54,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--sp-4)',
        }}>

          {/* Left — logo + nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', flexShrink: 0 }}>

            {/* Wordmark */}
            <Link href="/banking/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>T</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Trinetra
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', lineHeight: 1 }}>
                  TRINETRA
                </span>
              </div>
            </Link>

            {/* Nav */}
            <nav style={{ display: 'flex', gap: 2 }}>
              {NAV.map((n) => {
                const active = pathname === n.href
                return (
                  <Link key={n.href} href={n.href} style={{
                    padding: '5px 12px', borderRadius: 7,
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all var(--t)',
                    whiteSpace: 'nowrap',
                  }}>
                    {n.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right — score + user + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

            <ScoreIndicator />

            <Link href="/dashboard" target="_blank" style={{
              padding: '4px 11px', borderRadius: 7,
              fontSize: 11, fontWeight: 600,
              color: 'rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              Console
            </Link>

            {/* User chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '3px 10px 3px 3px', borderRadius: 20,
              background: 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.13)',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
              }}>
                {chipInitial}
              </div>
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: 'rgba(255,255,255,0.75)',
                maxWidth: 100, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {chipLabel}
              </span>
            </div>

            <button type="button" onClick={handleSignOut} style={{
              padding: '4px 11px', borderRadius: 7,
              fontSize: 11, fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Blue accent line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, var(--accent) 0%, var(--cyan) 60%, transparent 100%)' }} />

      <DeviceTrustBanner />

      <main style={{ flex: 1, maxWidth: 1160, margin: '0 auto', padding: '24px var(--sp-5)', width: '100%' }}>
        {children}
      </main>

      <SecurityOverlay />
    </div>
  )
}