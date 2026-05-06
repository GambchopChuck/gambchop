'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const GREEN  = '#22c55e'

const INPUT: React.CSSProperties = {
  width: '100%', background: '#0c0c10', border: '1px solid #2a2a34',
  borderRadius: 8, padding: '12px 14px', color: TEXT,
  fontSize: 12, letterSpacing: '0.04em', outline: 'none',
  fontFamily: 'var(--font-geist-mono), monospace', boxSizing: 'border-box',
}

function friendlyError(msg: string): string {
  if (msg.includes('already registered'))        return 'An account with this email already exists.'
  if (msg.includes('Password should be'))        return 'Password must be at least 6 characters.'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts — please wait a moment.'
  if (msg.includes('404') || msg.includes('not found') || msg.includes('fetch'))
    return 'Cannot reach the server. Your Supabase project may be paused — check your dashboard.'
  return msg
}

function SignUpForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const intent       = searchParams.get('intent')   // 'pro'
  const plan         = searchParams.get('plan')     // 'monthly' | 'annual'

  const [displayName, setDisplayName] = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: displayName.trim() ? { display_name: displayName.trim() } : {},
        },
      })
      if (error) { setError(friendlyError(error.message)); return }
      if (!data.session) { setDone(true); return }

      // Session exists — user is immediately logged in
      if (intent === 'pro' && (plan === 'monthly' || plan === 'annual')) {
        router.push(`/pricing?checkout=${plan}`)
      } else {
        router.push('/')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(friendlyError(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: 16, padding: '40px 36px',
      }}>
        {done ? (
          <>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>📬</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center' }}>
              Check Your Email
            </h2>
            <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, textAlign: 'center', margin: '0 0 24px' }}>
              We sent a confirmation link to <strong style={{ color: '#a1a1aa' }}>{email}</strong>.
              Click it to activate your account, then sign in.
            </p>
            <Link href="/auth/login" style={{
              display: 'block', width: '100%', padding: '13px', borderRadius: 8,
              background: `linear-gradient(135deg, ${GREEN}, #16a34a)`,
              color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none', textAlign: 'center',
              boxSizing: 'border-box',
            }}>
              Go to Sign In
            </Link>
          </>
        ) : (
          <>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <span style={{
                fontSize: 18, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #22c55e 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Gambchop</span>
            </div>

            {intent === 'pro' && (
              <div style={{
                background: '#8b5cf612', border: '1px solid #8b5cf633', borderRadius: 8,
                padding: '10px 14px', fontSize: 11, color: '#8b5cf6',
                letterSpacing: '0.03em', marginBottom: 20, textAlign: 'center',
              }}>
                ⚡ Create an account to start your 3-day Pro trial
              </div>
            )}

            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              Free forever
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 28px' }}>
              Create Account
            </h1>

            {error && (
              <div style={{ background: '#ef444418', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#ef4444', letterSpacing: '0.03em', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Display Name <span style={{ color: '#3f3f46' }}>(optional)</span>
                </label>
                <input
                  style={INPUT} type="text" placeholder="e.g. SharpBettor99"
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                  maxLength={40} autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  style={INPUT} type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  style={INPUT} type="password" placeholder="Min. 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '13px', borderRadius: 8, border: 'none',
                  background: `linear-gradient(135deg, ${GREEN}, #16a34a)`,
                  color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
                  textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
                  boxShadow: `0 0 20px ${GREEN}35`,
                }}
              >
                {loading ? 'Creating Account…' : 'Create Free Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', fontSize: 11, color: MUTED }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: GREEN, fontWeight: 700, textDecoration: 'none' }}>
                Sign in →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}
