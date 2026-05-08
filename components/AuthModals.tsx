'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ─── Shared styles ────────────────────────────────────────────────────────────

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)',
}

const PANEL: React.CSSProperties = {
  background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 16,
  padding: '40px 36px', width: '100%', maxWidth: 420,
  fontFamily: 'var(--font-geist-mono), monospace',
  position: 'relative',
}

const INPUT: React.CSSProperties = {
  width: '100%', background: '#0c0c10', border: '1px solid #2a2a34',
  borderRadius: 8, padding: '12px 14px', color: '#f4f4f5',
  fontSize: 12, letterSpacing: '0.04em', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

const BTN_GREEN: React.CSSProperties = {
  width: '100%', padding: '13px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
  color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
  textTransform: 'uppercase', cursor: 'pointer',
  boxShadow: '0 0 20px rgba(34,197,94,0.35)',
  fontFamily: 'inherit',
}

const BTN_GHOST: React.CSSProperties = {
  background: 'none', border: '1px solid #2a2a34', borderRadius: 8,
  color: '#71717a', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
  cursor: 'pointer', padding: '10px 20px', fontFamily: 'inherit', fontWeight: 600,
}

function CloseBtn() {
  const { closeModal } = useAuth()
  return (
    <button onClick={closeModal} style={{
      position: 'absolute', top: 16, right: 16,
      background: 'none', border: 'none', color: '#52525b',
      cursor: 'pointer', fontSize: 18, lineHeight: 1,
    }}>×</button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 9, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </label>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div style={{
      background: '#ef444418', border: '1px solid #ef444444', borderRadius: 8,
      padding: '10px 14px', fontSize: 11, color: '#ef4444',
      letterSpacing: '0.03em', marginBottom: 16,
    }}>
      {msg}
    </div>
  )
}

function SuccessMsg({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div style={{
      background: '#22c55e18', border: '1px solid #22c55e44', borderRadius: 8,
      padding: '10px 14px', fontSize: 11, color: '#22c55e',
      letterSpacing: '0.03em', marginBottom: 16,
    }}>
      {msg}
    </div>
  )
}

// Maps Supabase error messages to user-friendly copy
function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials'))  return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed'))         return 'Please verify your email before signing in.'
  if (msg.includes('already registered'))          return 'An account with this email already exists.'
  if (msg.includes('Password should be'))          return 'Password must be at least 6 characters.'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts — please wait a moment.'
  if (msg.includes('Unable to validate'))          return 'Invalid or expired link. Please request a new one.'
  if (msg.includes('404') || msg.includes('not found') || msg.includes('fetch'))
    return 'Cannot reach the server. Your Supabase project may be paused — check your dashboard.'
  return msg
}

// ─── Login Modal ──────────────────────────────────────────────────────────────

function LoginModal() {
  const { openModal, closeModal } = useAuth()
  const [view,     setView]     = useState<'signin' | 'forgot' | 'sent'>('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        return
      }
      closeModal()
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
      })
      if (error) {
        setError(error.message)
        return
      }
      setView('sent')
    } catch (err) {
      console.error('Forgot password error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={OVERLAY}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={closeModal} />
      <div style={PANEL}>
        <CloseBtn />

        {view === 'sent' ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 16, textAlign: 'center' }}>📬</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center' }}>
              Check Your Email
            </h2>
            <p style={{ fontSize: 11, color: '#71717a', lineHeight: 1.7, textAlign: 'center', margin: '0 0 24px' }}>
              We sent a reset link to <strong style={{ color: '#a1a1aa' }}>{email}</strong>.
              Click it to set a new password.
            </p>
            <button onClick={() => { setView('signin'); setError('') }} style={BTN_GHOST}>
              Back to Sign In
            </button>
          </>
        ) : view === 'forgot' ? (
          <>
            <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              Password reset
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 28px' }}>
              Forgot Password
            </h2>
            <ErrorMsg msg={error} />
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              <div>
                <Label>Email</Label>
                <input
                  style={INPUT} type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus
                />
              </div>
              <button type="submit" style={{ ...BTN_GREEN, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { setView('signin'); setError('') }} style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                ← Back to Sign In
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              Welcome back
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 28px' }}>
              Sign In
            </h2>
            <ErrorMsg msg={error} />
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8 }}>
              <div>
                <Label>Email</Label>
                <input
                  style={INPUT} type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus
                />
              </div>
              <div>
                <Label>Password</Label>
                <input
                  style={INPUT} type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" style={{ ...BTN_GREEN, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                {loading ? 'Signing In…' : 'Sign In'}
              </button>
            </form>
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <button onClick={() => { setView('forgot'); setError('') }} style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', letterSpacing: '0.05em' }}>
                Forgot password?
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#52525b' }}>
              No account?{' '}
              <button onClick={() => openModal('join')} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700 }}>
                Join Free →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Join Modal ───────────────────────────────────────────────────────────────

function JoinModal() {
  const { openModal, closeModal } = useAuth()
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setError(error.message)
        return
      }
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={OVERLAY}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={closeModal} />
      <div style={PANEL}>
        <CloseBtn />

        {done ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 16, textAlign: 'center' }}>📬</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center' }}>
              Check Your Email
            </h2>
            <p style={{ fontSize: 11, color: '#71717a', lineHeight: 1.7, textAlign: 'center', margin: '0 0 24px' }}>
              We sent a confirmation link to <strong style={{ color: '#a1a1aa' }}>{email}</strong>.
              Click it to activate your account, then sign in.
            </p>
            <button onClick={() => openModal('login')} style={BTN_GREEN}>
              Go to Sign In
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              Free forever
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 28px' }}>
              Create Account
            </h2>
            <ErrorMsg msg={error} />
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <Label>Display Name <span style={{ color: '#3f3f46', fontWeight: 400 }}>(optional)</span></Label>
                <input
                  style={INPUT} type="text" placeholder="e.g. SharpBettor99"
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                  maxLength={40} autoFocus
                />
              </div>
              <div>
                <Label>Email</Label>
                <input
                  style={INPUT} type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Password</Label>
                <input
                  style={INPUT} type="password" placeholder="Min. 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" style={{ ...BTN_GREEN, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                {loading ? 'Creating Account…' : 'Create Free Account'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <button onClick={() => openModal('pro')} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, letterSpacing: '0.06em' }}>
                Or go Pro →
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#52525b' }}>
              Already have an account?{' '}
              <button onClick={() => openModal('login')} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700 }}>
                Sign in →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Pro Modal ────────────────────────────────────────────────────────────────

const PRO_FEATURES = [
  'Full game history — all seasons, all teams',
  'All 9 betting metrics unlocked',
  'Advanced filters & custom date ranges',
  'Streak leaderboard & trend alerts',
  'CSV export + API access',
  'Priority support',
]

function ProModal() {
  const { closeModal } = useAuth()
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  const handleStart = () => {
    closeModal()
    router.push('/pricing')
  }

  const PLANS = [
    { key: 'monthly' as const, period: 'Monthly', price: '$12', sub: '/month' },
    { key: 'annual'  as const, period: 'Annual',  price: '$79', sub: '/year', badge: 'SAVE 45%' },
  ]

  return (
    <div style={OVERLAY}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={closeModal} />
      <div style={{ ...PANEL, maxWidth: 500 }}>
        <CloseBtn />
        <div style={{ fontSize: 9, color: '#8b5cf6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Unlock everything</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>Go Pro</h2>

        <div style={{ display: 'flex', gap: 12, marginBottom: 28, marginTop: 20 }}>
          {PLANS.map(({ key, period, price, sub, badge }) => {
            const selected = billing === key
            return (
              <div
                key={key}
                onClick={() => setBilling(key)}
                style={{
                  flex: 1, borderRadius: 10, padding: '16px 14px', cursor: 'pointer',
                  position: 'relative', transition: 'all 0.15s',
                  border: selected
                    ? '2px solid #8b5cf6'
                    : '1px solid #2a2a34',
                  background: selected ? '#8b5cf60d' : 'transparent',
                  boxShadow: selected ? '0 0 12px #8b5cf622' : 'none',
                }}
              >
                {badge && (
                  <div style={{ position: 'absolute', top: -10, right: 10, background: '#8b5cf6', color: '#fff', fontSize: 8, fontWeight: 900, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 4 }}>
                    {badge}
                  </div>
                )}
                <div style={{ fontSize: 10, color: selected ? '#a78bfa' : '#71717a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{period}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#f4f4f5', lineHeight: 1 }}>
                  {price}<span style={{ fontSize: 12, color: '#52525b', fontWeight: 500 }}>{sub}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {PRO_FEATURES.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#a1a1aa' }}>
              <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>
              {f}
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          style={BTN_GREEN}
        >
          Start Pro — 3 Days Free
        </button>

        <div style={{ display: 'flex', gap: 16, marginTop: 20, justifyContent: 'center' }}>
          <button style={BTN_GHOST} onClick={closeModal}>Free Plan</button>
        </div>

        <p style={{ fontSize: 9, color: '#3f3f46', textAlign: 'center', marginTop: 16, letterSpacing: '0.1em' }}>
          Card required · Cancel before day 3 and you won&apos;t be charged
        </p>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AuthModals() {
  const { modal } = useAuth()
  if (!modal) return null
  if (modal === 'login') return <LoginModal />
  if (modal === 'join')  return <JoinModal />
  if (modal === 'pro')   return <ProModal />
  return null
}
