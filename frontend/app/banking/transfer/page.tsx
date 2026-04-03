'use client'
import { useState } from 'react'
import { useSessionStore } from '@/lib/store'

/** Must live outside the page: an inner component is recreated every render and remounts inputs (focus loss). */
function InputField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
  mono = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  maxLength?: number
  type?: string
  mono?: boolean
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text2)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          width: '100%',
          padding: '11px 14px',
          borderRadius: 8,
          fontSize: 14,
          color: 'var(--text)',
          fontFamily: mono ? 'monospace' : 'inherit',
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          transition: 'all 0.15s',
        }}
      />
    </div>
  )
}

export default function TransferPage() {
  const { state, score, phase } = useSessionStore()

  const [form, setForm] = useState({
    accountNumber: '', ifsc: '', name: '', amount: '', remarks: '', transferType: 'NEFT'
  })
  const [done, setDone] = useState(false)

  const blocked = state === 'red'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (blocked) return
    setDone(true)
    setForm({ accountNumber: '', ifsc: '', name: '', amount: '', remarks: '', transferType: 'NEFT' })
    setTimeout(() => setDone(false), 4000)
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Fund Transfer
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          Imprint is monitoring this session in real time
        </p>
      </div>

      {done && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: 'var(--green-bg)', border: '1px solid var(--green-border)',
          fontSize: 13, fontWeight: 600, color: 'var(--green)'
        }}>
          <span style={{ fontSize: 16 }}>&#10003;</span>
          Transfer initiated successfully. Reference ID: TXN{Date.now().toString().slice(-8)}
        </div>
      )}

      {blocked && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: 'var(--red-bg)', border: '1px solid var(--red-border)',
          fontSize: 13, fontWeight: 500, color: 'var(--red)'
        }}>
          Transfers are blocked. Complete the identity verification prompted above.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* Form */}
        <div className="card-lg" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>
            Beneficiary & Transfer Details
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Transfer type */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8
                }}>
                  Transfer Mode
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['NEFT', 'RTGS', 'IMPS', 'UPI'].map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => setForm({ ...form, transferType: t })}
                      style={{
                        padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        background: form.transferType === t ? 'var(--primary)' : 'var(--surface2)',
                        color: form.transferType === t ? '#fff' : 'var(--text2)',
                        border: `1.5px solid ${form.transferType === t ? 'var(--primary)' : 'var(--border)'}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <InputField
                  label="Account Number"
                  value={form.accountNumber}
                  onChange={(v) => setForm({ ...form, accountNumber: v.replace(/\D/g, '') })}
                  placeholder="Enter 12-digit number"
                  maxLength={12} mono
                />
                <InputField
                  label="IFSC Code"
                  value={form.ifsc}
                  onChange={(v) => setForm({ ...form, ifsc: v.toUpperCase() })}
                  placeholder="e.g. SBIN0001234"
                  maxLength={11} mono
                />
              </div>

              <InputField
                label="Beneficiary Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Full name as per bank records"
              />

              {/* Amount — prominent */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6
                }}>
                  Amount
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 18, fontWeight: 700, color: 'var(--text2)'
                  }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    style={{
                      width: '100%', padding: '14px 14px 14px 34px',
                      borderRadius: 8, fontSize: 22, fontWeight: 800,
                      color: 'var(--text)', fontFamily: 'monospace',
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border)',
                      letterSpacing: '-0.02em',
                    }}
                  />
                </div>
              </div>

              <InputField
                label="Remarks (optional)"
                value={form.remarks}
                onChange={(v) => setForm({ ...form, remarks: v })}
                placeholder="Purpose of transfer"
              />

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)' }} />

              <button
                type="submit"
                disabled={blocked}
                style={{
                  width: '100%', padding: '14px',
                  background: blocked ? '#FCA5A5' : 'var(--primary)',
                  color: '#fff', border: 'none', borderRadius: 9,
                  fontSize: 15, fontWeight: 700, cursor: blocked ? 'not-allowed' : 'pointer',
                  letterSpacing: '-0.01em',
                  boxShadow: blocked ? 'none' : '0 4px 14px rgba(30,58,138,0.3)',
                  transition: 'all 0.15s',
                }}
              >
                {blocked
                  ? 'Transfer Blocked — Verify Identity'
                  : phase === 'enrolling'
                    ? `Transfer via ${form.transferType} (profile still learning)`
                    : `Transfer via ${form.transferType}`}
              </button>
            </div>
          </form>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Trust score */}
          <div className="card-lg" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Imprint Trust Score
            </p>

            {/* Score ring area */}
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <p style={{
                fontSize: 52, fontWeight: 800, fontFamily: 'monospace',
                letterSpacing: '-0.04em', lineHeight: 1,
                color: blocked ? 'var(--red)' : score > 55 ? 'var(--green)' : 'var(--yellow)',
              }}>
                {score.toFixed(0)}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>out of 100</p>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
                width: `${score}%`,
                background: blocked
                  ? 'var(--red)'
                  : score > 55
                    ? 'var(--green)'
                    : 'var(--yellow)',
              }} />
            </div>

            <p style={{
              fontSize: 12, textAlign: 'center', fontWeight: 500,
              color: blocked ? 'var(--red)' : 'var(--text2)'
            }}>
              {phase === 'enrolling'
                ? 'Building behavioral profile...'
                : blocked
                  ? 'High-risk session — transfers blocked'
                  : 'Identity verified — transfers permitted'}
            </p>
          </div>

          {/* Transfer limits */}
          <div className="card-lg" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Transfer Limits
            </p>
            {[
              { label: 'Daily Limit',      value: '₹5,00,000' },
              { label: 'Per Transaction',  value: '₹2,00,000' },
              { label: 'Used Today',       value: '₹7,340' },
              { label: 'Remaining',        value: '₹4,92,660' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}