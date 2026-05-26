'use client'

import { useState } from 'react'
import { useFilters } from '@/lib/filter-context'
import LeagueCard from './LeagueCard'
import FiltersDropdown from './FiltersDropdown'
import { LEAGUES } from '@/lib/leagues-data'

// Display order: Row 1 MLB/NBA/NFL/NHL · Row 2 WNBA/NCAAF/NCAAB/NCAAWB · Row 3 ATP/WTA/NCAABL/Streaks
const LEAGUE_ORDER = ['mlb', 'nba', 'nfl', 'nhl', 'wnba', 'ncaaf', 'ncaab', 'ncaawb', 'atp', 'wta', 'ncaabl']

const STREAKS_TILE = {
  id: 'streaks',
  name: 'Streaks on Streaks',
  full: 'Across All Leagues',
  emoji: '',
  accent: '#22c55e',
  description: 'Every active streak across MLB, NBA, NFL and beyond — sorted, ranked, and updated.',
  teams: 0,
  href: '/todays-board',
  badge: 'Featured',
  badgeAccent: true as const,
  cta: 'View Streaks →',
}

export default function LeagueGrid() {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { activeCount } = useFilters()

  const orderedLeagues = LEAGUE_ORDER
    .map(id => LEAGUES.find(l => l.id === id))
    .filter((l): l is (typeof LEAGUES)[number] => l != null)
    .map(l => ({
      id: l.id,
      name: l.name,
      full: l.full,
      emoji: l.emoji,
      accent: l.accent,
      description: l.description,
      teams: l.entities.length,
      href: l.href,
    }))

  const allTiles = [...orderedLeagues, STREAKS_TILE]

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>

      {/* Background video */}
      <video
        autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18, zIndex: 0 }}
      >
        <source src="/images/002_A_person_stands_in_a_dimly_lit_room_their_GScRIkW0.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.72) 100%)', zIndex: 0 }} />

    <section style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 80px', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, color: '#ffffff', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-nunito), sans-serif' }}>Browse</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-nunito), sans-serif' }}>
            Leagues
          </h2>
        </div>
        <button
          onClick={() => setFiltersOpen(v => !v)}
          style={{
            background: filtersOpen ? '#22c55e18' : 'none',
            border: `1px solid ${filtersOpen ? '#22c55e55' : '#1a1a24'}`,
            borderRadius: 5,
            color: filtersOpen ? '#22c55e' : '#ffffff',
            cursor: 'pointer',
            fontFamily: 'var(--font-nunito), sans-serif',
            fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '4px 10px', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span>◧</span>
          <span>Filters</span>
          {activeCount > 0 && (
            <span style={{
              background: '#22c55e', borderRadius: '50%',
              width: 14, height: 14, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 8, color: '#000', fontWeight: 900,
            }}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {filtersOpen && <FiltersDropdown onClose={() => setFiltersOpen(false)} />}

      <div className="league-grid" style={{ marginTop: filtersOpen ? 16 : 0 }}>
        {allTiles.map(tile => (
          <LeagueCard key={tile.id} league={tile} />
        ))}
      </div>
    </section>
    </div>
  )
}
