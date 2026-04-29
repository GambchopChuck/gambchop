'use client'

import Link from 'next/link'
import { useState } from 'react'

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

export default function LeagueCard({ league }: { league: League }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={league.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? '#131318' : '#0f0f14',
          border: `1px solid ${hovered ? league.accent + '55' : '#1a1a24'}`,
          borderRadius: 12, padding: '24px 20px', cursor: 'pointer',
          transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hovered ? `0 8px 32px ${league.accent}18` : 'none',
          height: '100%', boxSizing: 'border-box',
        }}
      >
        {/* Left accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: league.accent, borderRadius: '12px 0 0 12px', opacity: 0.85 }} />

        <div style={{ paddingLeft: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>{league.emoji}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {league.name}
                </div>
                <div style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                  {league.full}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: league.accent, fontWeight: 700, letterSpacing: '0.1em', background: league.accent + '18', padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {league.id === 'atp' ? 'ATP Tour' : league.id === 'wta' ? 'WTA Tour' : `${league.teams}+ ${league.id === 'wnba' || league.id === 'mlb' || league.id === 'nba' || league.id === 'nhl' || league.id === 'nfl' ? 'Teams' : 'Teams'}`}
            </div>
          </div>

          <p style={{ fontSize: 12, color: '#71717a', lineHeight: 1.65, margin: 0, letterSpacing: '0.02em' }}>
            {league.description}
          </p>

          <div style={{ marginTop: 16 }}>
            <span style={{ fontSize: 11, color: hovered ? league.accent : '#52525b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s' }}>
              {league.id === 'mlb' || league.href !== '#' ? 'View Analysis →' : 'Coming Soon'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
