'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

// Tune this single value (0.10–0.25) to adjust background image visibility
const BG_OPACITY = 0.15

interface League {
  id: string
  name: string
  full: string
  emoji: string
  accent: string
  description: string
  teams: number
  href: string
  badge?: string        // override computed badge label
  badgeAccent?: boolean // style badge with accent color instead of white
  cta?: string          // override CTA label
}

// White text for legibility on the dark overlay that sits over the card background
const t = (extra?: object) => ({
  color: '#ffffff',
  fontFamily: 'var(--font-instrument-serif), serif',
  fontWeight: 400,
  ...extra,
})

export default function LeagueCard({ league }: { league: League }) {
  const [imgError, setImgError] = useState(false)

  const badgeLabel = league.badge ?? (
    league.id === 'atp' ? 'ATP Tour' :
    league.id === 'wta' ? 'WTA Tour' :
    `${league.teams}+ Teams`
  )

  const ctaText = league.cta ?? (league.href !== '#' ? 'View Analysis →' : 'Coming Soon')

  return (
    <Link href={league.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
      <div
        className="league-card"
        style={{
          // --accent drives the CSS-class background, border, glow, and animation
          '--accent': league.accent,
          borderRadius: 12,
          padding: '12px 24px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',   // clips image to rounded corners; box-shadow glow is unaffected
          boxSizing: 'border-box',
          flex: 1,
        } as React.CSSProperties}
      >
        {/* ── Background sport image ────────────────────────────────────────────
            Absolutely fills the card behind all content. Gracefully absent if
            the file is missing — no broken-image artifact, card renders normally. */}
        {!imgError && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <Image
              src={`/images/leagues/${league.id}.jpg`}
              alt=""
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
              style={{ objectFit: 'cover', opacity: BG_OPACITY }}
              onError={() => setImgError(true)}
            />
          </div>
        )}

        {/* ── Dark gradient overlay ─────────────────────────────────────────────
            Sits above the image but below the content. */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.84) 100%)',
          pointerEvents: 'none',
        }} />

        {/* ── Card content ─────────────────────────────────────────────────────
            Rendered above both the image and the overlay. */}
        <div style={{ paddingLeft: 4, position: 'relative', zIndex: 2 }}>

          {/* Header row: subtitle + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={t({ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                {league.full}
              </div>
            </div>

            {/* Badge */}
            <div style={t({
              fontSize: 10,
              background: league.badgeAccent ? `${league.accent}22` : 'rgba(255,255,255,.12)',
              border: league.badgeAccent ? `1px solid ${league.accent}88` : undefined,
              color: league.badgeAccent ? league.accent : '#ffffff',
              padding: '4px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              marginLeft: 8,
              flexShrink: 0,
            })}>
              {badgeLabel}
            </div>
          </div>

          {/* Description — clamped to 2 lines to keep tiles compact */}
          <p style={t({
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.3,
            margin: 0,
            letterSpacing: '0.02em',
            display: '-webkit-box' as React.CSSProperties['display'],
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          } as React.CSSProperties)}>
            {league.description}
          </p>

          {/* CTA */}
          <div style={{ marginTop: 6 }}>
            <span style={t({ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' })}>
              {ctaText}
            </span>
          </div>

        </div>
      </div>
    </Link>
  )
}
