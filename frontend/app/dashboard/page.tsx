'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/lib/store'
import LiveSignalFeed from '@/components/LiveSignalFeed'
import EnrollmentCard from '@/components/EnrollmentCard'

const TRANSACTIONS = [
  { name: 'Swiggy Technologies',  ref: 'UPI/240403/123',  amount: '450.00',    credit: false, date: 'Today, 1:23 PM'  },
  { name: 'Salary — HDFC Corp',   ref: 'NEFT/240402/892', amount: '85,000.00', credit: true,  date: 'Apr 2, 09:00 AM' },
  { name: 'Amazon Seller Svcs',   ref: 'UPI/240402/441',  amount: '2,340.00',  credit: false, date: 'Apr 2, 3:14 PM'  },
  { name: 'Netflix India',        ref: 'ECS/240401/002',  amount: '649.00',    credit: false, date: 'Apr 1, 12:00 AM' },
  { name: 'UPI Transfer — Raj',   ref: 'UPI/240331/778',  amount: '5,000.00',  credit: false, date: 'Mar 31, 4:30 PM' },
]

function TierBar({ label, sub, value }: { label: string; sub: string; value: number | null }) {
  const pct = value == null ? 0 : Math.min(100, Math.max(0, Math.round(value * 100)))
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
          {value == null ? '—' : `${pct}%`}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 3,
          background: 'linear-gradient(90deg, var(--accent), var(--cyan))',
          transition: 'width 0.4s ease',
        }} />
      </div>
      <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{sub}</p>
    </div>
  )
}

const STATE_CFG = {
  green:  { bg: 'var(--green-bg)',  border: 'var(--green-border)',  color: 'var(--green)',  dot: 'var(--green-dot)',  label: 'Identity continuously verified'    },
  yellow: { bg: 'var(--yellow-bg)', border: 'var(--yellow-border)', color: 'var(--yellow)', dot: 'var(--yellow-dot)', label: 'Behavioral anomaly — monitoring'    },
  red:    { bg: 'var(--red-bg)',    border: 'var(--red-border)',    color: 'var(--red)',    dot: 'var(--red-dot)',    label: 'Verification required'              },
}

export default function Dashboard() {
  const router = useRouter()
  const { score, state, phase, tierScores, cohortId } = useSessionStore()
  const cfg = STATE_CFG[state as keyof typeof STATE_CFG] ?? STATE_CFG.green

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

      {/* ── MAIN COLUMN ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Enrollment card — only during enrolling */}
        <EnrollmentCard />

        {/* ML tier scores */}
        {tierScores && (
          <div className="card" style={{ padding: '16px 18px' }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14,
            }}>
              Behavioral Models — Live
            </p>
            <TierBar label="Population"  sub="One-Class SVM · human vs bot"           value={tierScores.population} />
            <TierBar label="Cohort"      sub="Gaussian Mixture · typing-speed group"  value={tierScores.cohort} />
            <TierBar label="Individual"  sub="Isolation Forest · your enrolled profile" value={tierScores.individual} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span className="badge badge-ghost">Day {tierScores.trust_day}</span>
              <span className="badge badge-ghost">
                {tierScores.cohort_id ?? cohortId ?? 'Assigning cohort…'}
              </span>
            </div>
          </div>
        )}

        {/* Trinetra status bar — active only */}
        {phase === 'active' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 'var(--r-md)',
            background: cfg.bg, border: `1px solid ${cfg.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: cfg.dot, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
                  Verified every 10 seconds · No action needed
                </p>
              </div>
            </div>
            <p style={{
              fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.04em', color: cfg.color, flexShrink: 0,
            }}>
              {score.toFixed(0)}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginLeft: 2 }}>/100</span>
            </p>
          </div>
        )}

        {/* Search bar — keystroke collection surface */}
        <div className="card" style={{
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16, color: 'var(--text3)' }}>⌕</span>
          <input
            type="text"
            placeholder="Search transactions, payees, IFSC codes…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text)', background: 'transparent',
            }}
          />
        </div>

        {/* Quick Pay — more typing surface */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', background: 'var(--surface2)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              Quick Pay
            </h3>
            <span className="badge badge-blue">Trinetra active</span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="UPI ID or account number"
              style={{
                flex: 1, minWidth: 160,
                padding: '9px 12px', borderRadius: 'var(--r)',
                fontSize: 13, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', outline: 'none',
              }}
            />
            <input
              type="number"
              placeholder="₹ Amount"
              style={{
                width: 120, padding: '9px 12px', borderRadius: 'var(--r)',
                fontSize: 13, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => router.push('/banking/transfer')}
              className="btn btn-primary"
              style={{ padding: '9px 18px', fontSize: 13 }}
            >
              Pay
            </button>
          </div>
        </div>

        {/* Account cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Savings */}
          <div style={{
            background: 'linear-gradient(140deg, var(--primary) 0%, var(--primary-mid) 60%, var(--accent) 100%)',
            borderRadius: 'var(--r-lg)', padding: '20px 22px',
            boxShadow: '0 8px 28px rgba(27,32,89,0.28)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', bottom: -28, right: -28,
              width: 110, height: 110, borderRadius: 55,
              background: 'rgba(255,255,255,0.05)',
            }} />
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Savings Account
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: '4px 0 16px', fontFamily: 'var(--font-mono)' }}>
              •••• •••• 4821
            </p>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
              ₹2,34,580.00
            </p>
            <p style={{ fontSize: 11, color: '#86EFAC', marginTop: 6 }}>+₹85,000.00 credited today</p>
          </div>

          {/* Fixed Deposit */}
          <div className="card-md" style={{ padding: '20px 22px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fixed Deposit
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: '4px 0 16px', fontFamily: 'var(--font-mono)' }}>
              FD-2024-0093
            </p>
            <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
              ₹5,00,000.00
            </p>
            <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 6 }}>8.25% p.a. · Matures Apr 2025</p>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Fund Transfer', href: '/banking/transfer' },
            { label: 'Transactions',  href: '/banking/history'  },
            { label: 'Privacy',       href: '/banking/privacy'  },
          ].map((a) => (
            <Link key={a.label} href={a.href} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 16px', borderRadius: 'var(--r-md)',
              textDecoration: 'none', background: 'var(--surface)',
              border: '1px solid var(--border)',
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              boxShadow: '0 1px 3px rgba(15,18,41,0.05)',
              transition: 'all var(--t)',
            }}>
              {a.label}
              <span style={{ color: 'var(--text3)', fontSize: 16 }}>›</span>
            </Link>
          ))}
        </div>

        {/* Recent Transactions */}
        <div className="card-md" style={{ overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              Recent Transactions
            </h2>
            <Link href="/banking/history" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {TRANSACTIONS.map((tx, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center',
              padding: '12px 20px', gap: 14,
              borderBottom: i < TRANSACTIONS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
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
                  fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono)',
                  letterSpacing: '-0.02em',
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

      {/* ── SIDEBAR ── */}
      <div style={{ position: 'sticky', top: 72 }}>
        <LiveSignalFeed compact />
      </div>
    </div>
  )
}