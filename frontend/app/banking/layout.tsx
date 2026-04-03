'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSessionStore } from '@/lib/store'
import { useBehaviorCollector } from '@/hooks/useBehaviorCollector'
import SecurityOverlay from '@/components/SecurityOverlay'
import ScoreIndicator from '@/components/ScoreIndicator'
import { getSession } from '@/lib/api'

const NAV = [
  { href: '/banking/dashboard', label: 'Dashboard' },
  { href: '/banking/transfer',  label: 'Fund Transfer' },
  { href: '/banking/history',   label: 'Transactions' },
]

export default function BankingLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter()
  const pathname  = usePathname()
  const sessionId = useSessionStore((s) => s.sessionId)
  const userId    = useSessionStore((s) => s.userId)
  const updateScore = useSessionStore((s) => s.updateScore)
  const { trackNavigation } = useBehaviorCollector()
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => { if (!sessionId) router.push('/login') }, [sessionId, router])

  useEffect(() => {
    const from = prevPathRef.current ?? 'initial'
    trackNavigation(from, pathname)
    prevPathRef.current = pathname
  }, [pathname, trackNavigation])

  // Keep phase/score aligned with server (event batches can be slow or fail while enrolling).
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
          })
        })
        .catch(() => { /* offline or backend down */ })
    }
    tick()
    const id = setInterval(tick, 5_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [sessionId, updateScore])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top nav */}
      <header style={{
        background: 'var(--primary)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Brand + Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, background: 'rgba(255,255,255,0.15)',
                borderRadius: 7, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13,
                border: '1px solid rgba(255,255,255,0.2)'
              }}>B</div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
                BharatBank
              </span>
            </div>

            <nav style={{ display: 'flex', gap: 4 }}>
              {NAV.map((n) => {
                const active = pathname === n.href
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    style={{
                      padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                      background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                      textDecoration: 'none', transition: 'all 0.15s',
                    }}
                  >
                    {n.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ScoreIndicator />

            <Link
              href="/dashboard"
              target="_blank"
              style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                textDecoration: 'none', transition: 'all 0.15s',
              }}
            >
              Security Console
            </Link>

            {/* User chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 12px 4px 4px', borderRadius: 20,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 13,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                {(userId ?? 'U').replace('USR_00', '')}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                {userId ?? 'User'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-nav accent line */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #3B82F6, #93C5FD, #BFDBFE)' }} />

      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', padding: '28px 24px', width: '100%' }}>
        {children}
      </main>

      <SecurityOverlay />
    </div>
  )
}