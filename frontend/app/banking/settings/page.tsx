'use client'
import Link from 'next/link'
import DeviceRecognitionPanel from '@/components/DeviceRecognitionPanel'

export default function BankingSettingsPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 10,
        }}
      >
        Banking
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--primary)',
          letterSpacing: '-0.03em',
          marginBottom: 8,
        }}
      >
        Settings
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 28 }}>
        Control how Trinetra uses this browser. Changes to device recognition apply on your{' '}
        <strong style={{ color: 'var(--text)' }}>next</strong> sign-in (current session already has a
        server session).
      </p>

      <DeviceRecognitionPanel />

      <div
        style={{
          padding: '16px 18px',
          borderRadius: 12,
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          fontSize: 13,
          color: 'var(--text2)',
          lineHeight: 1.6,
        }}
      >
        Full data inventory, DPDPA rights, and profile deletion live on{' '}
        <Link href="/banking/privacy" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Privacy
        </Link>
        .
      </div>
    </div>
  )
}
