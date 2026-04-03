'use client'
import { useState } from 'react'

const TRANSACTIONS = [
  { id: 'TXN20240403001', name: 'Swiggy Technologies Pvt Ltd',  ref: 'UPI/240403/8821', amount: 450,    credit: false, date: 'Apr 3, 2026', time: '1:23 PM',  mode: 'UPI'  },
  { id: 'TXN20240402001', name: 'HDFC Corp — Salary',           ref: 'NEFT/240402/892', amount: 85000,  credit: true,  date: 'Apr 2, 2026', time: '9:00 AM',  mode: 'NEFT' },
  { id: 'TXN20240402002', name: 'Amazon Seller Services',       ref: 'UPI/240402/441',  amount: 2340,   credit: false, date: 'Apr 2, 2026', time: '3:14 PM',  mode: 'UPI'  },
  { id: 'TXN20240401001', name: 'Netflix India Pvt Ltd',        ref: 'ECS/240401/002',  amount: 649,    credit: false, date: 'Apr 1, 2026', time: '12:00 AM', mode: 'ECS'  },
  { id: 'TXN20240331001', name: 'UPI Transfer — Raj Kumar',     ref: 'UPI/240331/778',  amount: 5000,   credit: false, date: 'Mar 31, 2026', time: '4:30 PM', mode: 'UPI'  },
  { id: 'TXN20240330001', name: 'Freelance — Client Payment',   ref: 'IMPS/240330/334', amount: 12000,  credit: true,  date: 'Mar 30, 2026', time: '11:30 AM',mode: 'IMPS' },
  { id: 'TXN20240328001', name: 'Zepto Quick Commerce',         ref: 'UPI/240328/019',  amount: 340,    credit: false, date: 'Mar 28, 2026', time: '8:45 PM',  mode: 'UPI'  },
]

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function HistoryPage() {
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all')

  const filtered = TRANSACTIONS.filter(t =>
    filter === 'all' ? true : filter === 'credit' ? t.credit : !t.credit
  )

  const totalCredit = TRANSACTIONS.filter(t => t.credit).reduce((s, t) => s + t.amount, 0)
  const totalDebit  = TRANSACTIONS.filter(t => !t.credit).reduce((s, t) => s + t.amount, 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Transaction History
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            April 2026 · Savings Account •••• 4821
          </p>
        </div>

        {/* Filter */}
        <div style={{
          display: 'flex', gap: 4, padding: 4, borderRadius: 10,
          background: 'var(--surface)', border: '1px solid var(--border)',
        }}>
          {(['all', 'credit', 'debit'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.15s',
                background: filter === f ? 'var(--primary)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--text2)',
                border: 'none',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Money In',   value: `₹${fmt(totalCredit)}`,             color: 'var(--green)' },
          { label: 'Money Out',  value: `₹${fmt(totalDebit)}`,              color: 'var(--red)' },
          { label: 'Net',        value: `₹${fmt(totalCredit - totalDebit)}`, color: 'var(--primary)' },
        ].map((c) => (
          <div key={c.label} className="card" style={{ padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {c.label}
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: c.color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card-lg" style={{ overflow: 'hidden' }}>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.5fr 120px 80px 100px',
          padding: '12px 24px', gap: 16,
          background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
        }}>
          {['Description', 'Reference', 'Date', 'Mode', 'Amount'].map((h, i) => (
            <p key={h} style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text2)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              textAlign: i === 4 ? 'right' : 'left'
            }}>
              {h}
            </p>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((tx, i) => (
          <div
            key={tx.id}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 120px 80px 100px',
              padding: '14px 24px', gap: 16, alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            {/* Description */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 7, flexShrink: 0,
                background: tx.credit ? 'var(--green-bg)' : 'var(--surface2)',
                border: `1px solid ${tx.credit ? 'var(--green-border)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
                color: tx.credit ? 'var(--green)' : 'var(--text2)',
              }}>
                {tx.credit ? 'CR' : 'DR'}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                  {tx.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{tx.id}</p>
              </div>
            </div>

            {/* Ref */}
            <p style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'monospace' }}>
              {tx.ref}
            </p>

            {/* Date */}
            <div>
              <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{tx.date}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{tx.time}</p>
            </div>

            {/* Mode */}
            <div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                background: 'var(--surface2)', color: 'var(--text2)',
                border: '1px solid var(--border)', fontFamily: 'monospace'
              }}>
                {tx.mode}
              </span>
            </div>

            {/* Amount */}
            <p style={{
              fontSize: 14, fontWeight: 800, fontFamily: 'monospace',
              letterSpacing: '-0.02em', textAlign: 'right',
              color: tx.credit ? 'var(--green)' : 'var(--text)',
            }}>
              {tx.credit ? '+' : '-'}₹{fmt(tx.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}