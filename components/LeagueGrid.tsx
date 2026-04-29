'use client'

import { useState } from 'react'
import LeagueCard from './LeagueCard'
import { LEAGUES } from '@/lib/leagues-data'

const INITIAL_SHOW = 6

export default function LeagueGrid() {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? LEAGUES : LEAGUES.slice(0, INITIAL_SHOW)
  const hidden = LEAGUES.length - INITIAL_SHOW

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Browse</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            Leagues
          </h2>
        </div>
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            background: 'none', border: '1px solid #2a2a34', borderRadius: 6,
            color: '#a1a1aa', fontSize: 11, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600,
            padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {showAll ? 'Show Less ↑' : `See All ${hidden} More →`}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {visible.map(league => (
          <LeagueCard
            key={league.id}
            league={{
              id: league.id,
              name: league.name,
              full: league.full,
              emoji: league.emoji,
              accent: league.accent,
              description: league.description,
              teams: league.entities.length,
              href: league.href,
            }}
          />
        ))}
      </div>
    </section>
  )
}
