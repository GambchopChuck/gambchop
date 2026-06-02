'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const GREEN  = '#39ff9a'
const TEXT   = '#f4f4f5'
const BORDER = '#1a1a24'
const CARD   = '#0c0c12'
const BLUE   = '#60a5fa'

const FREE_FEATURES = [
  '3 most recent outcomes per chart row',
  'Sports News feed',
  'Community Board',
  'Schedule page',
  'Leaderboard view',
]

const PRO_FEATURES = [
  'Full chart access — current & prior season',
  'Chopper AI Agent',
  'Compare feature',
  'Favorites system',
  'Chart News',
  'Public profile with social handles',
  '50 Chopper sessions monthly',
]

export default function HomepagePricingSection() {
  const { isPro } = useAuth()

  if (isPro) return null

  return (
    <section style={{
      background: 'linear-gradient(135deg, #0a2a1a 0%, #0a0f2a 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '72px 24px 80px',
      fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
    }}>

      {/* Subtle grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(57,255,154,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(57,255,154,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
      }} />

      {/* Ambient green glow — top-left */}
      <div style={{
        position: 'absolute', top: -120, left: -80,
        width: 480, height: 480,
        background: 'rgba(57,255,154,0.07)',
        filter: 'blur(90px)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Ambient blue glow — bottom-right */}
      <div style={{
        position: 'absolute', bottom: -120, right: -80,
        width: 480, height: 480,
        background: 'rgba(96,165,250,0.07)',
        filter: 'blur(90px)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{
            fontSize: 9, color: GREEN, letterSpacing: '0.32em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 14,
          }}>
            Membership
          </div>
          <h2 style={{
            fontSize: 36, fontWeight: 900, color: TEXT,
            letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0,
          }}>
            Choose Your Plan
          </h2>
        </div>

        {/* ── Cards ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          marginBottom: 28,
          alignItems: 'start',
        }}>

          {/* ── Free card ─────────────────────────────────────────────────── */}
          <div style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            boxShadow: `0 0 40px rgba(96,165,250,0.12), inset 0 0 20px rgba(96,165,250,0.03)`,
            padding: '32px 28px',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
          }}>
            {/* Blue top accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(to right, transparent, ${BLUE}, transparent)`,
            }} />

            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 9, color: BLUE, letterSpacing: '0.25em',
                textTransform: 'uppercase', fontWeight: 700, marginBottom: 10,
              }}>
                Free
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: TEXT, lineHeight: 1 }}>$0</span>
                <span style={{ fontSize: 12, color: TEXT, letterSpacing: '0.06em' }}>/month</span>
              </div>
              <p style={{ fontSize: 11, color: TEXT, margin: 0, lineHeight: 1.6, letterSpacing: '0.02em' }}>
                Charts and team tracking — no card needed.
              </p>
            </div>

            <div style={{ flex: 1, marginBottom: 28 }}>
              {FREE_FEATURES.map(f => (
                <div key={f} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: `1px solid ${BORDER}`,
                }}>
                  <span style={{ color: BLUE, flexShrink: 0, fontSize: 13, lineHeight: 1 }}>✓</span>
                  <span style={{ fontSize: 11, color: TEXT, letterSpacing: '0.02em' }}>{f}</span>
                </div>
              ))}
            </div>

            <Link href="/auth/signup" style={{
              display: 'block', textAlign: 'center', textDecoration: 'none',
              padding: '13px',
              background: 'transparent', border: `1px solid ${BLUE}`,
              color: BLUE, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Create Free Account →
            </Link>
          </div>

          {/* ── Pro card ──────────────────────────────────────────────────── */}
          <div style={{
            background: CARD,
            border: `1.5px solid ${GREEN}`,
            boxShadow: `0 0 80px rgba(57,255,154,0.25), inset 0 0 40px rgba(57,255,154,0.06)`,
            padding: '32px 28px',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
          }}>
            {/* Green top accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(to right, transparent, ${GREEN}, transparent)`,
            }} />

            {/* Most Popular badge */}
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              background: GREEN, color: '#000',
              fontSize: 8, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '3px 14px',
            }}>
              Most Popular
            </div>

            <div style={{ marginBottom: 24, marginTop: 20 }}>
              <div style={{
                fontSize: 9, color: GREEN, letterSpacing: '0.25em',
                textTransform: 'uppercase', fontWeight: 700, marginBottom: 10,
              }}>
                ⚡ Pro
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: TEXT, lineHeight: 1 }}>$20</span>
                <span style={{ fontSize: 12, color: TEXT, letterSpacing: '0.06em' }}>/month</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: TEXT, letterSpacing: '0.04em' }}>or $180/year</span>
                <span style={{
                  fontSize: 7, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: GREEN, color: '#000', padding: '2px 7px',
                }}>
                  Save 25%
                </span>
              </div>
            </div>

            <div style={{ flex: 1, marginBottom: 28 }}>
              {PRO_FEATURES.map(f => (
                <div key={f} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: `1px solid ${BORDER}`,
                }}>
                  <span style={{ color: GREEN, flexShrink: 0, fontSize: 13, lineHeight: 1 }}>✓</span>
                  <span style={{ fontSize: 11, color: TEXT, letterSpacing: '0.02em' }}>{f}</span>
                </div>
              ))}
            </div>

            <Link href="/pricing" style={{
              display: 'block', textAlign: 'center', textDecoration: 'none',
              padding: '14px',
              background: GREEN, color: '#000',
              fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Start Free 3-Day Trial →
            </Link>
          </div>

        </div>

        {/* Fine print */}
        <p style={{
          textAlign: 'center', fontSize: 10, color: TEXT,
          letterSpacing: '0.06em', margin: 0, opacity: 0.6,
        }}>
          No credit card required for free account. Cancel Pro anytime.
        </p>

      </div>
    </section>
  )
}
