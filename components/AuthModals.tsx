'use client'

import { useAuth } from '@/lib/auth-context'

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

// ─── Login Modal ──────────────────────────────────────────────────────────────

function LoginModal() {
  const { openModal, closeModal } = useAuth()
  return (
    <div style={OVERLAY} onClick={closeModal}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <CloseBtn />
        <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Welcome back</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 28px' }}>Sign In</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <Label>Email</Label>
            <input style={INPUT} type="email" placeholder="you@example.com" />
          </div>
          <div>
            <Label>Password</Label>
            <input style={INPUT} type="password" placeholder="••••••••" />
          </div>
        </div>

        <button style={BTN_GREEN}>Sign In</button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#52525b' }}>
          No account?{' '}
          <button onClick={() => openModal('join')} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700 }}>
            Join Free →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Join Modal ───────────────────────────────────────────────────────────────

function JoinModal() {
  const { openModal, closeModal } = useAuth()
  return (
    <div style={OVERLAY} onClick={closeModal}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <CloseBtn />
        <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Free forever</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 28px' }}>Create Account</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <Label>Email</Label>
            <input style={INPUT} type="email" placeholder="you@example.com" />
          </div>
          <div>
            <Label>Password</Label>
            <input style={INPUT} type="password" placeholder="••••••••" />
          </div>
        </div>

        <button style={BTN_GREEN}>Create Free Account</button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={() => openModal('pro')} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, letterSpacing: '0.06em' }}>
            Or go Pro →
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#52525b' }}>
          Already have an account?{' '}
          <button onClick={() => openModal('login')} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700 }}>
            Sign in →
          </button>
        </div>
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
  return (
    <div style={OVERLAY} onClick={closeModal}>
      <div style={{ ...PANEL, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <CloseBtn />
        <div style={{ fontSize: 9, color: '#8b5cf6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Unlock everything</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>Go Pro</h2>

        {/* Pricing */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, marginTop: 20 }}>
          {[
            { period: 'Monthly', price: '$12', sub: '/month' },
            { period: 'Annual', price: '$79', sub: '/year', badge: 'SAVE 45%' },
          ].map(({ period, price, sub, badge }) => (
            <div key={period} style={{
              flex: 1, border: `1px solid ${badge ? '#8b5cf6' : '#2a2a34'}`,
              borderRadius: 10, padding: '16px 14px', cursor: 'pointer',
              background: badge ? '#8b5cf60d' : 'transparent',
              position: 'relative',
            }}>
              {badge && (
                <div style={{ position: 'absolute', top: -10, right: 10, background: '#8b5cf6', color: '#fff', fontSize: 8, fontWeight: 900, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 4 }}>
                  {badge}
                </div>
              )}
              <div style={{ fontSize: 10, color: '#71717a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{period}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#f4f4f5', lineHeight: 1 }}>{price}<span style={{ fontSize: 12, color: '#52525b', fontWeight: 500 }}>{sub}</span></div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {PRO_FEATURES.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#a1a1aa' }}>
              <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>
              {f}
            </div>
          ))}
        </div>

        <button style={BTN_GREEN}>Start Pro — 7 Days Free</button>

        <div style={{ display: 'flex', gap: 16, marginTop: 20, justifyContent: 'center' }}>
          <button style={BTN_GHOST}>Free Plan</button>
        </div>

        <p style={{ fontSize: 9, color: '#3f3f46', textAlign: 'center', marginTop: 16, letterSpacing: '0.1em' }}>
          Cancel anytime · No credit card for free trial
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
