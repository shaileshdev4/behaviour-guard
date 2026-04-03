'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/* ── Enhanced animated score card — ambient rings + 2×2 signals ── */
function HeroCard() {
  const [score, setScore] = useState(0)
  const [signals, setSignals] = useState([
    { label: 'Dwell Time',  value: null as number | null, unit: 'ms',   ok: true },
    { label: 'Key Rhythm',  value: null as number | null, unit: 'ms',   ok: true },
    { label: 'Nav Pattern', value: null as number | null, unit: '%',    ok: true },
    { label: 'Entropy',     value: null as number | null, unit: 'bits', ok: true },
  ])
  const [phase, setPhase] = useState<'idle'|'enrolling'|'active'|'alert'>('idle')
  const [alertMsg, setAlertMsg] = useState('')
  const enrollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('enrolling')
      let p = 0
      enrollRef.current = setInterval(() => {
        p += 8
        setScore(Math.min(p, 100))
        if (p >= 100) {
          if (enrollRef.current) clearInterval(enrollRef.current)
          enrollRef.current = null
          setPhase('active')
          setScore(91)
          setSignals([
            { label: 'Dwell Time',  value: 82,  unit: 'ms',   ok: true },
            { label: 'Key Rhythm',  value: 143, unit: 'ms',   ok: true },
            { label: 'Nav Pattern', value: 94,  unit: '%',    ok: true },
            { label: 'Entropy',     value: 2.4, unit: 'bits', ok: true },
          ])

          setTimeout(() => {
            setPhase('alert')
            setScore(14)
            setSignals([
              { label: 'Dwell Time',  value: 218, unit: 'ms',   ok: false },
              { label: 'Key Rhythm',  value: 390, unit: 'ms',   ok: false },
              { label: 'Nav Pattern', value: 28,  unit: '%',    ok: false },
              { label: 'Entropy',     value: 4.9, unit: 'bits', ok: false },
            ])
            setAlertMsg('Impostor detected — re-authentication triggered')

            setTimeout(() => {
              setPhase('active')
              setScore(88)
              setAlertMsg('')
              setSignals([
                { label: 'Dwell Time',  value: 79,  unit: 'ms',   ok: true },
                { label: 'Key Rhythm',  value: 138, unit: 'ms',   ok: true },
                { label: 'Nav Pattern', value: 96,  unit: '%',    ok: true },
                { label: 'Entropy',     value: 2.3, unit: 'bits', ok: true },
              ])
            }, 3500)
          }, 3500)
        }
      }, 90)
    }, 600)
    return () => {
      clearTimeout(t1)
      if (enrollRef.current) clearInterval(enrollRef.current)
    }
  }, [])

  const isAlert  = phase === 'alert'
  const isActive = phase === 'active'
  const isProg   = phase === 'enrolling'

  const scoreColor = isAlert ? '#DC2626' : isActive ? '#059669' : '#4361EE'
  const ringColor  = isAlert
    ? 'rgba(220,38,38,0.12)'
    : isActive
      ? 'rgba(5,150,105,0.1)'
      : 'rgba(67,97,238,0.1)'

  return (
    <div style={{ position: 'relative', width: 360 }}>

      {/* Ambient glow rings — fingerprint metaphor */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 360 + i * 72,
            height: 360 + i * 72,
            borderRadius: '50%',
            border: `1px solid ${ringColor}`,
            transition: 'border-color 0.6s ease',
            pointerEvents: 'none',
            animation: `hero-ring-pulse ${5 + i * 0.6}s ease-in-out infinite`,
            animationDelay: `${i * 0.35}s`,
          }}
        />
      ))}

      {/* Central dot */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 8, height: 8, borderRadius: 4,
        background: scoreColor,
        boxShadow: `0 0 16px 4px ${scoreColor}40`,
        transition: 'all 0.5s ease',
        zIndex: 0,
      }} />

      {/* The card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#fff',
        borderRadius: 20,
        border: `1px solid ${isAlert ? '#FECACA' : isActive ? '#A7F3D0' : 'var(--border)'}`,
        boxShadow: isAlert
          ? '0 32px 64px rgba(220,38,38,0.15), 0 4px 16px rgba(220,38,38,0.08)'
          : isActive
            ? '0 32px 64px rgba(5,150,105,0.12), 0 4px 16px rgba(15,18,41,0.08)'
            : '0 32px 64px rgba(15,18,41,0.14), 0 4px 16px rgba(15,18,41,0.08)',
        transition: 'all 0.5s ease',
        overflow: 'hidden',
      }}>

        {/* Accent top bar */}
        <div style={{
          height: 3,
          background: isAlert
            ? 'linear-gradient(90deg, #DC2626, #EF4444)'
            : isActive
              ? 'linear-gradient(90deg, #059669, #10B981)'
              : isProg
                ? 'linear-gradient(90deg, #4361EE, #818CF8, #06B6D4)'
                : 'transparent',
          transition: 'background 0.5s ease',
        }} />

        <div style={{ padding: '24px 26px 26px' }}>

          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 20,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: 'linear-gradient(135deg, #1B2059, #4361EE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: 3.5, background: 'rgba(255,255,255,0.9)' }} />
                </div>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14, fontWeight: 700, color: 'var(--primary)',
                  letterSpacing: '-0.01em',
                }}>
                  Imprint
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                Session · BharatBank
              </p>
            </div>

            {/* Status pill */}
            <div style={{
              padding: '5px 11px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 6,
              background: isAlert ? '#FEF2F2' : isActive ? '#ECFDF5' : '#EEF2FF',
              border: `1px solid ${isAlert ? '#FECACA' : isActive ? '#A7F3D0' : '#C7D2FE'}`,
              transition: 'all 0.4s',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: 3,
                background: scoreColor,
                animation: phase !== 'idle' ? 'pulse-dot 1.5s infinite' : 'none',
                transition: 'background 0.4s',
              }} />
              <span style={{
                fontSize: 10, fontWeight: 800,
                color: scoreColor, textTransform: 'uppercase', letterSpacing: '0.07em',
                transition: 'color 0.4s',
              }}>
                {phase === 'idle' ? 'Inactive'
                  : phase === 'enrolling' ? 'Learning'
                  : phase === 'active' ? 'Verified'
                  : 'Alert'}
              </span>
            </div>
          </div>

          {/* Score + sparkline */}
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between', marginBottom: 8,
          }}>
            <div>
              <p style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
              }}>
                Trust Score
              </p>
              <p style={{
                fontSize: 58, fontWeight: 800, lineHeight: 1,
                fontFamily: 'var(--font-mono)', letterSpacing: '-0.05em',
                color: scoreColor, transition: 'color 0.5s ease',
              }}>
                {score}
                <span style={{
                  fontSize: 18, fontWeight: 500, marginLeft: 2,
                  color: 'var(--text3)', letterSpacing: 0,
                }}>
                  /100
                </span>
              </p>
            </div>

            {/* Sparkline */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 3,
              paddingBottom: 6,
            }}>
              {([45, 58, 54, 72, 88, 91, isAlert ? 14 : 91] as number[]).map((h, i) => (
                <div key={i} style={{
                  width: 5, borderRadius: 2,
                  height: `${h * 0.44}px`,
                  background: i === 6 && isAlert ? '#EF4444' : '#4361EE',
                  opacity: 0.2 + (i * 0.115),
                  transition: 'all 0.5s ease',
                }} />
              ))}
            </div>
          </div>

          {/* Progress track */}
          <div style={{
            height: 4, borderRadius: 2,
            background: 'var(--bg2)', marginBottom: 20,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${score}%`,
              background: isAlert
                ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                : isActive
                  ? 'linear-gradient(90deg, #10B981, #059669)'
                  : 'linear-gradient(90deg, #818CF8, #4361EE, #06B6D4)',
              transition: 'width 0.7s ease, background 0.5s ease',
              boxShadow: isActive ? '0 0 8px rgba(16,185,129,0.5)' : isAlert ? '0 0 8px rgba(220,38,38,0.5)' : 'none',
            }} />
          </div>

          {/* Signals grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
            marginBottom: 16,
          }}>
            {signals.map((s) => (
              <div key={s.label} style={{
                padding: '8px 10px', borderRadius: 8,
                background: s.value === null
                  ? 'var(--surface2)'
                  : s.ok ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${
                  s.value === null ? 'var(--border)'
                    : s.ok ? '#BBF7D0' : '#FECACA'
                }`,
                transition: 'all 0.4s ease',
              }}>
                <p style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
                }}>
                  {s.label}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 13, fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: s.value === null ? 'var(--text3)' : s.ok ? '#059669' : '#DC2626',
                    letterSpacing: '-0.02em',
                    transition: 'color 0.4s',
                  }}>
                    {s.value === null ? '—' : s.value}
                  </span>
                  {s.value !== null && (
                    <span style={{
                      fontSize: 9, fontFamily: 'var(--font-mono)',
                      color: s.ok ? '#059669' : '#DC2626', opacity: 0.7,
                    }}>
                      {s.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status message */}
          <div style={{
            padding: '10px 13px', borderRadius: 9,
            background: isAlert ? '#FEF2F2' : isActive ? '#F0FDF4' : '#EEF2FF',
            border: `1px solid ${isAlert ? '#FECACA' : isActive ? '#BBF7D0' : '#C7D2FE'}`,
            transition: 'all 0.4s ease',
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600,
              color: isAlert ? '#DC2626' : isActive ? '#059669' : '#4361EE',
              transition: 'color 0.4s',
            }}>
              {alertMsg || (
                isActive ? 'Identity continuously verified — session secure'
                  : isProg ? `Building behavioral fingerprint... ${score}%`
                  : 'Initializing Imprint Auth...'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main landing page ── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div style={{ background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(247,249,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all 0.25s',
      }}>
        <div style={{
          maxWidth: 1160, margin: '0 auto', padding: '0 32px',
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #1B2059, #4361EE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(67,97,238,0.35)',
            }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.9)' }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22, fontWeight: 700,
              color: 'var(--primary)',
              letterSpacing: '-0.02em',
            }}>
              Imprint
            </span>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {['How It Works', 'Technology', 'Privacy'].map((n) => (
              <a key={n} href={`#${n.toLowerCase().replace(/ /g, '-')}`} style={{
                fontSize: 14, fontWeight: 500, color: 'var(--text2)',
                textDecoration: 'none', transition: 'color 0.15s',
              }}>
                {n}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/dashboard" target="_blank" style={{
              padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              color: 'var(--text2)', textDecoration: 'none',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              transition: 'all 0.15s',
            }}>
              Security Console
            </Link>
            <Link href="/login" style={{
              padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              color: '#fff', textDecoration: 'none',
              background: 'linear-gradient(135deg, #1B2059, #4361EE)',
              boxShadow: '0 4px 12px rgba(67,97,238,0.35)',
              transition: 'all 0.15s',
            }}>
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: '100px 48px 80px',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Layered mesh background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: `
            radial-gradient(ellipse 90% 70% at 100% 10%, rgba(67,97,238,0.06) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at -5% 90%, rgba(6,182,212,0.06) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 50% 50%, rgba(27,32,89,0.03) 0%, transparent 60%),
            #F7F9FF
          `,
        }} />

        {/* Fine grid */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(67,97,238,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(67,97,238,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)',
        }} />

        {/* Large ambient circle — top right */}
        <div style={{
          position: 'absolute', top: -200, right: -200, zIndex: 0,
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67,97,238,0.055) 0%, transparent 65%)',
        }} />

        <div style={{
          maxWidth: 1200, margin: '0 auto', width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 80,
          alignItems: 'center',
          position: 'relative', zIndex: 1,
        }}>

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* Eyebrow */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 20, marginBottom: 40,
              background: 'rgba(67,97,238,0.07)',
              border: '1px solid rgba(67,97,238,0.18)',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: 3,
                background: '#4361EE',
                animation: 'pulse-dot 2s infinite',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#4361EE',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                Behavioral Authentication · Banking
              </span>
            </div>

            {/* Headline */}
            <div style={{ marginBottom: 32 }}>

              <p style={{
                fontSize: 13, fontWeight: 600, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'var(--text3)',
                marginBottom: 12,
              }}>
                Passwords prove nothing.
              </p>

              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(56px, 8vw, 96px)',
                fontWeight: 700,
                lineHeight: 0.95,
                letterSpacing: '-0.04em',
                color: 'var(--primary)',
                marginBottom: 20,
              }}>
                Behavior
                <br />
                proves
                <br />
                <span style={{
                  background: 'linear-gradient(125deg, #4361EE 0%, #2563EB 40%, #06B6D4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  everything.
                </span>
              </h1>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 0,
                marginBottom: 28, maxWidth: 500,
              }}>
                <div style={{
                  width: 40, height: 2, borderRadius: 1,
                  background: 'linear-gradient(90deg, #4361EE, #06B6D4)',
                }} />
                <div style={{
                  flex: 1, height: 1,
                  background: 'linear-gradient(90deg, var(--border), transparent)',
                }} />
              </div>

              <p style={{
                fontSize: 17, color: 'var(--text2)', lineHeight: 1.78,
                maxWidth: 500, fontWeight: 400,
              }}>
                Imprint continuously authenticates every banking session through
                behavioral biometrics — invisible to legitimate users, impossible
                for impostors to fake. Protection doesn&apos;t end at login.
                It never stops.
              </p>
            </div>

            {/* CTA row */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 52, flexWrap: 'wrap' }}>
              <Link href="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '14px 28px', borderRadius: 11, fontSize: 14, fontWeight: 700,
                color: '#fff', textDecoration: 'none',
                background: 'linear-gradient(135deg, #1B2059 0%, #2D3A8C 50%, #4361EE 100%)',
                boxShadow: '0 6px 24px rgba(67,97,238,0.38), inset 0 1px 0 rgba(255,255,255,0.1)',
                letterSpacing: '-0.01em',
              }}>
                Try the banking app
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 10,
                  background: 'rgba(255,255,255,0.2)',
                  fontSize: 12,
                }}>
                  →
                </span>
              </Link>

              <Link href="/dashboard" target="_blank" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 22px', borderRadius: 11, fontSize: 14, fontWeight: 600,
                color: 'var(--primary-mid)', textDecoration: 'none',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                letterSpacing: '-0.01em',
                boxShadow: '0 1px 3px rgba(15,18,41,0.06)',
              }}>
                Imprint Console
              </Link>
            </div>

            {/* Trust strip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 0,
              paddingTop: 28,
              borderTop: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'RBI Guidelines 2025',  color: '#059669' },
                { label: 'DPDPA 2023 Compliant', color: '#4361EE' },
                { label: 'Zero raw data stored', color: '#7C3AED' },
              ].map((t, i) => (
                <div key={t.label} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  paddingRight: i < 2 ? 24 : 0,
                  marginRight: i < 2 ? 24 : 0,
                  marginBottom: 8,
                  borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: 3,
                    background: t.color,
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16,
          }}>
            <HeroCard />

            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {[
                '10-second windows',
                '18 behavioral signals',
                'Isolation Forest ML',
              ].map((t) => (
                <div key={t} style={{
                  padding: '4px 12px', borderRadius: 20,
                  background: '#fff', border: '1px solid var(--border)',
                  fontSize: 11, fontWeight: 600, color: 'var(--text2)',
                  boxShadow: '0 1px 3px rgba(15,18,41,0.05)',
                }}>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM STATEMENT ── */}
      <section style={{
        padding: '100px 32px',
        background: 'var(--primary)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }} />

        <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 720, marginBottom: 64 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20,
            }}>
              The Problem
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 48, fontWeight: 700, color: '#fff',
              lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 24,
            }}>
              Authentication ends at login.
              <br />
              Fraud begins after.
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75 }}>
              Traditional banking security verifies identity once — at the password screen.
              But sessions last minutes. Phones get stolen. Credentials get compromised.
              The 8 minutes after login are completely unprotected.
            </p>
          </div>

          {/* Stat row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2, borderRadius: 16, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {[
              { n: '68%', label: 'of account takeovers', sub: 'happen after successful login' },
              { n: '8 min', label: 'average banking session', sub: 'completely unprotected post-login' },
              { n: '₹11,000 Cr', label: 'digital banking fraud', sub: 'reported in India in 2024' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '40px 36px',
                background: 'rgba(255,255,255,0.04)',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 52, fontWeight: 700, color: '#fff',
                  letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 10,
                }}>
                  {s.n}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                  {s.label}
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '100px 32px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: 'var(--accent)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
            }}>
              How It Works
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 48, fontWeight: 700, color: 'var(--primary)',
              letterSpacing: '-0.03em', marginBottom: 16,
            }}>
              Three steps. Zero friction.
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text2)', maxWidth: 520, margin: '0 auto' }}>
              Imprint works entirely in the background — users never know it&apos;s there unless something is wrong.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {[
              {
                step: '01',
                title: 'Observe',
                desc: 'The moment a user logs in, Imprint begins capturing behavioral signals — keystroke timing, navigation rhythm, mouse dynamics — silently in the background.',
                detail: 'Enrollment window: 90 seconds',
                color: '#4361EE',
                bg: '#EEF2FF',
              },
              {
                step: '02',
                title: 'Profile',
                desc: 'An Isolation Forest model trains on the first 90 seconds of user behavior, building a unique behavioral fingerprint. No two users produce the same profile.',
                detail: '18-dimensional behavioral vector',
                color: '#06B6D4',
                bg: '#ECFEFF',
              },
              {
                step: '03',
                title: 'Protect',
                desc: 'Every 5 seconds, current behavior is scored against the profile. Deviations trigger graduated responses — from silent monitoring to full re-authentication.',
                detail: 'Detection time: under 45 seconds',
                color: '#047857',
                bg: '#ECFDF5',
              },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '40px 36px',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: i === 0 ? '16px 0 0 16px' : i === 2 ? '0 16px 16px 0' : 0,
                boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
                position: 'relative',
              }}>
                {/* Step number */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, borderRadius: 10,
                  background: s.bg, marginBottom: 24,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>
                    {s.step}
                  </span>
                </div>

                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28, fontWeight: 700, color: 'var(--primary)',
                  marginBottom: 16, letterSpacing: '-0.02em',
                }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 24 }}>
                  {s.desc}
                </p>
                <div style={{
                  display: 'inline-flex', padding: '5px 12px', borderRadius: 6,
                  background: s.bg, border: `1px solid ${s.color}22`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>
                    {s.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECHNOLOGY ── */}
      <section id="technology" style={{
        padding: '100px 32px',
        background: 'linear-gradient(180deg, var(--bg) 0%, #EEF2FF 100%)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>

          <div style={{ marginBottom: 64 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: 'var(--accent)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
            }}>
              Technology
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 48, fontWeight: 700, color: 'var(--primary)',
              letterSpacing: '-0.03em', maxWidth: 560,
            }}>
              What Imprint measures
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              {
                title: 'Keystroke Dynamics',
                desc: 'Dwell time (key hold duration), flight time (inter-key gap), and digraph latency are extracted per keystroke pair. These timing patterns are unique to each individual — stable across sessions.',
                metric: '3 timing signals per keystroke',
                accent: '#4361EE',
              },
              {
                title: 'Navigation Rhythm',
                desc: 'Page dwell times and navigation sequence patterns are tracked. How long you spend on each screen and in what order you visit pages creates a behavioral fingerprint of your session intent.',
                metric: 'Levenshtein sequence matching',
                accent: '#06B6D4',
              },
              {
                title: 'Mouse & Pointer Dynamics',
                desc: 'Cursor velocity, movement curvature, and click patterns are sampled at 20 events per second. Humans move mice in natural arcs — bots and fraudsters produce mechanical, linear paths.',
                metric: 'Velocity + curvature vectors',
                accent: '#7C3AED',
              },
              {
                title: 'Session Context Intelligence',
                desc: 'Transaction risk context is factored in dynamically. Transferring to a new beneficiary at 2AM requires a higher trust score than checking a balance. Thresholds adapt to risk.',
                metric: 'Context risk multiplier',
                accent: '#047857',
              },
            ].map((card) => (
              <div key={card.title} style={{
                padding: '32px 36px',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(15,18,41,0.05)',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: card.accent, marginBottom: 20,
                }} />
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22, fontWeight: 700, color: 'var(--primary)',
                  marginBottom: 12, letterSpacing: '-0.02em',
                }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 20 }}>
                  {card.desc}
                </p>
                <div style={{
                  padding: '6px 12px', borderRadius: 6,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  display: 'inline-block',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text2)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    {card.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ML model callout */}
          <div style={{
            marginTop: 16, padding: '32px 40px',
            background: 'var(--primary)',
            borderRadius: 16,
            display: 'grid', gridTemplateColumns: '1fr auto',
            alignItems: 'center', gap: 40,
          }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                ML Architecture
              </p>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26, fontWeight: 700, color: '#fff',
                letterSpacing: '-0.02em', marginBottom: 10,
              }}>
                Three-tier model — cold start solved
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                Population model (One-Class SVM) detects bots. Cohort model (GMM) protects from day one with no history. Individual model (Isolation Forest) learns your unique pattern over sessions. Weights transition automatically as trust accumulates.
              </p>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
            }}>
              {[
                { label: 'Population', model: 'One-Class SVM', color: '#818CF8' },
                { label: 'Cohort',     model: 'GMM',           color: '#22D3EE' },
                { label: 'Individual', model: 'Isolation Forest', color: '#34D399' },
              ].map((m) => (
                <div key={m.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: m.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, width: 72 }}>{m.label}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: m.color, fontWeight: 600 }}>{m.model}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '100px 32px', background: '#fff' }}>
        <div style={{
          maxWidth: 1160, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          borderRadius: 20, overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px rgba(15,18,41,0.07)',
        }}>
          {[
            { n: '45s',  label: 'Impostor detection',  sub: 'From first anomalous keystroke to alert' },
            { n: '90s',  label: 'Profile enrollment',  sub: 'Time to build a behavioral fingerprint' },
            { n: '18',   label: 'Behavioral signals',  sub: 'Captured and analyzed per 10-second window' },
            { n: '0',    label: 'Raw keystrokes stored', sub: 'Privacy by design — only statistical summaries' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '48px 36px',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
              background: '#fff',
            }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: 56, fontWeight: 700, color: 'var(--primary)',
                letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 14,
              }}>
                {s.n}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRIVACY ── */}
      <section id="privacy" style={{ padding: '100px 32px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <p style={{
                fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20,
              }}>
                Privacy by Design
              </p>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 44, fontWeight: 700, color: 'var(--primary)',
                letterSpacing: '-0.03em', marginBottom: 24,
              }}>
                We never store what you type.
                <br />
                Only how you type.
              </h2>
              <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 32 }}>
                Raw keystroke content is discarded immediately. Imprint stores only
                statistical summaries — mean and standard deviation of timing patterns.
                52 bytes per user. Fully DPDPA 2023 compliant. Users can request
                deletion at any time.
              </p>

              <Link href="/banking/privacy" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                color: 'var(--accent)', textDecoration: 'none',
                background: 'var(--accent-light)', border: '1px solid rgba(67,97,238,0.2)',
              }}>
                View Privacy Dashboard
              </Link>
            </div>

            {/* Data flow visual */}
            <div style={{
              background: '#fff', borderRadius: 16, padding: 32,
              border: '1px solid var(--border)',
              boxShadow: '0 4px 16px rgba(15,18,41,0.07)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 24 }}>
                What happens to your data
              </p>

              {[
                { label: 'Raw keystrokes captured',    status: 'transient', note: 'Never stored to disk' },
                { label: 'Feature vectors computed',   status: 'processed', note: '18 numbers per 10s window' },
                { label: 'Model trained in memory',    status: 'processed', note: 'Session-scoped, discarded on logout' },
                { label: 'Statistical summary stored', status: 'stored',    note: '52 bytes — means & std devs only' },
                { label: 'Raw events discarded',       status: 'deleted',   note: 'Immediately after feature extraction' },
              ].map((row, i) => {
                const color = {
                  transient: '#F59E0B',
                  processed: '#4361EE',
                  stored:    '#047857',
                  deleted:   '#6B7280',
                }[row.status]

                const label = {
                  transient: 'In transit',
                  processed: 'Processed',
                  stored:    'Stored',
                  deleted:   'Discarded',
                }[row.status]

                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 0',
                    borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                  }}>
                    {/* Connector line */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      flexShrink: 0,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: color as string }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{row.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{row.note}</p>
                    </div>
                    <div style={{
                      padding: '3px 10px', borderRadius: 20,
                      background: `${color}15`,
                      border: `1px solid ${color}30`,
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: color as string, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        padding: '120px 32px',
        background: 'linear-gradient(135deg, #0F1229 0%, #1B2059 50%, #1e3a8a 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67,97,238,0.2) 0%, transparent 70%)',
        }} />

        <div style={{
          maxWidth: 720, margin: '0 auto', textAlign: 'center',
          position: 'relative', zIndex: 1,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 24,
          }}>
            Live session
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 56, fontWeight: 700, color: '#fff',
            letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 24,
          }}>
            Watch an impostor get detected in real time.
          </h2>
          <p style={{
            fontSize: 17, color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.75, marginBottom: 48,
          }}>
            Sign in to the banking app. Type normally to build your profile.
            Then pass the keyboard to someone else — Imprint will detect the
            behavioral shift within seconds.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <Link href="/login" style={{
              padding: '16px 40px', borderRadius: 12, fontSize: 16, fontWeight: 700,
              color: 'var(--primary)', textDecoration: 'none',
              background: '#fff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              letterSpacing: '-0.01em',
            }}>
              Open banking app
            </Link>
            <Link href="/dashboard" target="_blank" style={{
              padding: '16px 32px', borderRadius: 12, fontSize: 16, fontWeight: 600,
              color: 'rgba(255,255,255,0.8)', textDecoration: 'none',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              letterSpacing: '-0.01em',
            }}>
              Security Console
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '40px 32px',
        background: '#0A0D1E',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: 1160, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: 'linear-gradient(135deg, #1B2059, #4361EE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.9)' }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18, fontWeight: 700, color: '#fff',
              letterSpacing: '-0.02em',
            }}>
              Imprint
            </span>
          </div>

          <div style={{ display: 'flex', gap: 32 }}>
            {[
              { label: 'Privacy', href: '/banking/privacy' },
              { label: 'Technology', href: '#' },
              { label: 'Banking', href: '/login' },
            ].map(({ label, href }) => (
              <Link key={label} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            Craftathon 2026 · Gandhinagar University · Built with Imprint Auth
          </p>
        </div>
      </footer>
    </div>
  )
}