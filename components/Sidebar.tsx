'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',             label: 'Home'      },
  { href: '/todays-board', label: 'Streaks'   },
  { href: '/schedule',     label: 'Schedule'  },
  { href: '/teams',        label: 'Teams'     },
  { href: '/community',    label: 'Community' },
  { href: '/favorites',    label: 'Favorites' },
  { href: '/compare',      label: 'Compare'   },
  { href: '/news',         label: 'News'      },
  { href: '/pricing',      label: 'Pricing'   },
  { href: '/faq',          label: 'FAQ'       },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside style={{
      position: 'fixed', top: 64, left: 0, bottom: 0,
      width: 64, background: '#08080d',
      borderRight: '1px solid #1a1a24',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 16, gap: 16, zIndex: 40,
    }}>
      {LINKS.map(({ href, label }) => {
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
              justifyContent: 'center',
              height: 36, width: '100%',
              color: active ? '#22c55e' : '#ffffff',
              background: active ? '#22c55e0d' : 'transparent',
              borderLeft: active ? '2px solid #22c55e' : '2px solid transparent',
              transition: 'all 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.color = '#d4d4d8' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.color = '#ffffff' }}
            >
              <span style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-nunito), sans-serif' }}>
                {label}
              </span>
            </div>
          </Link>
        )
      })}
    </aside>
  )
}
