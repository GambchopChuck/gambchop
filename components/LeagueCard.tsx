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
}

// White text for legibility on the dark overlay that sits over the card background
const t = (extra?: object) => ({
  color: '#ffffff',
  fontFamily: 'var(--font-nunito), sans-serif',
  fontWeight: 700,
  ...extra,
})

export default function LeagueCard({ league }: { league: League }) {
  const [imgError, setImgError] = useState(false)

  const badgeLabel =
    league.id === 'atp' ? 'ATP Tour' :
    league.id === 'wta' ? 'WTA Tour' :
    `${league.teams}+ Teams`

  return (
    <Link href={league.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        className="league-card"
        style={{
          // --accent drives the CSS-class background, border, glow, and animation
          '--accent': league.accent,
          borderRadius: 12,
          padding: '24px 20px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',   // clips image to rounded corners; box-shadow glow is unaffected
          height: '100%',
          boxSizing: 'border-box',
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
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
              style={{ objectFit: 'cover', opacity: BG_OPACITY }}
              onError={() => setImgError(true)}
            />
          </div>
        )}

        {/* ── Dark gradient overlay ─────────────────────────────────────────────
            Sits above the image but below the content.  Slightly stronger toward
            the bottom where the description text sits. */}
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

          {/* Header row: name / subtitle + badge  (emoji icon removed) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={t({ fontSize: 16, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' })}>
                {league.name}
              </div>
              <div style={t({ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 })}>
                {league.full}
              </div>
            </div>

            {/* Badge */}
            <div style={t({
              fontSize: 10,
              background: 'rgba(255,255,255,.12)',
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
