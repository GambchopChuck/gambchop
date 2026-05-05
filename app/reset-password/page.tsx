'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const GREEN  = '#22c55e'
const RED    = '#ef4444'

const INPUT: React.CSSProperties = {
  width: '100%', background: '#0c0c10', border: '1px solid #2a2a34',
  borderRadius: 8, padding: '12px 14px', color: TEXT,
  fontSize: 12, letterSpacing: '0.04em', outline: 'none',
  fontFamily: 'var(--font-geist-mono), monospace', boxSizing: 'border-box',
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready,    setReady]    = useState(false)   // true once PASSWORD_RECOVERY event fires
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    // Supabase emits PASSWORD_RECOVERY when the user arrives via the reset email link.
    // The client automatically exchanges the token from the URL hash into a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/'), 2500)
  }

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 420,
      }}>
        {done ? (
          <>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center' }}>
              Password Updated
            </h2>
            <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, textAlign: 'center' }}>
              Your password has been changed. Redirecting you home…
            </p>
          </>
        ) : !ready ? (
          <>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>🔗</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center' }}>
              Waiting for Link
            </h2>
            <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, textAlign: 'center' }}>
              Open the reset link from your email in this same browser.
              This page will update automatically.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              Set new password
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 28px' }}>
              Reset Password
            </h2>

            {error && (
              <div style={{
                background: `${RED}18`, border: `1px solid ${RED}44`, borderRadius: 8,
                padding: '10px 14px', fontSize: 11, color: RED,
                letterSpacing: '0.03em', marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                  New Password
                </label>
                <input
                  style={INPUT} type="password" placeholder="Min. 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Confirm Password
                </label>
                <input
                  style={INPUT} type="password" placeholder="Re-enter password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', borderRadius: 8, border: 'none',
                  background: `linear-gradient(135deg, ${GREEN}, #16a34a)`,
                  color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
                  textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: `0 0 20px ${GREEN}55`,
                  fontFamily: 'var(--font-geist-mono), monospace',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Updating…' : 'Set New Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
