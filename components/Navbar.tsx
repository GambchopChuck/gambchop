'use client'

import Link from 'next/link'
import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const NAV_LINKS = [
  { label: 'Leagues',     href: '/'            },
  { label: 'Teams',       href: '/teams'       },
  { label: 'Community',   href: '/community'   },
  { label: 'Pricing',     href: '/pricing'     },
  { label: 'Merchandise', href: '/merchandise' },
  { label: 'News',        href: '/news'        },
  { label: 'Filters',     href: '/filters'     },
] as const

export default function Navbar() {
  const { openModal, isPro, memberTier, user, displayName } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef   = useRef<HTMLDivElement>(null)

  // Close the user menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await supabase.auth.signOut()
  }

  // Avatar initial: display name > email > fallback icon
  const initial = displayName
    ? displayName[0].toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : null

  return (
    <header style={{
      borderBottom: '1px solid #1a1a24',
      background: 'rgba(10,10,15,0.97)',
      backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '0 24px 0 80px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontSize: 22, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #22c55e 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 16px rgba(34,197,94,0.35)) drop-shadow(0 0 32px rgba(139,92,246,0.2))',
          }}>
            Gambchop
          </span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={label} href={href} style={{
              textDecoration: 'none', color: '#ffffff',
              fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              fontWeight: 600, padding: '6px 12px', borderRadius: 6,
              transition: 'color 0.15s',
              fontFamily: 'var(--font-nunito), sans-serif',
            }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {memberTier === 'none' ? (
            <>
              <button
                onClick={() => openModal('login')}
                style={{
                  background: 'none', border: 'none', color: '#ffffff',
                  fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontWeight: 600, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-nunito), sans-serif',
                }}
              >
                Login
              </button>
              <button
                onClick={() => openModal('join')}
                style={{
                  background: 'none', border: '1px solid #2a2a34', borderRadius: 6,
                  color: '#ffffff', fontSize: 11, letterSpacing: '0.1em',
                  textTransform: 'uppercase', fontWeight: 700, padding: '7px 14px',
                  cursor: 'pointer', fontFamily: 'var(--font-nunito), sans-serif',
                }}
              >
                Join Free
              </button>
              <button
                onClick={() => openModal('pro')}
                style={{
                  border: 'none', borderRadius: 6, color: '#000',
                  fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontWeight: 900, padding: '8px 16px', cursor: 'pointer',
                  fontFamily: 'var(--font-nunito), sans-serif',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: '0 0 16px rgba(34,197,94,0.4)',
                }}
              >
                Go Pro
              </button>
            </>
          ) : (
            <div ref={menuRef} style={{ position: 'relative' }}>
              {/* Avatar button */}
              <button
                onClick={() => setMenuOpen(v => !v)}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: initial
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : '#1a1a24',
                  border: '1px solid #22c55e44',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900, color: '#000',
                  cursor: 'pointer', boxShadow: '0 0 10px #22c55e33',
                  fontFamily: 'inherit',
                }}
                title={user?.email ?? 'Account'}
              >
                {initial ?? '👤'}
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: '#0f0f14', border: '1px solid #1a1a24',
                  borderRadius: 10, padding: 6, minWidth: 180,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  zIndex: 100,
                }}>
                  {/* Identity header */}
                  {(displayName || user?.email) && (
                    <div style={{
                      padding: '8px 12px 10px',
                      borderBottom: '1px solid #1a1a24', marginBottom: 4,
                    }}>
                      {displayName && (
                        <div style={{ fontSize: 11, color: '#f4f4f5', fontWeight: 700, letterSpacing: '0.03em', marginBottom: 2 }}>
                          {displayName}
                        </div>
                      )}
                      {user?.email && (
                        <div style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.03em', wordBreak: 'break-all' }}>
                          {user.email}
                        </div>
                      )}
                    </div>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      padding: '9px 12px', borderRadius: 7,
                      fontSize: 11, color: '#a1a1aa', letterSpacing: '0.06em',
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#1a1a24'; (e.currentTarget as HTMLDivElement).style.color = '#f4f4f5' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = '#a1a1aa' }}
                    >
                      My Profile
                    </div>
                  </Link>
                  {!isPro && (
                    <div
                      onClick={() => { setMenuOpen(false); openModal('pro') }}
                      style={{
                        padding: '9px 12px', borderRadius: 7,
                        fontSize: 11, color: '#8b5cf6', letterSpacing: '0.06em',
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#8b5cf614' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      Upgrade to Pro →
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #1a1a24', marginTop: 4, paddingTop: 4 }}>
                    <div
                      onClick={handleSignOut}
                      style={{
                        padding: '9px 12px', borderRadius: 7,
                        fontSize: 11, color: '#52525b', letterSpacing: '0.06em',
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#ef444414'; (e.currentTarget as HTMLDivElement).style.color = '#ef4444' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = '#52525b' }}
                    >
                      Sign Out
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
