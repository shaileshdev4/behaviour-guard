'use client'
import Link from 'next/link'
import { useSessionStore } from '@/lib/store'
import LiveSignalFeed from '@/components/LiveSignalFeed'
import EnrollmentCard from '@/components/EnrollmentCard'

const TRANSACTIONS = [
  { name: 'Swiggy Technologies',  ref: 'UPI/240403/123',  amount: '450.00',    credit: false, date: 'Today, 1:23 PM'   },
  { name: 'Salary — HDFC Corp',   ref: 'NEFT/240402/892', amount: '85,000.00', credit: true,  date: 'Apr 2, 09:00 AM'  },
  { name: 'Amazon Seller Svcs',   ref: 'UPI/240402/441',  amount: '2,340.00',  credit: false, date: 'Apr 2, 3:14 PM'   },
  { name: 'Netflix India',        ref: 'ECS/240401/002',  amount: '649.00',    credit: false, date: 'Apr 1, 12:00 AM'  },
  { name: 'UPI Transfer — Raj',   ref: 'UPI/240331/778',  amount: '5,000.00',  credit: false, date: 'Mar 31, 4:30 PM'  },
]

function tierBar(label: string, sub: string, v: number | null) {
  const pct = v == null ? 0 : Math.min(100, Math.max(0, Math.round(v * 100)))
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
          {v == null ? '—' : `${pct}%`}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          borderRadius: 3,
          background: 'linear-gradient(90deg, #4361EE, #7C9DFF)',
          transition: 'width 0.35s ease',
        }} />
      </div>
      <p style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{sub}</p>
    </div>
  )
}

export default function Dashboard() {
  const { score, state, phase, tierScores, cohortId } = useSessionStore()

  const stateCfg = {
    green:  { bg: 'var(--green-bg)',  border: 'var(--green-border)',  color: 'var(--green)',  dot: '#10B981', label: 'Identity continuously verified' },
    yellow: { bg: 'var(--yellow-bg)', border: 'var(--yellow-border)', color: 'var(--yellow)', dot: '#F59E0B', label: 'Behavioral anomaly — monitoring' },
    red:    { bg: 'var(--red-bg)',    border: 'var(--red-border)',    color: 'var(--red)',    dot: '#EF4444', label: 'Verification required' },
  }[state] ?? { bg: '#EEF2FF', border: '#C7D2FE', color: '#4361EE', dot: '#4361EE', label: '' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

      {/* Main column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Enrollment card — shows only during enrolling */}
        <EnrollmentCard />

        {/* ML tiers — population SVM, cohort GMM, individual IF (from backend) */}
        {tierScores && (
          <div style={{
            background: '#fff', borderRadius: 12, padding: '16px 18px',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
          }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text2)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}>
              Behavioral models (live)
            </p>
            {tierBar('Population', 'One-Class SVM — human vs bot / outlier', tierScores.population)}
            {tierBar('Cohort', 'Gaussian mixture — typing-speed peer group', tierScores.cohort)}
            {tierBar('Individual', 'Isolation Forest — your enrolled profile', tierScores.individual)}
            <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 10, lineHeight: 1.45 }}>
              Fusion schedule: <strong style={{ color: 'var(--text2)' }}>day {tierScores.trust_day}</strong>
              {' · '}
              Cohort:{' '}
              <strong style={{ color: 'var(--text2)' }}>
                {tierScores.cohort_id ?? cohortId ?? 'assigning…'}
              </strong>
            </p>
          </div>
        )}

        {/* Imprint status — shows only when active */}
        {phase === 'active' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderRadius: 10,
            background: stateCfg.bg, border: `1px solid ${stateCfg.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: stateCfg.dot }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: stateCfg.color }}>
                  Imprint — {stateCfg.label}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
                  Your session is verified every 5 seconds. No action needed.
                </p>
              </div>
            </div>
            <p style={{
              fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.04em', color: stateCfg.color,
              flexShrink: 0,
            }}>
              {score.toFixed(0)}
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginLeft: 2 }}>/100</span>
            </p>
          </div>
        )}

        {/* Account cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{
            background: 'linear-gradient(140deg, #1B2059 0%, #2D3A8C 60%, #4361EE 100%)',
            borderRadius: 16, padding: '22px 24px',
            boxShadow: '0 8px 28px rgba(27,32,89,0.28)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', bottom: -30, right: -30,
              width: 120, height: 120, borderRadius: 60,
              background: 'rgba(255,255,255,0.06)',
            }} />
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Savings Account
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, marginBottom: 18, fontFamily: 'var(--font-mono)' }}>
              •••• •••• 4821
            </p>
            <p style={{
              fontSize: 28, fontWeight: 800, color: '#fff',
              fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em',
            }}>
              ₹2,34,580.00
            </p>
            <p style={{ fontSize: 11, color: '#86EFAC', marginTop: 6 }}>
              +₹85,000.00 credited today
            </p>
          </div>

          <div style={{
            background: '#fff', borderRadius: 16, padding: '22px 24px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(15,18,41,0.07)',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fixed Deposit
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, marginBottom: 18, fontFamily: 'var(--font-mono)' }}>
              FD-2024-0093
            </p>
            <p style={{
              fontSize: 28, fontWeight: 800, color: 'var(--text)',
              fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em',
            }}>
              ₹5,00,000.00
            </p>
            <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 6 }}>
              8.25% p.a. · Matures Apr 2025
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Fund Transfer', href: '/banking/transfer' },
            { label: 'Transactions',  href: '/banking/history' },
            { label: 'Privacy',       href: '/banking/privacy' },
          ].map((a) => (
            <Link key={a.label} href={a.href} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 18px', borderRadius: 10, textDecoration: 'none',
              background: '#fff', border: '1px solid var(--border)',
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              boxShadow: '0 1px 3px rgba(15,18,41,0.05)',
            }}>
              {a.label}
              <span style={{ color: 'var(--text3)', fontSize: 16 }}>›</span>
            </Link>
          ))}
        </div>

        {/* Transactions */}
        <div style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '15px 22px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Recent Transactions</h2>
            <Link href="/banking/history" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
              View All
            </Link>
          </div>

          {TRANSACTIONS.map((tx, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', padding: '13px 22px', gap: 14,
              borderBottom: i < TRANSACTIONS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: tx.credit ? 'var(--green-bg)' : 'var(--surface2)',
                border: `1px solid ${tx.credit ? 'var(--green-border)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
                color: tx.credit ? 'var(--green)' : 'var(--text2)',
              }}>
                {tx.credit ? 'CR' : 'DR'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>
                  {tx.ref}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{
                  fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em',
                  color: tx.credit ? 'var(--green)' : 'var(--text)',
                }}>
                  {tx.credit ? '+' : '-'}₹{tx.amount}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{tx.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right sidebar — live signals */}
      <div style={{ position: 'sticky', top: 72 }}>
        <LiveSignalFeed compact />
      </div>
    </div>
  )
}