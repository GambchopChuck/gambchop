'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LEAGUES } from '@/lib/leagues-data'

const FEATURES = [
  { href: '/todays-board',       label: "Today's Board" },
  { href: '/streak-leaderboard', label: 'Streak Leaders' },
  { href: '/community',          label: 'Community'      },
]

export default function SubNav() {
  const path = usePathname()

  return (
    <div style={{
      borderBottom: '1px solid #14141c',
      background: '#0a0a0f',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        maxWidth: 1400, margin: '0 auto',
        paddingLeft: 64 + 16, paddingRight: 24,
        height: 36,
        whiteSpace: 'nowrap',
      }}>
        {/* Feature links */}
        {FEATURES.map(({ href, label }) => {
          const active = path === href
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <span style={{
                fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: active ? '#22c55e' : '#52525b',
                fontWeight: active ? 700 : 500,
                padding: '0 14px', lineHeight: '36px', display: 'inline-block',
                borderBottom: active ? '2px solid #22c55e' : '2px solid transparent',
                transition: 'color 0.15s',
              }}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* Divider */}
        <span style={{ color: '#1a1a24', padding: '0 8px', fontSize: 12 }}>|</span>

        {/* League links */}
        {LEAGUES.map(l => {
          const active = path.startsWith(`/leagues/${l.id}`)
          return (
            <Link key={l.id} href={l.href} style={{ textDecoration: 'none' }}>
              <span style={{
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: active ? l.accent : '#52525b',
                fontWeight: active ? 700 : 500,
                padding: '0 12px', lineHeight: '36px', display: 'inline-block',
                borderBottom: active ? `2px solid ${l.accent}` : '2px solid transparent',
                transition: 'color 0.15s',
              }}>
                {l.name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
