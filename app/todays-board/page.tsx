'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchLeagueOutcomes, computeStreak } from '@/lib/chart-data'
import { LEAGUES, LEAGUE_MAP, generateChartData, slugify } from '@/lib/leagues-data'
import type { TeamChartData, GameEntry } from '@/lib/leagues-data'

const MIN_STREAK = 6

type StreakKind = 'moneyline' | 'spread' | 'over_under'
type SortMode   = 'az' | 'longest' | 'shortest' | 'hottest' | 'coldest'

interface StreakRow {
  leagueId:    string
  teamName:    string
  teamSlug:    string
  kind:        StreakKind
  streakType:  string
  streakCount: number
  games:       GameEntry[]
}

const KIND_LABEL: Record<StreakKind, string> = {
  moneyline:  'Moneyline',
  spread:     'Spread',
  over_under: 'Over / Under',
}

const SORT_LABELS: Record<SortMode, string> = {
  az:       'Alphabetical (League, then Team)',
  longest:  'Longest Streak First',
  shortest: 'Shortest Streak First',
  hottest:  'Hottest (Win / Cover / Over first)',
  coldest:  'Coldest (Loss / Under first)',
}

const LS_LEAGUE = 'gambchop-streakboard-league'
const LS_SORT   = 'gambchop-streakboard-sort'

const C_GREEN  = '#22c55e'
const C_RED    = '#ef4444'
const C_WHITE  = '#f4f4f5'
const C_VIOLET = '#8b5cf6'
const C_BROWN  = '#b45309'
const C_EMPTY  = '#131318'

function streakLabel(kind: StreakKind, type: string, count: number): string {
  if (kind === 'over_under') return `${type}${count}`
  if (kind === 'spread' && type === 'W') return `COV${count}`
  return `${type}${count}`
}

function streakColor(type: string): string {
  if (type === 'W' || type === 'O') return C_GREEN
  if (type === 'U') return C_BROWN
  return C_RED
}

function formatAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function GameCell({ game, kind }: { game: GameEntry; kind: StreakKind }) {
  const base: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 5, flexShrink: 0,
    fontSize: 8, letterSpacing: '0.08em', fontWeight: 800,
  }

  if (kind === 'over_under') {
    const r = game.ouResult
    if (!r)           return <div style={{ ...base, background: C_EMPTY, opacity: 0.3 }} />
    if (r === 'push') return <div style={{ ...base, background: C_WHITE }} />
    const over = r === 'over'
    return (
      <div style={{
        ...base,
        background: over ? C_VIOLET : C_BROWN,
        boxShadow:  over ? `0 0 10px ${C_VIOLET}90` : `0 0 10px ${C_BROWN}90`,
      }} />
    )
  }

  const r = kind === 'moneyline' ? game.moneylineResult : game.spreadResult
  if (!r)           return <div style={{ ...base, background: C_EMPTY, opacity: 0.3 }} />
  if (r === 'push') return <div style={{ ...base, background: C_WHITE, color: '#111' }}>P</div>
  const win = r === 'win'
  return (
    <div style={{
      ...base,
      background: win ? C_GREEN : C_RED,
      color:      win ? '#000'  : '#fff',
      boxShadow:  win ? `0 0 10px ${C_GREEN}80` : `0 0 10px ${C_RED}80`,
      fontSize:   win && kind === 'spread' ? 7 : 8,
    }}>
      {win ? (kind === 'spread' ? 'COV' : 'W') : 'L'}
    </div>
  )
}

export default function StreakBoardPage() {
  const router = useRouter()

  const [leagueDataMap, setLeagueDataMap] = useState<Map<string, TeamChartData[]>>(new Map())
  const [loading, setLoading]             = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null)
  const [leagueFilter, setLeagueFilter]   = useState('all')
  const [sortMode, setSortMode]           = useState<SortMode>('az')

  // Restore persisted controls
  useEffect(() => {
    const savedLeague = localStorage.getItem(LS_LEAGUE) ?? 'all'
    const savedSort   = localStorage.getItem(LS_SORT) as SortMode | null
    setLeagueFilter(savedLeague)
    if (savedSort && savedSort in SORT_LABELS) setSortMode(savedSort)
  }, [])

  const handleLeagueChange = (v: string) => {
    setLeagueFilter(v)
    localStorage.setItem(LS_LEAGUE, v)
  }

  const handleSortChange = (v: SortMode) => {
    setSortMode(v)
    localStorage.setItem(LS_SORT, v)
  }

  // Fetch all league data: MLB from Supabase, rest from mock generator
  const fetchAll = useCallback(async () => {
    const mlbData = await fetchLeagueOutcomes('mlb', 10)
    const map = new Map<string, TeamChartData[]>()
    map.set('mlb', mlbData.length ? mlbData : generateChartData(LEAGUE_MAP['mlb'].entities, 10))
    for (const l of LEAGUES) {
      if (l.id !== 'mlb') map.set(l.id, generateChartData(l.entities, 10))
    }
    setLeagueDataMap(map)
    setLastRefreshed(Date.now())
    setLoading(false)
  }, [])

  // Initial fetch + 5-minute interval + tab-focus re-fetch
  useEffect(() => {
    fetchAll()
    const timer  = setInterval(fetchAll, 300_000)
    const onShow = () => { if (document.visibilityState === 'visible') fetchAll() }
    document.addEventListener('visibilitychange', onShow)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onShow) }
  }, [fetchAll])

  // Compute qualifying streak rows across all leagues
  const streakRows = useMemo((): StreakRow[] => {
    const rows: StreakRow[] = []
    for (const [leagueId, teams] of leagueDataMap) {
      for (const team of teams) {
        for (const kind of ['moneyline', 'spread', 'over_under'] as StreakKind[]) {
          const s = computeStreak(team.games, kind)
          if (!s || s.count < MIN_STREAK) continue
          rows.push({
            leagueId, kind,
            teamName:    team.teamName,
            teamSlug:    slugify(team.teamName),
            streakType:  s.type,
            streakCount: s.count,
            games:       team.games.slice(-s.count),
          })
        }
      }
    }
    return rows
  }, [leagueDataMap])

  // Filter by league + sort
  const displayRows = useMemo(() => {
    const rows = leagueFilter === 'all'
      ? [...streakRows]
      : streakRows.filter(r => r.leagueId === leagueFilter)

    switch (sortMode) {
      case 'longest':
        return rows.sort((a, b) => b.streakCount - a.streakCount || a.teamName.localeCompare(b.teamName))
      case 'shortest':
        return rows.sort((a, b) => a.streakCount - b.streakCount || a.teamName.localeCompare(b.teamName))
      case 'hottest':
        return rows.sort((a, b) => {
          const h = (r: StreakRow) => ['W', 'O'].includes(r.streakType) ? 1 : 0
          return h(b) - h(a) || b.streakCount - a.streakCount
        })
      case 'coldest':
        return rows.sort((a, b) => {
          const c = (r: StreakRow) => ['L', 'U'].includes(r.streakType) ? 1 : 0
          return c(b) - c(a) || b.streakCount - a.streakCount
        })
      default: // 'az'
        return rows.sort((a, b) => {
          const l = a.leagueId.localeCompare(b.leagueId)
          return l !== 0 ? l : a.teamName.localeCompare(b.teamName)
        })
    }
  }, [streakRows, leagueFilter, sortMode])

  const selectSt: React.CSSProperties = {
    background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 6,
    color: '#a1a1aa', fontSize: 10, padding: '7px 10px',
    fontFamily: 'var(--font-geist-mono), monospace',
    cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a24', padding: '24px 24px 20px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C_GREEN, boxShadow: `0 0 8px ${C_GREEN}` }} />
            <span style={{ fontSize: 9, color: C_GREEN, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700 }}>Live</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Streak Board
          </h1>
          <p style={{ fontSize: 11, color: '#52525b', letterSpacing: '0.08em', margin: 0 }}>
            Teams on 6+ game streaks across all leagues
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>League:</span>
            <select value={leagueFilter} onChange={e => handleLeagueChange(e.target.value)} style={selectSt}>
              <option value="all">All Leagues</option>
              {LEAGUES.map(l => <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sort:</span>
            <select value={sortMode} onChange={e => handleSortChange(e.target.value as SortMode)} style={selectSt}>
              {(Object.keys(SORT_LABELS) as SortMode[]).map(k => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>
          {lastRefreshed !== null && (
            <span style={{ marginLeft: 'auto', fontSize: 9, color: '#3f3f46', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              ◷ Refreshed {formatAgo(lastRefreshed)}
            </span>
          )}
        </div>
      </div>

      {/* Streak rows */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Loading streak data…
          </div>
        ) : displayRows.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', fontSize: 11, color: '#52525b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            No active streaks of 6+ games — check back soon.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {displayRows.map(row => {
              const meta = LEAGUE_MAP[row.leagueId]
              const sc   = streakColor(row.streakType)
              const sl   = streakLabel(row.kind, row.streakType, row.streakCount)
              return (
                <div
                  key={`${row.leagueId}-${row.teamName}-${row.kind}`}
                  onClick={() => router.push(`/leagues/${row.leagueId}/${row.teamSlug}`)}
                  style={{
                    background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 10,
                    padding: '14px 20px', display: 'flex', alignItems: 'center',
                    gap: 16, cursor: 'pointer', flexWrap: 'wrap',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2a2a34' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1a1a24' }}
                >
                  {/* League badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                    background: `${meta.accent}11`, border: `1px solid ${meta.accent}33`,
                    borderRadius: 4, padding: '3px 8px',
                  }}>
                    <span style={{ fontSize: 12 }}>{meta.emoji}</span>
                    <span style={{ fontSize: 9, color: meta.accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{meta.name}</span>
                  </div>

                  {/* Team name */}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: 160, flexShrink: 0 }}>
                    {row.teamName}
                  </span>

                  {/* Category */}
                  <span style={{ fontSize: 9, color: '#71717a', letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0, minWidth: 88 }}>
                    {KIND_LABEL[row.kind]}
                  </span>

                  {/* Streak badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    background: `${sc}11`, border: `1px solid ${sc}33`,
                    borderRadius: 6, padding: '4px 10px',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc, boxShadow: `0 0 6px ${sc}` }} />
                    <span style={{ fontSize: 16, fontWeight: 900, color: sc, letterSpacing: '0.02em' }}>{sl}</span>
                  </div>

                  {/* Last N game cells */}
                  <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
                    {row.games.map((g, gi) => <GameCell key={gi} game={g} kind={row.kind} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
