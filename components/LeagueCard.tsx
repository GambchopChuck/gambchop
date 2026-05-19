'use client'

import Link from 'next/link'

interface League {
  id: string
  name: string
  full: string
  emoji: string
  accent: string
  description: string
  teams: number
  href: string
}

// Shared text style: Nunito, black, bold — applied to all card text
const t = (extra?: object) => ({
  color: '#000000',
  fontFamily: 'var(--font-nunito), sans-serif',
  fontWeight: 700,
  ...extra,
})

export default function LeagueCard({ league }: { league: League }) {
  const badgeLabel =
    league.id === 'atp' ? 'ATP Tour' :
    league.id === 'wta' ? 'WTA Tour' :
    `${league.teams}+ Teams`

  return (
    <Link href={league.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        className="league-card"
        style={{
          // --accent drives all CSS-class rules (background, border, shadows, animation)
          '--accent': league.accent,
          borderRadius: 12,
          padding: '24px 20px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
          boxSizing: 'border-box',
        } as React.CSSProperties}
      >
        <div style={{ paddingLeft: 4 }}>

          {/* Header row: emoji + name/subtitle + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>{league.emoji}</span>
              <div>
                <div style={t({ fontSize: 16, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' })}>
                  {league.name}
                </div>
                <div style={t({ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 })}>
                  {league.full}
                </div>
              </div>
            </div>

            {/* Badge — dark fill so black text stays legible on bright gradient */}
            <div style={t({
              fontSize: 10,
              background: 'rgba(0,0,0,.16)',
              padding: '4px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            })}>
              {badgeLabel}
            </div>
          </div>

          {/* Description */}
          <p style={t({ fontSize: 12, fontWeight: 600, lineHeight: 1.65, margin: 0, letterSpacing: '0.02em' })}>
            {league.description}
          </p>

          {/* CTA */}
          <div style={{ marginTop: 16 }}>
            <span style={t({ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' })}>
              {league.href !== '#' ? 'View Analysis →' : 'Coming Soon'}
            </span>
          </div>

        </div>
      </div>
    </Link>
  )
}
