'use client'

import { useState } from 'react'
import { useFilters } from '@/lib/filter-context'
import LeagueCard from './LeagueCard'
import FiltersDropdown from './FiltersDropdown'
import { LEAGUES } from '@/lib/leagues-data'

const INITIAL_SHOW = 6

export default function LeagueGrid() {
  const [showAll, setShowAll] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { activeCount } = useFilters()
  const visible = showAll ? LEAGUES : LEAGUES.slice(0, INITIAL_SHOW)

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, color: '#ffffff', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-nunito), sans-serif' }}>Browse</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-nunito), sans-serif' }}>
            Leagues
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              background: 'none', border: '1px solid #2a2a34', borderRadius: 6,
              color: '#ffffff', fontSize: 11, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontWeight: 600,
              padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-nunito), sans-serif',
            }}
          >
            {showAll ? 'Show Less ↑' : 'See more'}
          </button>
        </div>
      </div>

      {filtersOpen && <FiltersDropdown onClose={() => setFiltersOpen(false)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginTop: filtersOpen ? 16 : 0 }}>
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
