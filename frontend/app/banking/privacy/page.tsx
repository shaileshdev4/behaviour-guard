'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSessionStore } from '@/lib/store'
import { deleteProfileData } from '@/lib/api'
import { revokeDeviceFingerprint } from '@/lib/deviceFingerprint'
import DeviceRecognitionPanel from '@/components/DeviceRecognitionPanel'

export default function PrivacyPage() {
  const { userId, signals } = useSessionStore()
  const [deleted, setDeleted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!userId) return
    setDeleting(true)
    setError(null)
    try {
      await deleteProfileData()
      revokeDeviceFingerprint()
      setDeleted(true)
      setShowConfirm(false)
    } catch {
      setError('Deletion failed. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  const dataItems = [
    { label: 'Raw keystroke content',   stored: false, note: 'Never captured or stored' },
    { label: 'Key timing patterns',     stored: true,  note: 'Mean & std deviation only — 12 numbers' },
    { label: 'Navigation sequences',    stored: true,  note: 'Page order and dwell times — anonymized' },
    { label: 'Mouse velocity averages', stored: true,  note: 'Statistical summary only' },
    { label: 'Transaction amounts',     stored: false, note: 'Not used by behavioral system' },
    { label: 'Account details',         stored: false, note: 'Outside scope of Trinetra' },
    { label: 'Location / IP address',   stored: false, note: 'Not collected' },
  ]

  const rights = [
    { right: 'Right to Access',    desc: 'View all behavioral data stored about you', section: 'Section 12, DPDPA 2023' },
    { right: 'Right to Erasure',   desc: 'Delete your behavioral profile permanently', section: 'Section 13, DPDPA 2023' },
    { right: 'Right to Withdraw',  desc: 'Disable behavioral auth at any time',       section: 'Section 6(4), DPDPA 2023' },
    { right: 'Right to Portability', desc: 'Export your behavioral data in JSON format', section: 'Section 12, DPDPA 2023' },
  ]

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
        }}>
          Privacy Dashboard
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36, fontWeight: 700, color: 'var(--primary)',
          letterSpacing: '-0.03em', marginBottom: 12,
        }}>
          Your data. Your control.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7 }}>
          Trinetra is built on a privacy-first foundation. This page shows exactly
          what behavioral data is stored about you and gives you full control over it.
          Compliant with DPDPA 2023.
        </p>
      </div>

      {/* User ID */}
      {userId && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderRadius: 12, marginBottom: 24,
          background: '#fff', border: '1px solid var(--border)',
          boxShadow: '0 1px 4px rgba(15,18,41,0.05)',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
              Your Account
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {userId}
            </p>
          </div>
          <div style={{
            padding: '5px 14px', borderRadius: 20,
            background: '#ECFDF5', border: '1px solid #A7F3D0',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>Consent Active</span>
          </div>
        </div>
      )}

      {/* What's stored */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid var(--border)',
        overflow: 'hidden', marginBottom: 20,
        boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
      }}>
        <div style={{
          padding: '14px 22px', background: 'var(--surface2)',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Data Inventory
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
            Every data point Trinetra touches — and what happens to it
          </p>
        </div>

        {dataItems.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 22px',
            borderBottom: i < dataItems.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: item.stored ? '#EEF2FF' : '#ECFDF5',
              border: `1px solid ${item.stored ? '#C7D2FE' : '#A7F3D0'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: item.stored ? '#4361EE' : '#047857',
            }}>
              {item.stored ? 'ST' : '✓'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{item.note}</p>
            </div>
            <div style={{
              padding: '3px 10px', borderRadius: 20, flexShrink: 0,
              background: item.stored ? '#EEF2FF' : '#ECFDF5',
              border: `1px solid ${item.stored ? '#C7D2FE' : '#A7F3D0'}`,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: item.stored ? '#4361EE' : '#047857',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {item.stored ? 'Stored' : 'Not stored'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Current live signals stored */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid var(--border)',
        overflow: 'hidden', marginBottom: 20,
        boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
      }}>
        <div style={{
          padding: '14px 22px', background: 'var(--surface2)',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Current Profile Data
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
            Statistical summaries stored for your behavioral profile — {signals.filter(s => s.baseline !== null).length > 0 ? `${signals.filter(s => s.baseline !== null).length * 2} numbers total` : 'Profile not yet built'}
          </p>
        </div>

        <div style={{ padding: '16px 22px' }}>
          {signals.filter(s => s.baseline !== null).length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '20px 0' }}>
              No profile data yet — complete the enrollment phase first.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {signals.filter(s => s.baseline !== null).map((sig) => (
                <div key={sig.key} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 6 }}>
                    {sig.label}
                  </p>
                  <p style={{
                    fontSize: 16, fontWeight: 800, color: 'var(--text)',
                    fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em',
                  }}>
                    {sig.baseline?.toFixed(1)}
                    <span style={{ fontSize: 10, fontWeight: 500, marginLeft: 3, color: 'var(--text3)' }}>
                      {sig.unit} avg
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Your rights */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid var(--border)',
        overflow: 'hidden', marginBottom: 20,
        boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
      }}>
        <div style={{
          padding: '14px 22px', background: 'var(--surface2)',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Your Rights — DPDPA 2023</h2>
        </div>

        {rights.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 16,
            padding: '14px 22px',
            borderBottom: i < rights.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.right}</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>{r.desc}</p>
            </div>
            <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
              <span style={{
                fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                color: 'var(--text3)',
              }}>
                {r.section}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
        Quick toggle is also under{' '}
        <Link href="/banking/settings" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Settings
        </Link>
        .
      </p>

      <DeviceRecognitionPanel />

      {/* Consent toggle + delete */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: deleted ? '1px solid #A7F3D0' : '1px solid #FECACA',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
      }}>
        <div style={{
          padding: '14px 22px',
          background: deleted ? '#ECFDF5' : '#FEF2F2',
          borderBottom: `1px solid ${deleted ? '#A7F3D0' : '#FECACA'}`,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: deleted ? '#047857' : '#B91C1C' }}>
            {deleted ? 'Profile Deleted' : 'Delete Behavioral Profile'}
          </h2>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {deleted ? (
            <p style={{ fontSize: 13, color: '#047857', lineHeight: 1.6 }}>
              Your behavioral profile has been permanently deleted. Trinetra will rebuild
              it from scratch on your next session. This action cannot be undone.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
                Permanently delete all behavioral data associated with your account.
                Trinetra will lose your enrolled profile and restart enrollment on your next session.
                This action is irreversible.
              </p>

              {error && (
                <p style={{ fontSize: 13, color: '#B91C1C', marginBottom: 12 }}>{error}</p>
              )}

              {!showConfirm ? (
                <button
                  type="button"
                  onClick={() => { setError(null); setShowConfirm(true) }}
                  disabled={!userId || deleting}
                  style={{
                    padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    color: '#B91C1C', background: '#FEF2F2',
                    border: '1.5px solid #FECACA', cursor: userId ? 'pointer' : 'not-allowed',
                    opacity: userId ? 1 : 0.5,
                  }}
                >
                  Request Profile Deletion
                </button>
              ) : (
                <div style={{
                  padding: '16px', borderRadius: 10,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#B91C1C', marginBottom: 14 }}>
                    Are you sure? This will permanently erase your behavioral fingerprint.
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                        color: '#fff', background: '#B91C1C', border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(185,28,28,0.25)',
                        opacity: deleting ? 0.7 : 1,
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowConfirm(false); setError(null) }}
                      disabled={deleting}
                      style={{
                        padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                        color: 'var(--text2)', background: '#fff',
                        border: '1px solid var(--border)', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}