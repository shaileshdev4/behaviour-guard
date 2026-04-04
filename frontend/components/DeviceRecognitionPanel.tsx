'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getDeviceFingerprintConsent,
  grantDeviceFingerprintConsent,
  revokeDeviceFingerprint,
  shortFingerprint,
  getDeviceFingerprint,
} from '@/lib/deviceFingerprint'

type Props = {
  /** Extra line under buttons (e.g. privacy erasure note) */
  footerExtra?: React.ReactNode
}

export default function DeviceRecognitionPanel({ footerExtra }: Props) {
  const [fpConsent, setFpConsent] = useState<'granted' | 'denied' | 'unknown'>('unknown')
  const [fpValue, setFpValue] = useState<string | null>(null)
  const [fpLoading, setFpLoading] = useState(false)

  useEffect(() => {
    setFpConsent(getDeviceFingerprintConsent())
    getDeviceFingerprint().then(setFpValue)
  }, [])

  const handleRevokeDevice = () => {
    revokeDeviceFingerprint()
    setFpConsent('denied')
    setFpValue(null)
  }

  const handleGrantDevice = async () => {
    setFpLoading(true)
    grantDeviceFingerprintConsent()
    const fp = await getDeviceFingerprint()
    setFpValue(fp)
    setFpConsent('granted')
    setFpLoading(false)
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
      }}
    >
      <div
        style={{
          padding: '14px 22px',
          background: 'var(--surface2)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Device recognition</h2>
        <div
          style={{
            padding: '3px 10px',
            borderRadius: 20,
            background: fpConsent === 'granted' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${fpConsent === 'granted' ? '#A7F3D0' : '#FECACA'}`,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: fpConsent === 'granted' ? '#047857' : '#B91C1C',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {fpConsent === 'granted' ? 'On' : fpConsent === 'denied' ? 'Off' : 'Unknown'}
          </span>
        </div>
      </div>

      <div style={{ padding: '20px 22px' }}>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
          Sends a SHA-256 hash of browser and hardware signals to Trinetra so returning devices can be
          recognised. Unknown devices get stricter behavioral scoring. No PII is stored in the hash.
          You can turn this off anytime; sign out and in again for it to apply to your next session.
        </p>

        {fpValue && fpConsent === 'granted' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#047857' }} />
            <div>
              <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>
                Local fingerprint preview
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text)',
                  letterSpacing: '0.08em',
                }}
              >
                {shortFingerprint(fpValue)}…
                <span
                  style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}
                >
                  SHA-256 · browser only
                </span>
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {fpConsent !== 'denied' ? (
            <button
              type="button"
              onClick={handleRevokeDevice}
              style={{
                padding: '9px 20px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                color: '#B91C1C',
                background: '#FEF2F2',
                border: '1.5px solid #FECACA',
                cursor: 'pointer',
              }}
            >
              Turn off device recognition
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGrantDevice}
              disabled={fpLoading}
              style={{
                padding: '9px 20px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                color: '#047857',
                background: '#ECFDF5',
                border: '1.5px solid #A7F3D0',
                cursor: 'pointer',
              }}
            >
              {fpLoading ? 'Turning on…' : 'Turn on device recognition'}
            </button>
          )}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, lineHeight: 1.5 }}>
          Turning off clears the hash from this browser only. Server-side device lists are removed when
          you delete your behavioral profile on the{' '}
          <Link href="/banking/privacy" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Privacy
          </Link>{' '}
          page.
        </p>
        {footerExtra}
      </div>
    </div>
  )
}
