'use client'
import { useState } from 'react'
import { useSessionStore } from '@/lib/store'

function Field({
  label, value, onChange, placeholder, maxLength, type = 'text', mono = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; maxLength?: number; type?: string; mono?: boolean
}) {
  return (
    <div>
      <label className="input-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`input${mono ? ' input-mono' : ''}`}
      />
    </div>
  )
}

const TRANSFER_TYPES = ['NEFT', 'RTGS', 'IMPS', 'UPI']

export default function TransferPage() {
  const { state, score, phase } = useSessionStore()

  const [form, setForm] = useState({
    accountNumber: '', ifsc: '', name: '', amount: '', remarks: '', transferType: 'NEFT',
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
      <div className="page-header">
        <h1 className="page-title">Fund Transfer</h1>
        <p className="page-sub">Trinetra is monitoring this session in real time</p>
      </div>

      {/* Success */}
      {done && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 16px', borderRadius: 'var(--r-md)', marginBottom: 16,
          background: 'var(--green-bg)', border: '1px solid var(--green-border)',
          fontSize: 13, fontWeight: 600, color: 'var(--green)',
        }}>
          ✓ Transfer initiated. Reference: TXN{Date.now().toString().slice(-8)}
        </div>
      )}

      {/* Blocked */}
      {blocked && (
        <div style={{
          padding: '11px 16px', borderRadius: 'var(--r-md)', marginBottom: 16,
          background: 'var(--red-bg)', border: '1px solid var(--red-border)',
          fontSize: 13, fontWeight: 500, color: 'var(--red)',
        }}>
          Transfers are blocked. Complete the identity verification above.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── FORM ── */}
        <div className="card-lg" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 22, fontFamily: 'var(--font-body)' }}>
            Beneficiary & Transfer Details
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Transfer mode */}
              <div>
                <label className="input-label">Transfer Mode</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TRANSFER_TYPES.map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => setForm({ ...form, transferType: t })}
                      style={{
                        padding: '7px 16px', borderRadius: 'var(--r-sm)',
                        fontSize: 12, fontWeight: 600,
                        background: form.transferType === t ? 'var(--primary)' : 'var(--surface2)',
                        color: form.transferType === t ? '#fff' : 'var(--text2)',
                        border: `1.5px solid ${form.transferType === t ? 'var(--primary)' : 'var(--border)'}`,
                        cursor: 'pointer', transition: 'all var(--t)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field
                  label="Account Number" value={form.accountNumber} mono
                  onChange={(v) => setForm({ ...form, accountNumber: v.replace(/\D/g, '') })}
                  placeholder="12-digit number" maxLength={12}
                />
                <Field
                  label="IFSC Code" value={form.ifsc} mono
                  onChange={(v) => setForm({ ...form, ifsc: v.toUpperCase() })}
                  placeholder="e.g. SBIN0001234" maxLength={11}
                />
              </div>

              <Field
                label="Beneficiary Name" value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Full name as per bank records"
              />

              {/* Amount */}
              <div>
                <label className="input-label">Amount</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 18, fontWeight: 700, color: 'var(--text2)',
                  }}>₹</span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    style={{
                      width: '100%', padding: '13px 14px 13px 34px',
                      borderRadius: 'var(--r)', fontSize: 22, fontWeight: 800,
                      color: 'var(--text)', fontFamily: 'var(--font-mono)',
                      background: 'var(--surface)', border: '1.5px solid var(--border)',
                      letterSpacing: '-0.02em',
                    }}
                  />
                </div>
              </div>

              <Field
                label="Remarks (optional)" value={form.remarks}
                onChange={(v) => setForm({ ...form, remarks: v })}
                placeholder="Purpose of transfer"
              />

              <div className="divider" />

              <button
                type="submit"
                disabled={blocked}
                className="btn btn-primary"
                style={{
                  width: '100%', padding: '14px', fontSize: 15,
                  background: blocked ? 'var(--red-border)' : 'var(--primary)',
                  cursor: blocked ? 'not-allowed' : 'pointer',
                }}
              >
                {blocked
                  ? 'Transfer Blocked — Verify Identity'
                  : phase === 'enrolling'
                    ? `Transfer via ${form.transferType} (profile learning)`
                    : `Transfer via ${form.transferType}`}
              </button>
            </div>
          </form>
        </div>

        {/* ── SIDE PANEL ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Trust Score */}
          <div className="card-md" style={{ padding: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
              Trinetra Trust Score
            </p>

            <div style={{ textAlign: 'center', padding: '6px 0 14px' }}>
              <p style={{
                fontSize: 52, fontWeight: 800, fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.04em', lineHeight: 1,
                color: blocked ? 'var(--red)' : score > 58 ? 'var(--green)' : 'var(--yellow)',
              }}>
                {score.toFixed(0)}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>out of 100</p>
            </div>

            {/* Bar */}
            <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${score}%`,
                background: blocked ? 'var(--red)' : score > 58 ? 'var(--green)' : 'var(--yellow)',
                transition: 'width 0.5s ease',
              }} />
            </div>

            <p style={{ fontSize: 12, textAlign: 'center', fontWeight: 500, color: blocked ? 'var(--red)' : 'var(--text2)' }}>
              {phase === 'enrolling'
                ? 'Building behavioral profile…'
                : blocked
                  ? 'High-risk session — transfers blocked'
                  : 'Identity verified — transfers permitted'}
            </p>
          </div>

          {/* Transfer Limits */}
          <div className="card-md" style={{ padding: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
              Transfer Limits
            </p>
            {[
              { label: 'Daily Limit',     value: '₹5,00,000' },
              { label: 'Per Transaction', value: '₹2,00,000' },
              { label: 'Used Today',      value: '₹7,340'    },
              { label: 'Remaining',       value: '₹4,92,660' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}