'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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
  'Unlimited teams & picks tracked',
  'CSV export',
]

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const { isPro, setIsPro } = useAuth()
  const [activated, setActivated] = useState(false)
  const [polls,     setPolls]     = useState(0)

  // Poll profiles until is_pro flips true (webhook is async)
  useEffect(() => {
    if (isPro) { setActivated(true); return }
    if (polls >= 12) return // give up after ~24s

    const id = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', session.user.id)
        .single()

      if (data?.is_pro) {
        setIsPro(true)
        setActivated(true)
      } else {
        setPolls(p => p + 1)
      }
    }, 2000)

    return () => clearTimeout(id)
  }, [polls, isPro, setIsPro])

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: CARD, border: `1px solid ${activated ? PURPLE + '55' : BORDER}`,
        borderRadius: 20, padding: '48px 40px',
        boxShadow: activated ? `0 0 60px ${PURPLE}18` : 'none',
        transition: 'all 0.4s',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${PURPLE}, transparent)`, opacity: activated ? 1 : 0.3, transition: 'opacity 0.4s' }} />

        {activated ? (
          <>
            {/* Activated state */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>⚡</div>
              <div style={{ fontSize: 9, color: PURPLE, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
                Pro Active
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                Welcome to Pro
              </h1>
              <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, margin: 0 }}>
                Your 7-day free trial has started. You won&apos;t be charged until the trial ends — and you can cancel any time.
              </p>
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
                  width: '100%', padding: '13px', borderRadius: 8, border: 'none',
                  background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`,
                  color: '#fff', fontSize: 11, fontWeight: 900,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box',
                  boxShadow: `0 0 24px ${PURPLE}44`,
                }}>
                  Explore Leagues →
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
          </>
        ) : (
          <>
            {/* Activating state */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>
                {polls >= 12 ? '✓' : '⏳'}
              </div>
              <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
                Payment Confirmed
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                Activating Pro Access
              </h1>
              <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, margin: '0 0 28px' }}>
                {polls >= 12
                  ? 'This is taking longer than usual — your access will be ready within a minute. Try refreshing.'
                  : 'Hang on while we activate your account. This usually takes a few seconds…'}
              </p>

              {/* Animated dots */}
              {polls < 12 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: PURPLE, opacity: 0.3 + (i * 0.35),
                      animation: `pulse ${0.8 + i * 0.2}s ease-in-out infinite alternate`,
                    }} />
                  ))}
                </div>
              )}

              {polls >= 12 && (
                <button
                  onClick={() => router.refresh()}
                  style={{
                    padding: '10px 24px', borderRadius: 8,
                    background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`,
                    border: 'none', color: '#fff', fontSize: 11, fontWeight: 900,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Refresh Page
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          from { transform: scale(1); opacity: 0.3; }
          to   { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
