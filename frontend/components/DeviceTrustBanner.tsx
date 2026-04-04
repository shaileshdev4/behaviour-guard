'use client'
import Link from 'next/link'
import { useSessionStore, type DeviceTrustNotice } from '@/lib/store'

const NOTICE_UI: Record<
  Exclude<DeviceTrustNotice, null>,
  { bg: string; border: string; color: string; title: string; body: string }
> = {
  unknown_device: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    color: '#92400E',
    title: 'Unrecognised device',
    body: 'Imprint did not match this browser to your saved devices. Behavioural checks are stricter for this session (including a higher risk multiplier). If this is you, complete your session as usual; the device can be trusted after enrollment or from your next sign-in.',
  },
  recognized_device: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    color: '#047857',
    title: 'Device verified',
    body: 'This browser matches a device we have seen on your account. Device recognition is active for this session.',
  },
  new_account_device: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    color: '#1D4ED8',
    title: 'Device recognition starting',
    body: 'Your account has no saved behavioural profile yet, so strict “unknown device” rules are not applied. After you finish enrollment, this browser can be registered as trusted for future sign-ins.',
  },
  fingerprint_off: {
    bg: '#F3F4F6',
    border: '#E5E7EB',
    color: '#374151',
    title: 'Device fingerprint is off',
    body: 'No device hash is being sent to the server, so Imprint cannot recognise this browser. Turn it on under',
  },
}

export default function DeviceTrustBanner() {
  const notice = useSessionStore((s) => s.deviceTrustNotice)
  const dismiss = useSessionStore((s) => s.dismissDeviceTrustNotice)

  if (!notice) return null

  const cfg = NOTICE_UI[notice]

  return (
    <div
      role="status"
      style={{
        maxWidth: 1160,
        margin: '0 auto',
        padding: '10px 20px 0',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 10,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: cfg.color, marginBottom: 4 }}>
            {cfg.title}
          </p>
          <p style={{ fontSize: 12, color: cfg.color, lineHeight: 1.55, opacity: 0.95 }}>
            {cfg.body}{' '}
            {notice === 'fingerprint_off' && (
              <>
                {' '}
                <Link
                  href="/banking/settings"
                  style={{ fontWeight: 600, color: cfg.color, textDecoration: 'underline' }}
                >
                  Settings
                </Link>
                {' '}
                if you want unknown-device protection.
              </>
            )}
            {notice === 'unknown_device' && (
              <>
                {' '}
                <Link
                  href="/banking/privacy"
                  style={{ fontWeight: 600, color: cfg.color, textDecoration: 'underline' }}
                >
                  Privacy
                </Link>
                {' '}
                has data and deletion options.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss device notice"
          style={{
            flexShrink: 0,
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: cfg.color,
            background: 'rgba(255,255,255,0.5)',
            border: `1px solid ${cfg.border}`,
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
