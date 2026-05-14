'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

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

type Phase = 'activating' | 'confirmed'

function SuccessContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const sessionId    = searchParams.get('session_id')
  const { user, setIsPro, beginProActivation, endProActivation } = useAuth()

  const [phase, setPhase] = useState<Phase>('activating')
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set optimistic state once on mount — before the polling interval begins.
  // beginProActivation/setIsPro are stable callbacks; intentionally omitted from
  // deps so this fires exactly once regardless of auth re-renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    beginProActivation()
    setIsPro(true)
  }, [])

  // Polling: wait for the Stripe webhook to flip profiles.is_pro = true.
  // Starts when user.id is known; restarts if the auth session changes.
  useEffect(() => {
    if (!user?.id) return

    const check = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', user.id)
        .single()

      if (data?.is_pro) {
        clearInterval(pollRef.current!)
        clearTimeout(timeoutRef.current!)
        setPhase('confirmed')
        setTimeout(() => router.replace('/'), 1500)
      }
    }

    pollRef.current = setInterval(check, 2000)
    check()

    // After 20s the webhook still hasn't landed. Release the activation hold so
    // future syncProfileFromSupabase calls read the real DB value — if the webhook
    // arrives late, the next sync picks up true naturally; if it failed, the user
    // correctly shows as free and the banner on the home page explains the delay.
    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current!)
      endProActivation()
      localStorage.setItem('gambchop-pro-activating', '1')
      router.replace('/')
    }, 20000)

    return () => {
      clearInterval(pollRef.current!)
      clearTimeout(timeoutRef.current!)
    }
  }, [user?.id, router, endProActivation])

  const confirmed = phase === 'confirmed'

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: CARD,
        border: `1px solid ${confirmed ? GREEN + '55' : PURPLE + '55'}`,
        borderRadius: 20, padding: '48px 40px',
        boxShadow: `0 0 60px ${confirmed ? GREEN : PURPLE}18`,
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.4s, box-shadow 0.4s',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${confirmed ? GREEN : PURPLE}, transparent)`, transition: 'background 0.4s' }} />

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>
            {confirmed ? '⚡' : '◎'}
          </div>
          <div style={{ fontSize: 9, color: confirmed ? GREEN : PURPLE, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
            {confirmed ? 'Pro Active' : 'Activating…'}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 14px' }}>
            Welcome to Gambchop Pro
          </h1>
          <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, margin: 0 }}>
            {confirmed
              ? 'Your account is activated. Taking you home…'
              : "Your 3-day trial has started. We're activating your account — just a moment."}
          </p>

          {!confirmed && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
              <div className="activation-spinner" />
              <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Confirming payment…
              </span>
            </div>
          )}

          {sessionId && (
            <div style={{ marginTop: 12, fontSize: 9, color: '#3f3f46', letterSpacing: '0.08em' }}>
              Confirmation: {sessionId.slice(-12)}
            </div>
          )}
        </div>

        <div>
          {PRO_PERKS.map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: GREEN, flexShrink: 0, fontSize: 13 }}>✓</span>
              <span style={{ fontSize: 11, color: SUB }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .activation-spinner {
          width: 14px; height: 14px;
          border: 2px solid ${PURPLE}33;
          border-top-color: ${PURPLE};
          border-radius: 50%;
          animation: activation-spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes activation-spin { to { transform: rotate(360deg); } }
      `}</style>
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
