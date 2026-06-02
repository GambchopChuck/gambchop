'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  fontFamily: 'var(--font-oswald), "Oswald", sans-serif', boxSizing: 'border-box',
}

function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials'))  return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed'))         return 'Please verify your email before signing in.'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts — please wait a moment.'
  return msg
}

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(friendlyError(error.message)); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: 16, padding: '40px 36px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{
            fontSize: 18, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #22c55e 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Gambchop</span>
        </div>

        <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
          Welcome back
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 28px' }}>
          Sign In
        </h1>

        {error && (
          <div style={{ background: '#ef444418', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#ef4444', letterSpacing: '0.03em', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8 }}>
          <div>
            <label style={{ display: 'block', fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
              Email
            </label>
            <input
              style={INPUT} type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
              Password
            </label>
            <input
              style={INPUT} type="password" placeholder="••••••••"
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
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <Link href="/auth/forgot-password" style={{ color: MUTED, fontSize: 10, textDecoration: 'none', letterSpacing: '0.05em' }}>
            Forgot password?
          </Link>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: MUTED }}>
          No account?{' '}
          <Link href="/auth/signup" style={{ color: GREEN, fontWeight: 700, textDecoration: 'none' }}>
            Join Free →
          </Link>
        </div>
      </div>
    </div>
  )
}
