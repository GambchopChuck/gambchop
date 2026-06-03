'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchLeagueOutcomes, computeStreak } from '@/lib/chart-data'
import { LEAGUES, LEAGUE_MAP, generateChartData, slugify } from '@/lib/leagues-data'
import type { TeamChartData, GameEntry, LeagueMeta } from '@/lib/leagues-data'
import { STREAK_BOARD_MIN_LENGTH } from '@/lib/streaks/constants'
import { TEAM_COLORS } from '@/lib/teamColors'

const MIN_STREAK = STREAK_BOARD_MIN_LENGTH

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

// ─── Streak row card ─────────────────────────────────────────────────────────

function StreakRowCard({
  row, meta, sc, sl, onNavigate,
}: {
  row:        StreakRow
  meta:       LeagueMeta
  sc:         string
  sl:         string
  onNavigate: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const colors  = TEAM_COLORS[row.teamName]

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => entry.target.classList.toggle('team-glow-active', entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      className="team-glow-border"
      onClick={onNavigate}
      style={{
        background: '#0f0f14',
        padding: '14px 20px', display: 'flex', alignItems: 'center',
        gap: 16, cursor: 'pointer', flexWrap: 'wrap',
        '--team-primary':   colors?.primary   ?? '#39ff9a',
        '--team-secondary': colors?.secondary ?? '#ffffff',
      } as React.CSSProperties}
    >
      {/* League badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        background: `${meta.accent}11`, border: `1px solid ${meta.accent}33`,
        padding: '3px 8px',
      }}>
        <span style={{ fontSize: 12 }}>{meta.emoji}</span>
        <span style={{ fontSize: 9, color: meta.accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{meta.name}</span>
      </div>

      {/* Team name */}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: 160, flexShrink: 0 }}>
        {row.teamName}
      </span>

      {/* Category */}
      <span style={{ fontSize: 9, color: '#ffffff', letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0, minWidth: 88 }}>
        {KIND_LABEL[row.kind]}
      </span>

      {/* Streak badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        background: `${sc}11`, border: `1px solid ${sc}33`,
        padding: '4px 10px',
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
    color: '#ffffff', fontSize: 10, padding: '7px 10px',
    fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
    cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>

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
          <p style={{ fontSize: 11, color: '#ffffff', letterSpacing: '0.08em', margin: 0 }}>
            Teams on {MIN_STREAK}+ game streaks across all leagues
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>League:</span>
            <select value={leagueFilter} onChange={e => handleLeagueChange(e.target.value)} style={selectSt}>
              <option value="all">All Leagues</option>
              {LEAGUES.map(l => <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sort:</span>
            <select value={sortMode} onChange={e => handleSortChange(e.target.value as SortMode)} style={selectSt}>
              {(Object.keys(SORT_LABELS) as SortMode[]).map(k => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>
          {lastRefreshed !== null && (
            <span style={{ marginLeft: 'auto', fontSize: 9, color: '#ffffff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              ◷ Refreshed {formatAgo(lastRefreshed)}
            </span>
          )}
        </div>
      </div>

      {/* Horizontal legend */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 18px', padding: '12px 20px 14px', background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 8 }}>
          {([
            { bg: C_GREEN,         label: 'Win / Cover' },
            { bg: C_RED,           label: 'Loss / Miss' },
            { bg: C_WHITE,         label: 'Push'        },
            { bg: '#eab308',       label: 'ML Fav'      },
            { bg: '#f97316',       label: 'ML Dog'      },
            { bg: '#2563eb',       label: 'Sp Fav'      },
            { bg: '#9333ea',       label: 'Sp Dog'      },
            { bg: '#14b8a6',       label: 'Home'        },
            { bg: '#94a3b8',       label: 'Away'        },
            { bg: C_VIOLET,        label: 'Over'        },
            { bg: C_BROWN,         label: 'Under'       },
          ] as const).map(({ bg, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: bg, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Streak rows */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#ffffff', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Loading streak data…
          </div>
        ) : displayRows.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', fontSize: 11, color: '#ffffff', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            No active streaks of {MIN_STREAK}+ games — check back soon.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {displayRows.map(row => (
              <StreakRowCard
                key={`${row.leagueId}-${row.teamName}-${row.kind}`}
                row={row}
                meta={LEAGUE_MAP[row.leagueId]}
                sc={streakColor(row.streakType)}
                sl={streakLabel(row.kind, row.streakType, row.streakCount)}
                onNavigate={() => router.push(`/leagues/${row.leagueId}/${row.teamSlug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
