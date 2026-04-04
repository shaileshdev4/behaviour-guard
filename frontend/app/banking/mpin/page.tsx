'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/lib/store'

export default function MPINPage() {
  const router = useRouter()
  const { score, state } = useSessionStore()
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...pin]
    next[index] = value
    setPin(next)
    if (value && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus()
    }
  }

  const handleConfirm = () => {
    const entered = pin.join('')
    if (entered.length < 6) {
      setError('Enter all 6 digits')
      return
    }
    setSuccess(true)
    setTimeout(() => router.push('/banking/transfer'), 1500)
  }

  const statusStyle =
    state === 'green'
      ? { bg: 'var(--green-bg)', border: 'var(--green-border)', fg: 'var(--green)', dot: 'var(--green)' }
      : state === 'yellow'
        ? { bg: 'var(--yellow-bg)', border: 'var(--yellow-border)', fg: 'var(--yellow)', dot: 'var(--yellow)' }
        : { bg: 'var(--red-bg)', border: 'var(--red-border)', fg: 'var(--red)', dot: 'var(--red)' }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #1B2059, #4361EE)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 24, color: '#fff' }}>⬡</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--primary)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          Enter your MPIN
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
          Trinetra verifies your identity through how you type your PIN — not just the digits themselves.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 10,
          marginBottom: 28,
          background: statusStyle.bg,
          border: `1px solid ${statusStyle.border}`,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            background: statusStyle.dot,
          }}
        />
        <p style={{ fontSize: 12, fontWeight: 600, color: statusStyle.fg }}>
          Trinetra — Trust score {score.toFixed(0)}/100 · Monitoring keystrokes
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '28px 24px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px rgba(15,18,41,0.07)',
        }}
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                margin: '0 auto 14px',
                background: 'var(--green-bg)',
                border: '2px solid var(--green-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              ✓
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>MPIN verified</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Redirecting to transfer...</p>
          </div>
        ) : (
          <>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text2)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              6-Digit MPIN
            </p>

            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              {pin.map((digit, i) => (
                <input
                  key={i}
                  id={`pin-${i}`}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoComplete="one-time-code"
                  style={{
                    width: 48,
                    height: 56,
                    borderRadius: 10,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    border: `1.5px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                    background: digit ? 'var(--primary-light)' : 'var(--surface)',
                    color: 'var(--primary)',
                    outline: 'none',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>

            {error && (
              <p
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  color: 'var(--red)',
                  marginBottom: 16,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              style={{
                width: '100%',
                padding: '13px',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(30,58,138,0.25)',
              }}
            >
              Confirm MPIN
            </button>

            <p
              style={{
                textAlign: 'center',
                fontSize: 11,
                color: 'var(--text3)',
                marginTop: 12,
              }}
            >
              For this demo, any 6 digits work
            </p>
          </>
        )}
      </div>

      <div
        style={{
          marginTop: 20,
          padding: '14px 18px',
          borderRadius: 10,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>
          <strong style={{ color: 'var(--text)' }}>Why MPIN entry matters for Trinetra:</strong> You always type
          your 6-digit PIN the same way — same rhythm, same speed, same pauses. This creates one of the most
          stable behavioral signals of any banking interaction. Trinetra captures this silently.
        </p>
      </div>
    </div>
  )
}
