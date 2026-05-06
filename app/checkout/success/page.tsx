'use client'

// Step 2.5: webhook will set is_pro on subscription.created event.
// Until then, we optimistically mark the user as Pro in auth-context
// so the UI reflects their purchase immediately after checkout.

import { useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const GREEN  = '#22c55e'
const PURPLE = '#8b5cf6'

const PRO_PERKS = [
  'Full season history — every team, every year',
  'All 9 betting metrics unlocked',
  'Advanced filters & custom date ranges',
  'Real-time streak alerts & line movement',
  'Community board posting',
  'Unlimited favorites tracked',
  'CSV export',
]

function SuccessContent() {
  const { setIsPro } = useAuth()
  const searchParams = useSearchParams()
  const sessionId    = searchParams.get('session_id')

  // Optimistically grant Pro access in the UI.
  // Step 2.5 (webhook) will make this durable via profiles.is_pro.
  useEffect(() => {
    setIsPro(true)
  }, [setIsPro])

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: CARD, border: `1px solid ${PURPLE}55`,
        borderRadius: 20, padding: '48px 40px',
        boxShadow: `0 0 60px ${PURPLE}18`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${PURPLE}, transparent)` }} />

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⚡</div>
          <div style={{ fontSize: 9, color: PURPLE, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
            Pro Active
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 14px' }}>
            Welcome to Gambchop Pro
          </h1>
          <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, margin: 0 }}>
            Your 3-day free trial has started.{' '}
            We&apos;ll email you before your card is charged — cancel any time before day 3 and you won&apos;t pay a thing.
          </p>
          {sessionId && (
            <div style={{ marginTop: 12, fontSize: 9, color: '#3f3f46', letterSpacing: '0.08em' }}>
              Confirmation: {sessionId.slice(-12)}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 32 }}>
          {PRO_PERKS.map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: GREEN, flexShrink: 0, fontSize: 13 }}>✓</span>
              <span style={{ fontSize: 11, color: SUB }}>{p}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '100%', padding: '13px', borderRadius: 8,
              background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`,
              color: '#fff', fontSize: 11, fontWeight: 900,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box',
              boxShadow: `0 0 24px ${PURPLE}44`,
            }}>
              Go to Dashboard →
            </div>
          </Link>
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '100%', padding: '12px', borderRadius: 8,
              border: `1px solid ${BORDER}`, background: 'transparent',
              color: SUB, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box',
            }}>
              My Profile
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
