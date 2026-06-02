'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ─── Palette ──────────────────────────────────────────────────────────────────

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const GREEN  = '#22c55e'
const BLUE   = '#60A5FA'

// ─── Data ─────────────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  { label: 'Last 3 games per team',           included: true  },
  { label: 'Moneyline chart view',            included: true  },
  { label: 'Follow up to 3 teams',            included: true  },
  { label: 'Community read access',           included: true  },
  { label: 'Full season history',             included: false },
  { label: 'All 9 betting metrics',           included: false },
  { label: 'Advanced filters & date ranges',  included: false },
  { label: 'Streak alerts & line movement',   included: false },
  { label: 'Community board posting',         included: false },
  { label: 'Unlimited favorites',             included: false },
  { label: 'CSV export',                      included: false },
]

const PRO_FEATURES = [
  { label: 'Everything in Free',              highlight: false },
  { label: 'Full season history — all teams', highlight: false },
  { label: 'All 9 betting metrics unlocked',  highlight: false },
  { label: 'Advanced filters & date ranges',  highlight: false },
  { label: 'Streak alerts & line movement',   highlight: true  },
  { label: 'Community board access',          highlight: false },
  { label: 'Unlimited favorites',             highlight: true  },
  { label: 'CSV export',                      highlight: false },
  { label: 'Priority support',                highlight: false },
]

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — cancel with one click from your profile. You keep Pro access through the end of your billing period.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Pro comes with a 3-day free trial. A card is required at checkout — cancel before the trial ends and you won\'t be charged.',
  },
  {
    q: 'What\'s the difference between monthly and annual?',
    a: 'Annual billing locks in $15/month (billed as $180/year) and saves you 25% versus paying month-to-month.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes. If you\'re not satisfied within the first 14 days, contact support for a full refund — no questions asked.',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Check({ color = GREEN }: { color?: string }) {
  return <span style={{ color, flexShrink: 0, fontSize: 13, lineHeight: 1 }}>✓</span>
}

function Cross() {
  return <span style={{ color: MUTED, flexShrink: 0, fontSize: 13, lineHeight: 1 }}>✕</span>
}

function FeatureRow({ label, included, checkColor = GREEN }: { label: string; included: boolean; checkColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
      {included ? <Check color={checkColor} /> : <Cross />}
      <span style={{ fontSize: 11, color: included ? SUB : MUTED, letterSpacing: '0.02em' }}>{label}</span>
    </div>
  )
}

function ProFeatureRow({ label }: { label: string; highlight: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
      <Check color={GREEN} />
      <span style={{ fontSize: 11, color: SUB, fontWeight: 400, letterSpacing: '0.02em' }}>
        {label}
      </span>
    </div>
  )
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
        }}
      >
        <span style={{ fontSize: 12, color: TEXT, fontWeight: 700, letterSpacing: '0.03em', textAlign: 'left' }}>{q}</span>
        <span style={{ fontSize: 16, color: MUTED, flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 11, color: SUB, lineHeight: 1.7, margin: '0 0 18px', letterSpacing: '0.02em' }}>{a}</p>
      )}
    </div>
  )
}

// ─── Plan Cards ───────────────────────────────────────────────────────────────

function FreeCard({ onJoin }: { onJoin: () => void }) {
  const { memberTier } = useAuth()
  const isMember = memberTier !== 'none'
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BLUE}`,
      borderRadius: 16,
      padding: '32px 28px',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      boxShadow: `0 0 50px rgba(96, 165, 250, 0.18), inset 0 0 30px rgba(96, 165, 250, 0.04)`,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${BLUE}, transparent)` }} />

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: BLUE, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
          Free Plan
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: TEXT, lineHeight: 1 }}>$0</span>
          <span style={{ fontSize: 12, color: MUTED, letterSpacing: '0.06em' }}>/month</span>
        </div>
        <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.6, letterSpacing: '0.02em' }}>
          Charts and team tracking — no card needed.
        </p>
      </div>

      <div style={{ flex: 1, marginBottom: 28 }}>
        {FREE_FEATURES.map(f => <FeatureRow key={f.label} {...f} checkColor={BLUE} />)}
      </div>

      {isMember ? (
        <div style={{
          width: '100%', padding: '13px', borderRadius: 8, textAlign: 'center',
          background: 'transparent', border: `1px solid ${BORDER}`,
          fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.1em',
          textTransform: 'uppercase', boxSizing: 'border-box',
        }}>
          Current Plan
        </div>
      ) : (
        <button
          onClick={onJoin}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: '100%', padding: '13px', borderRadius: 8,
            border: `1px solid ${BLUE}`,
            background: hovered ? 'rgba(96, 165, 250, 0.08)' : 'transparent',
            color: BLUE, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'background 150ms ease-out',
          }}
        >
          Get Started Free
        </button>
      )}
    </div>
  )
}

function ProCard({
  billing,
  onUpgrade,
  loading,
}: {
  billing:   'monthly' | 'annual'
  onUpgrade: () => void
  loading:   boolean
}) {
  const { memberTier } = useAuth()
  const isPro = memberTier === 'pro'

  const monthly = billing === 'monthly'
  const price    = monthly ? '$20'  : '$180'
  const period   = monthly ? '/month' : '/year'
  const perMonth = monthly ? null : '$15/mo'

  const [btnHovered, setBtnHovered] = useState(false)

  return (
    <div style={{
      background: CARD,
      border: `1.5px solid ${GREEN}`,
      borderRadius: 16, padding: '32px 28px',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      boxShadow: `0 0 80px rgba(34, 197, 94, 0.35), inset 0 0 40px rgba(34, 197, 94, 0.08)`,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${GREEN}, transparent)` }} />

      {billing === 'annual' && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: GREEN, color: '#0A0A0B', fontSize: 8, fontWeight: 900,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '3px 10px', borderRadius: 4,
        }}>
          Save 25%
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
          ⚡ Pro — {monthly ? 'Monthly' : 'Annual'}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: TEXT, lineHeight: 1 }}>{price}</span>
          <span style={{ fontSize: 12, color: MUTED, letterSpacing: '0.06em' }}>{period}</span>
        </div>
        {perMonth && (
          <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>
            {perMonth} — billed annually
          </div>
        )}
        <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.6, letterSpacing: '0.02em' }}>
          Full access to every metric, alert, and feature on the platform.
        </p>
      </div>

      <div style={{ flex: 1, marginBottom: 28 }}>
        {PRO_FEATURES.map(f => <ProFeatureRow key={f.label} {...f} />)}
      </div>

      {isPro ? (
        <div style={{
          width: '100%', padding: '13px', borderRadius: 8, textAlign: 'center',
          background: `${GREEN}18`, border: `1px solid ${GREEN}55`,
          fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.1em',
          textTransform: 'uppercase', boxSizing: 'border-box',
        }}>
          ⚡ Active Plan
        </div>
      ) : (
        <button
          onClick={onUpgrade}
          disabled={loading}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            width: '100%', padding: '14px', borderRadius: 8, border: 'none',
            background: btnHovered && !loading ? '#16A34A' : GREEN,
            color: '#0A0A0B', fontSize: 11, fontWeight: 900,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'background 150ms ease-out',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Redirecting…' : billing === 'annual' ? 'Start Annual — 3-Day Trial' : 'Start Monthly — 3-Day Trial'}
        </button>
      )}

      <p style={{ fontSize: 9, color: MUTED, textAlign: 'center', marginTop: 12, marginBottom: 0, letterSpacing: '0.08em' }}>
        Cancel anytime · Card required at checkout
      </p>
    </div>
  )
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

const COMPARE_ROWS: { label: string; free: string; pro: string }[] = [
  { label: 'Game history',       free: 'Last 3 games',     pro: 'Full season, all years' },
  { label: 'Betting metrics',    free: '2 of 9',           pro: 'All 9 unlocked'          },
  { label: 'Teams followed',     free: 'Up to 3',          pro: 'Unlimited'               },
  { label: 'Filters & ranges',   free: 'Basic',            pro: 'Advanced + custom dates' },
  { label: 'Streak alerts',      free: '—',                pro: 'Real-time'               },
  { label: 'Line movement',      free: '—',                pro: 'Real-time'               },
  { label: 'Community posting',  free: 'Read only',        pro: 'Full access'             },
  { label: 'CSV export',         free: '—',                pro: 'Included'                },
  { label: 'Support',            free: 'Standard',         pro: 'Priority'                },
]

function ComparisonTable() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-oswald), "Oswald", sans-serif' }}>
        <thead>
          <tr>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, borderBottom: `1px solid ${BORDER}`, width: '40%' }}>
              Feature
            </th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}>
              Free
            </th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 9, color: GREEN, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, borderBottom: `1px solid ${BORDER}`, background: `${GREEN}08` }}>
              ⚡ Pro
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row, i) => (
            <tr key={row.label} style={{ background: i % 2 === 0 ? 'transparent' : '#ffffff04' }}>
              <td style={{ padding: '11px 16px', fontSize: 11, color: SUB, borderBottom: `1px solid ${BORDER}`, letterSpacing: '0.02em' }}>
                {row.label}
              </td>
              <td style={{ padding: '11px 16px', fontSize: 11, color: MUTED, borderBottom: `1px solid ${BORDER}`, textAlign: 'center', letterSpacing: '0.02em' }}>
                {row.free}
              </td>
              <td style={{ padding: '11px 16px', fontSize: 11, color: GREEN, borderBottom: `1px solid ${BORDER}`, textAlign: 'center', fontWeight: 700, letterSpacing: '0.02em', background: `${GREEN}08` }}>
                {row.pro}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PricingContent() {
  const { openModal, memberTier, user, loading: authLoading } = useAuth()
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const canceled      = searchParams.get('canceled') === 'true'
  const autoCheckout  = searchParams.get('checkout') as 'monthly' | 'annual' | null

  const [billing,       setBilling]      = useState<'monthly' | 'annual'>('annual')
  const [checkingOut,   setCheckingOut]  = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [autoFired,     setAutoFired]    = useState(false)

  const handleUpgrade = async (b: 'monthly' | 'annual') => {
    setCheckoutError('')

    // Not logged in — send to signup with intent params
    if (!user) {
      router.push(`/auth/signup?intent=pro&plan=${b}`)
      return
    }

    setCheckingOut(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No active session — please sign in again.')

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId: b }),
      })

      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'No checkout URL returned')

      window.location.href = json.url
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setCheckingOut(false)
    }
  }

  // Auto-trigger checkout after redirecting back from signup with intent=pro
  useEffect(() => {
    if (!autoCheckout || authLoading || !user || autoFired) return
    setAutoFired(true)
    setBilling(autoCheckout)
    handleUpgrade(autoCheckout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckout, authLoading, user, autoFired])

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
      paddingLeft: 80,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 32px 100px' }}>

        {/* ── Canceled notice ───────────────────────────────────────────── */}
        {canceled && (
          <div style={{
            background: '#f59e0b12', border: '1px solid #f59e0b44', borderRadius: 10,
            padding: '12px 18px', marginBottom: 28,
            fontSize: 11, color: '#f59e0b', letterSpacing: '0.03em',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>◎</span>
            <span>Checkout canceled — you weren&apos;t charged.</span>
          </div>
        )}

        {/* ── Checkout error ────────────────────────────────────────────── */}
        {checkoutError && (
          <div style={{
            background: '#ef444412', border: '1px solid #ef444444', borderRadius: 10,
            padding: '12px 18px', marginBottom: 28,
            fontSize: 11, color: '#ef4444', letterSpacing: '0.03em',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>✕</span>
            <span>{checkoutError}</span>
          </div>
        )}

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
            Pricing
          </div>
          <h1 style={{
            fontSize: 38, fontWeight: 900, color: TEXT,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            margin: '0 0 16px',
          }}>
            Sharp Data.<br />Simple Pricing.
          </h1>
          <p style={{ fontSize: 12, color: MUTED, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7, letterSpacing: '0.02em' }}>
            Start free. Upgrade when you want the full edge — every metric,
            every season, every alert.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', background: '#0c0c10', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4, gap: 2 }}>
            {(['monthly', 'annual'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  transition: 'all 0.15s',
                  background: billing === b ? (b === 'annual' ? GREEN : '#1a1a24') : 'transparent',
                  color: billing === b ? (b === 'annual' ? '#0A0A0B' : TEXT) : MUTED,
                }}
              >
                {b === 'monthly' ? 'Monthly' : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Annual
                    <span style={{
                      fontSize: 7, fontWeight: 900, letterSpacing: '0.1em',
                      background: '#0A0A0B', color: GREEN, borderRadius: 3, padding: '1px 5px',
                    }}>
                      SAVE 25%
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Cards ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          marginBottom: 72,
          alignItems: 'start',
        }}>
          <FreeCard onJoin={() => openModal('join')} />
          <ProCard billing={billing} onUpgrade={() => handleUpgrade(billing)} loading={checkingOut} />
        </div>

        {/* ── Comparison table ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Compare Plans</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
              Everything Side by Side
            </h2>
          </div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
            <ComparisonTable />
          </div>
        </div>

        {/* ── Pro CTA banner ────────────────────────────────────────────── */}
        {memberTier !== 'pro' && (
          <div style={{
            background: `linear-gradient(135deg, ${GREEN}18, ${GREEN}08)`,
            border: `1px solid ${GREEN}44`, borderRadius: 16,
            padding: '40px 40px', textAlign: 'center', marginBottom: 72,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 300, height: 300, background: GREEN, borderRadius: '50%', opacity: 0.04, filter: 'blur(60px)', pointerEvents: 'none' }} />

            <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
              ⚡ Limited-Time Offer
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 12px' }}>
              Start Pro Free for 3 Days
            </h2>
            <p style={{ fontSize: 11, color: MUTED, maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.7, letterSpacing: '0.02em' }}>
              Card required. Access every metric, every alert, and the full season chart from day one.
              Cancel before day 3 and you won&apos;t be charged.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleUpgrade(billing)}
                disabled={checkingOut}
                style={{
                  padding: '13px 32px', borderRadius: 8, border: 'none',
                  background: GREEN,
                  color: '#0A0A0B', fontSize: 11, fontWeight: 900,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: checkingOut ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  opacity: checkingOut ? 0.7 : 1,
                }}
              >
                {checkingOut ? 'Redirecting…' : 'Start 3-Day Trial →'}
              </button>
              <button
                onClick={() => openModal('join')}
                style={{
                  padding: '13px 24px', borderRadius: 8,
                  border: `1px solid ${BORDER}`, background: 'transparent',
                  color: SUB, fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Join Free First
              </button>
            </div>
          </div>
        )}

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>FAQ</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
              Common Questions
            </h2>
          </div>
          {FAQS.map(f => <FAQ key={f.q} {...f} />)}

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ fontSize: 11, color: MUTED, marginBottom: 12, letterSpacing: '0.02em' }}>
              Still have questions?
            </p>
            <Link
              href="/community"
              style={{
                fontSize: 11, color: GREEN, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', textDecoration: 'none',
                border: `1px solid ${GREEN}44`, borderRadius: 6, padding: '8px 18px',
              }}
            >
              Ask in Community →
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  )
}
