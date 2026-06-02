'use client'

import { useState } from 'react'
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
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts — please wait a moment.'
  if (msg.includes('Unable to validate'))          return 'Invalid or expired link. Please request a new one.'
  return msg
}

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) { setError(friendlyError(error.message)); return }
    setSent(true)
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
        {sent ? (
          <>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>📬</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center' }}>
              Check Your Email
            </h2>
            <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, textAlign: 'center', margin: '0 0 24px' }}>
              We sent a reset link to{' '}
              <strong style={{ color: '#ffffff' }}>{email}</strong>.
              Click it to set a new password.
            </p>
            <Link href="/auth/login" style={{
              display: 'block', width: '100%', padding: '12px', borderRadius: 8,
              border: '1px solid #2a2a34', background: 'transparent',
              color: '#ffffff', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', textDecoration: 'none', textAlign: 'center',
              boxSizing: 'border-box', fontFamily: 'var(--font-geist-mono), monospace',
            }}>
              Back to Sign In
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

            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              Password reset
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 28px' }}>
              Forgot Password
            </h1>

            {error && (
              <div style={{ background: '#ef444418', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#ef4444', letterSpacing: '0.03em', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
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
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ textAlign: 'center' }}>
              <Link href="/auth/login" style={{ color: MUTED, fontSize: 11, textDecoration: 'none' }}>
                ← Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
