'use client'

import { useState, useEffect, useMemo } from 'react'
import { type TimeRange, RANGE_OPTIONS } from '@/lib/time-range'
import {
  fetchLeaderboardData,
  computeLeagueStats,
  type TeamSummary,
  type LeagueStats,
} from '@/lib/leaderboard-data'
import { StatCard } from '@/components/StatSummaryCards'
import type { LeaderboardCategory } from '@/lib/mockLeaderboard'
import Podium from './Podium'
import RankedList from './RankedList'

// ─── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  sec:      '#A1A1AA',
  pri:      '#F5F5F4',
  hairline: '#1F1F23',
  green:    '#22C55E',
  muted:    '#52525b',
  card:     '#0f0f14',
  border:   '#1a1a24',
}
const SANS   = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO   = 'var(--font-jetbrains), "JetBrains Mono", monospace'
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'

// ─── Time frame toggle (identical pill style to /compare) ────────────────────

function TimeFrameToggle({ value, onChange }: { value: TimeRange; onChange: (r: TimeRange) => void }) {
  const ACCENT = '#39ff9a'
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      gap: 4, padding: '0 0 20px', flexWrap: 'wrap',
    }}>
      {RANGE_OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              background:    active ? ACCENT      : 'transparent',
              color:         active ? '#000'       : '#71717a',
              border:        active ? 'none'       : '1px solid transparent',
              borderRadius:  6,
              padding:       '5px 16px',
              fontSize:      12,
              fontWeight:    700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor:        'pointer',
              fontFamily:    MONO,
              transition:    'all 0.15s',
              boxShadow:     active ? `0 0 12px ${ACCENT}55` : 'none',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#d4d4d8' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#71717a' }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── League stat summary bar ──────────────────────────────────────────────────

function LeagueStatBar({ stats, loading }: { stats: LeagueStats | null; loading: boolean }) {
  const GREEN  = '#22c55e'
  const PURPLE = '#8b5cf6'

  const cards = stats ? [
    { label: 'Total Games',     value: stats.totalGames.toLocaleString(),                      color: GREEN  },
    { label: 'Avg Win Rate',    value: stats.avgWinRate > 0 ? `${(stats.avgWinRate * 100).toFixed(1)}%` : '—', color: GREEN  },
    { label: 'Most Wins',       value: stats.mostWinsCount > 0 ? `${stats.mostWinsTeam.split(' ').slice(-1)[0]} · ${stats.mostWinsCount}` : '—', color: GREEN  },
    { label: 'Hot Streak',      value: stats.longestStreakTeam !== '—' ? `${stats.longestStreakTeam} ${stats.longestStreakLabel}` : '—', color: PURPLE },
  ] : null

  return (
    <div style={{ marginBottom: 20 }}>
      {loading || !cards ? (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              flex: '1 1 0', minWidth: 0,
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: '14px 18px', textAlign: 'center',
            }}>
              <div style={{ height: 22, background: '#1a1a24', borderRadius: 4, margin: '0 auto', width: '60%' }} />
              <div style={{ height: 9, background: '#1a1a24', borderRadius: 4, margin: '6px auto 0', width: '40%' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cards.map(c => <StatCard key={c.label} label={c.label} value={c.value} color={c.color} />)}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CategoryPills() {
  const [range,            setRange]            = useState<TimeRange>('last-30')
  const [activeCategoryId, setActiveCategoryId] = useState('most-ml-wins')
  const [categories,       setCategories]       = useState<LeaderboardCategory[]>([])
  const [teamStats,        setTeamStats]        = useState<TeamSummary[]>([])
  const [totalGames,       setTotalGames]       = useState(0)
  const [loading,          setLoading]          = useState(true)

  // Fetch real data whenever range changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchLeaderboardData(range).then(({ categories: cats, teamStats: ts, totalGames: tg }) => {
      if (cancelled) return
      setCategories(cats)
      setTeamStats(ts)
      setTotalGames(tg)
      // Keep active category if it still exists; otherwise reset to first
      if (cats.length && !cats.find(c => c.id === activeCategoryId)) {
        setActiveCategoryId(cats[0].id)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeCategory = categories.find(c => c.id === activeCategoryId) ?? null

  const leagueStats = useMemo<LeagueStats | null>(() => {
    if (!teamStats.length) return null
    return computeLeagueStats(teamStats, activeCategoryId, totalGames)
  }, [teamStats, activeCategoryId, totalGames])

  const rangeLabel = RANGE_OPTIONS.find(o => o.value === range)?.label ?? 'Last 30 Days'

  return (
    <div>
      <style>{`
        @media (max-width: 640px) {
          .stat-card { flex: 1 1 calc(50% - 4px) !important; }
        }
      `}</style>

      {/* Dynamic subtitle — updates as category changes */}
      {activeCategory && (
        <p style={{
          fontFamily: SANS, fontSize: 16, fontWeight: 400,
          color: T.sec, lineHeight: 1.6, margin: '0 0 4px',
        }}>
          Ranked by {activeCategory.label}
        </p>
      )}

      {/* Time frame toggle */}
      <TimeFrameToggle value={range} onChange={setRange} />

      {/* League-wide stat summary bar */}
      <LeagueStatBar stats={leagueStats} loading={loading} />

      {/* Category pills */}
      <div className="lb-pills-row">
        {(loading ? [] : categories).map(cat => {
          const isActive = cat.id === activeCategoryId
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              style={{
                fontFamily: SANS,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0A0A0B' : T.sec,
                background: isActive ? T.green : 'transparent',
                border: isActive ? `1.5px solid ${T.green}` : `1px solid ${T.hairline}`,
                borderRadius: isActive ? 8 : 6,
                padding: isActive ? '10px 18px' : '8px 14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 200ms ease-out',
                lineHeight: 1,
                boxShadow: isActive
                  ? '0 0 24px rgba(34,197,94,0.45), inset 0 0 12px rgba(34,197,94,0.15)'
                  : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = T.pri
                  el.style.borderColor = 'rgba(34,197,94,0.4)'
                  el.style.background = 'rgba(34,197,94,0.04)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = T.sec
                  el.style.borderColor = T.hairline
                  el.style.background = 'transparent'
                }
              }}
            >
              {cat.label}
            </button>
          )
        })}

        {loading && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', alignSelf: 'center', paddingLeft: 8 }}>
            Loading…
          </div>
        )}
      </div>

      {/* Podium — 48px below pills */}
      <div style={{ marginTop: 48, overflow: 'visible' }}>
        {activeCategory && !loading ? (
          <Podium category={activeCategory} rangeLabel={rangeLabel} />
        ) : (
          <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Loading leaderboard…
          </div>
        )}
      </div>

      {/* Ranked list (rows 4–30) */}
      {activeCategory && !loading && (
        <RankedList category={activeCategory} rangeLabel={rangeLabel} />
      )}
    </div>
  )
}
