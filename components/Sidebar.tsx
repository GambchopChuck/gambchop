'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',                    icon: '◈', label: 'Home'      },
  { href: '/todays-board',        icon: '▦', label: 'Board'     },
  { href: '/streak-leaderboard',  icon: '▲', label: 'Streaks'   },
  { href: '/filters',             icon: '◧', label: 'Filters'   },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside style={{
      position: 'fixed', top: 64, left: 0, bottom: 0,
      width: 64, background: '#08080d',
      borderRight: '1px solid #1a1a24',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 16, gap: 4, zIndex: 40,
    }}>
      {LINKS.map(({ href, icon, label }) => {
        const active = path === href
        return (
          <Link
            key={href}
            href={href}
            title={label}
            style={{ textDecoration: 'none', width: '100%' }}
          >
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4,
              height: 56, width: '100%',
              color: active ? '#22c55e' : '#3f3f46',
              background: active ? '#22c55e0d' : 'transparent',
              borderLeft: active ? '2px solid #22c55e' : '2px solid transparent',
              transition: 'all 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.color = '#71717a' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.color = '#3f3f46' }}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {label}
              </span>
            </div>
          </Link>
        )
      })}
    </aside>
  )
}
