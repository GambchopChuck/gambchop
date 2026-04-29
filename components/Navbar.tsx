'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const NAV_LINKS = [
  { label: 'Leagues',    href: '/'            },
  { label: 'Community',  href: '/community'   },
  { label: 'Merchandise',href: '/merchandise' },
  { label: 'News',       href: '/news'        },
  { label: 'Filters',    href: '/filters'     },
] as const

export default function Navbar() {
  const { openModal } = useAuth()

  return (
    <header style={{ borderBottom: '1px solid #1a1a24', background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 0 80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

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
            <Link
              key={label}
              href={href}
              style={{
                textDecoration: 'none', color: '#52525b',
                fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                fontWeight: 600, padding: '6px 12px', borderRadius: 6,
                transition: 'color 0.15s',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => openModal('login')}
            style={{
              background: 'none', border: 'none', color: '#52525b',
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              fontWeight: 600, padding: '6px 12px', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'color 0.15s',
            }}
          >
            Login
          </button>
          <button
            onClick={() => openModal('join')}
            style={{
              background: 'none', border: '1px solid #2a2a34', borderRadius: 6,
              color: '#a1a1aa', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              fontWeight: 700, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            Join Free
          </button>
          <button
            onClick={() => openModal('pro')}
            style={{
              border: 'none', borderRadius: 6,
              color: '#000', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              fontWeight: 900, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              boxShadow: '0 0 16px rgba(34,197,94,0.4)',
            }}
          >
            Go Pro
          </button>
        </div>
      </div>
    </header>
  )
}
