'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSessionStore } from '@/lib/store'
import { useBehaviorCollector } from '@/hooks/useBehaviorCollector'
import SecurityOverlay from '@/components/SecurityOverlay'
import ScoreIndicator from '@/components/ScoreIndicator'

export default function BankingLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter()
  const pathname  = usePathname()
  const sessionId = useSessionStore((s) => s.sessionId)
  const hasHydrated = useSessionStore((s) => s.hasHydrated)
  const { trackNavigation } = useBehaviorCollector()
  const prevPathRef = useRef<string | null>(null)

  // Wait for persisted store hydration before redirecting.
  useEffect(() => {
    if (!hasHydrated) return
    if (!sessionId) router.push('/login')
  }, [hasHydrated, sessionId, router])

  // Track page navigation (from → to for behavioral backend)
  useEffect(() => {
    const from = prevPathRef.current ?? 'initial'
    trackNavigation(from, pathname)
    prevPathRef.current = pathname
  }, [pathname, trackNavigation])

  const navItems = [
    { href: '/banking/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/banking/transfer',  label: 'Transfer',  icon: '💸' },
    { href: '/banking/history',   label: 'History',   icon: '📋' },
  ]

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        Restoring secure session...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">

      {/* Top navbar */}
      <nav className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <span className="text-white font-bold">BharatBank</span>
          </div>

          <div className="flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ScoreIndicator />
            <Link
              href="/banking/dashboard"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              target="_blank"
            >
              🖥 Security View
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Security overlay (RED state) */}
      <SecurityOverlay />
    </div>
  )
}