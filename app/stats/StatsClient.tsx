'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  fetchTeamOutcomesByMonth,
  fetchTeamSeasonOutcomes,
} from '@/lib/chart-data'
import type { TeamChartData, GameEntry } from '@/lib/leagues-data'
import { LEAGUE_SEASONS } from '@/lib/leagues-data'
import GambchopChart from '@/components/GambchopChart'
import type { StatRowConfig } from '@/components/GambchopChart'
import ChartLegend from '@/components/ChartLegend'

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT  = '#39ff9a'
const MONO    = 'var(--font-jetbrains), "JetBrains Mono", monospace'
const OSWALD  = 'var(--font-oswald), "Oswald", sans-serif'
const BORDER  = '#1a1a24'
const MUTED   = '#52525b'
const TEXT    = '#f4f4f5'

// ─── League tabs ──────────────────────────────────────────────────────────────
const LEAGUE_TABS = [
  { key: 'mlb',  label: 'MLB',  active: true  },
  { key: 'nba',  label: 'NBA',  active: false },
  { key: 'nhl',  label: 'NHL',  active: false },
  { key: 'nfl',  label: 'NFL',  active: false },
  { key: 'wnba', label: 'WNBA', active: false },
] as const

// ─── MLB team list ────────────────────────────────────────────────────────────
const MLB_TEAMS = [
  'Arizona Diamondbacks', 'Atlanta Braves', 'Baltimore Orioles', 'Boston Red Sox',
  'Chicago Cubs', 'Chicago White Sox', 'Cincinnati Reds', 'Cleveland Guardians',
  'Colorado Rockies', 'Detroit Tigers', 'Houston Astros', 'Kansas City Royals',
  'Los Angeles Angels', 'Los Angeles Dodgers', 'Miami Marlins', 'Milwaukee Brewers',
  'Minnesota Twins', 'New York Mets', 'New York Yankees', 'Oakland Athletics',
  'Philadelphia Phillies', 'Pittsburgh Pirates', 'San Diego Padres', 'San Francisco Giants',
  'Seattle Mariners', 'St. Louis Cardinals', 'Tampa Bay Rays', 'Texas Rangers',
  'Toronto Blue Jays', 'Washington Nationals',
]

// ─── Team stat line defaults ───────────────────────────────────────────────────
const TEAM_STAT_DEFAULTS: Record<string, { label: string; defaultLine: number }> = {
  home_runs:  { label: 'HR',          defaultLine: 1.5 },
  strikeouts: { label: 'STRIKEOUTS',  defaultLine: 7.5 },
  hits:       { label: 'HITS',        defaultLine: 8.5 },
  runs:       { label: 'RUNS',        defaultLine: 4.5 },
  walks:      { label: 'WALKS',       defaultLine: 3.5 },
}

// ─── Player stat line defaults ────────────────────────────────────────────────
const PLAYER_STAT_DEFAULTS: Record<string, { label: string; defaultLine: number; playerType: 'batter' | 'pitcher' }> = {
  hits:       { label: 'HITS',       defaultLine: 0.5, playerType: 'batter'  },
  home_runs:  { label: 'HR',         defaultLine: 0.5, playerType: 'batter'  },
  rbis:       { label: 'RBIs',       defaultLine: 0.5, playerType: 'batter'  },
  walks:      { label: 'WALKS',      defaultLine: 0.5, playerType: 'batter'  },
  strikeouts: { label: 'STRIKEOUTS', defaultLine: 4.5, playerType: 'pitcher' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function makeAbbr(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)
}

function fmtDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}/${d}`
}

function monthRange(year: number, month: number) {
  const mm  = String(month).padStart(2, '0')
  const end = new Date(year, month, 0).getDate()
  return { firstDay: `${year}-${mm}-01`, lastDay: `${year}-${mm}-${String(end).padStart(2,'0')}` }
}

type TabType  = 'team' | 'player'
type StatLines = Record<string, number>
type DayDataMap = Map<number, number | null>

// ─── Player search ────────────────────────────────────────────────────────────
type PlayerResult = { player_name: string; team_name: string }

function PlayerSearch({ teamFilter, initialName, onSelect }: {
  teamFilter:   string
  initialName?: string
  onSelect:     (name: string, team: string) => void
}) {
  const [query,   setQuery]   = useState(initialName ?? '')
  const [results, setResults] = useState<PlayerResult[]>([])
  const [open,    setOpen]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  async function doSearch(q: string) {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setBusy(true)
    let qb = supabase
      .from('player_game_stats')
      .select('player_name, team_name')
      .ilike('player_name', `%${q}%`)
      .eq('league', 'MLB')
      .limit(24)
      .order('player_name', { ascending: true })
    if (teamFilter) qb = qb.eq('team_name', teamFilter)
    const { data } = await qb
    const seen = new Set<string>()
    const unique = ((data ?? []) as PlayerResult[]).filter(r => {
      const k = `${r.player_name}::${r.team_name}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    setResults(unique.slice(0, 8))
    setOpen(unique.length > 0)
    setBusy(false)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(q), 280)
  }

  function pick(name: string, team: string) {
    setQuery(name)
    setOpen(false)
    onSelect(name, team)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search player name..."
          style={{
            width: '100%', height: 44, background: '#0a0a0f',
            border: `1px solid ${BORDER}`, borderRadius: 6, outline: 'none',
            padding: '0 40px 0 14px', color: TEXT, fontSize: 13,
            fontFamily: MONO, boxSizing: 'border-box',
          }}
        />
        {busy && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <div style={{ width: 12, height: 12, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'statsspin 0.6s linear infinite' }} />
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#0f0f14', border: `1px solid ${BORDER}`,
          borderTop: 'none', borderRadius: '0 0 6px 6px',
          overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          {results.map(r => (
            <button
              key={`${r.player_name}::${r.team_name}`}
              onClick={() => pick(r.player_name, r.team_name)}
              style={{
                width: '100%', padding: '10px 14px', background: 'transparent',
                border: 'none', borderBottom: `1px solid ${BORDER}`,
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a24')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 13, color: TEXT, fontFamily: MONO }}>{r.player_name}</span>
              <span style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {r.team_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StatsClient() {
  const { isPro, memberTier, openModal, setIsMember } = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const today = new Date()

  // ── Tab / league
  const [activeTab,    setActiveTab]    = useState<TabType>('team')
  const [activeLeague, setActiveLeague] = useState('mlb')

  // ── Month navigation (shared between tabs)
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)

  const seasonWindow  = LEAGUE_SEASONS['mlb']
  const seasonStartYM = seasonWindow ? seasonWindow.startYear * 12 + seasonWindow.startMonth : 0
  const todayYM       = today.getFullYear() * 12 + (today.getMonth() + 1)
  const viewYM        = viewYear * 12 + viewMonth
  const canPrevMonth  = viewYM > seasonStartYM
  const canNextMonth  = viewYM < todayYM

  function handlePrevMonth() {
    if (!canPrevMonth) return
    setViewMonth(m => { if (m === 1) { setViewYear(y => y - 1); return 12 } return m - 1 })
  }
  function handleNextMonth() {
    if (!canNextMonth) return
    setViewMonth(m => { if (m === 12) { setViewYear(y => y + 1); return 1 } return m + 1 })
  }

  // ── Team tab state
  const [selectedTeam,   setSelectedTeam]   = useState('')
  const [teamLoading,    setTeamLoading]     = useState(false)
  const [chartData,      setChartData]       = useState<TeamChartData[]>([])
  const [seasonChartData,setSeasonChartData] = useState<TeamChartData[]>([])
  const [lastUpdated,    setLastUpdated]     = useState<string | null>(null)

  // Stat lines for team tab (mutable per-row)
  const [teamStatLines, setTeamStatLines] = useState<StatLines>(() =>
    Object.fromEntries(Object.entries(TEAM_STAT_DEFAULTS).map(([k, v]) => [k, v.defaultLine]))
  )
  // Raw day data for team stats, indexed by field key
  const [teamDayData, setTeamDayData] = useState<Record<string, DayDataMap>>({})

  // ── Player tab state
  const [playerName,    setPlayerName]    = useState('')
  const [playerTeamName,setPlayerTeamName]= useState('')
  const [teamFilter,    setTeamFilter]    = useState('')
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerChartData, setPlayerChartData] = useState<TeamChartData[]>([])

  // Stat lines for player tab
  const [playerStatLines, setPlayerStatLines] = useState<StatLines>(() =>
    Object.fromEntries(Object.entries(PLAYER_STAT_DEFAULTS).map(([k, v]) => [k, v.defaultLine]))
  )
  const [playerDayData, setPlayerDayData] = useState<Record<string, DayDataMap>>({})

  // ── Toast
  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  // ── Restore from URL on mount
  useEffect(() => {
    const tab  = searchParams.get('tab') as TabType | null
    const team = searchParams.get('team')
    const player = searchParams.get('player')
    if (tab === 'player') setActiveTab('player')
    if (team)   { const n = MLB_TEAMS.find(t => slugify(t) === team); if (n) setSelectedTeam(n) }
    if (player) setPlayerName(decodeURIComponent(player))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch team stat data (team_game_stats for current month)
  async function fetchTeamStatData(teamName: string, year: number, month: number) {
    const { firstDay, lastDay } = monthRange(year, month)
    const { data } = await supabase
      .from('team_game_stats')
      .select('game_date, hits, home_runs, runs, strikeouts, walks')
      .eq('team_name', teamName)
      .eq('league', 'MLB')
      .gte('game_date', firstDay)
      .lte('game_date', lastDay)

    const fields = Object.keys(TEAM_STAT_DEFAULTS)
    const result: Record<string, DayDataMap> = Object.fromEntries(fields.map(k => [k, new Map()]))
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const day = parseInt((row.game_date as string).split('-')[2], 10)
      for (const field of fields) {
        result[field].set(day, (row[field] as number | null) ?? null)
      }
    }
    return result
  }

  // ── Load full team data (betting + stats)
  async function loadTeamData(teamName: string, year: number, month: number) {
    if (!teamName) return
    setTeamLoading(true)
    const ts = slugify(teamName)
    const [monthGames, seasonGames, statData] = await Promise.all([
      fetchTeamOutcomesByMonth('mlb', ts, year, month),
      fetchTeamSeasonOutcomes('mlb', ts),
      fetchTeamStatData(teamName, year, month),
    ])
    setChartData([{ teamName, abbreviation: makeAbbr(teamName), games: monthGames }])
    setSeasonChartData([{ teamName, abbreviation: makeAbbr(teamName), games: seasonGames }])
    setTeamDayData(statData)
    setTeamLoading(false)

    // Push URL
    const p = new URLSearchParams({ tab: 'team', team: slugify(teamName) })
    router.replace(`/stats?${p.toString()}`, { scroll: false })
  }

  // Re-fetch when month changes (team already selected)
  useEffect(() => {
    if (selectedTeam) loadTeamData(selectedTeam, viewYear, viewMonth)
  }, [viewYear, viewMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when team is selected
  useEffect(() => {
    if (selectedTeam) loadTeamData(selectedTeam, viewYear, viewMonth)
  }, [selectedTeam]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch last-updated timestamp
  useEffect(() => {
    supabase
      .from('ingestion_runs')
      .select('completed_at')
      .eq('status', 'success')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data?.completed_at) setLastUpdated(data.completed_at as string) })
  }, [])

  // ── Build team stat row configs (recomputed whenever lines or dayData change)
  const teamStatRowConfigs: StatRowConfig[] = useMemo(() =>
    Object.entries(TEAM_STAT_DEFAULTS).map(([field, { label }]) => ({
      key:     field,
      label,
      line:    teamStatLines[field] ?? TEAM_STAT_DEFAULTS[field].defaultLine,
      dayData: teamDayData[field] ?? new Map(),
      onLineChange: (v: number) =>
        setTeamStatLines(prev => ({ ...prev, [field]: v })),
    })),
  [teamStatLines, teamDayData])

  // ── Fetch player stat data
  async function fetchPlayerStatData(pName: string, year: number, month: number) {
    const { firstDay, lastDay } = monthRange(year, month)

    // Fetch batter and pitcher rows in parallel
    const [batterRes, pitcherRes] = await Promise.all([
      supabase
        .from('player_game_stats')
        .select('game_date, hits, home_runs, rbis, walks')
        .eq('player_name', pName)
        .eq('player_type', 'batter')
        .eq('league', 'MLB')
        .gte('game_date', firstDay)
        .lte('game_date', lastDay),
      supabase
        .from('player_game_stats')
        .select('game_date, strikeouts')
        .eq('player_name', pName)
        .eq('player_type', 'pitcher')
        .eq('league', 'MLB')
        .gte('game_date', firstDay)
        .lte('game_date', lastDay),
    ])

    const dayData: Record<string, DayDataMap> = {
      hits:       new Map(),
      home_runs:  new Map(),
      rbis:       new Map(),
      walks:      new Map(),
      strikeouts: new Map(),
    }

    const allDates = new Set<string>()

    for (const row of (batterRes.data ?? []) as Array<Record<string, unknown>>) {
      const date = row.game_date as string
      allDates.add(date)
      const day = parseInt(date.split('-')[2], 10)
      dayData.hits.set(day,      (row.hits      as number | null) ?? null)
      dayData.home_runs.set(day, (row.home_runs as number | null) ?? null)
      dayData.rbis.set(day,      (row.rbis      as number | null) ?? null)
      dayData.walks.set(day,     (row.walks     as number | null) ?? null)
    }
    for (const row of (pitcherRes.data ?? []) as Array<Record<string, unknown>>) {
      const date = row.game_date as string
      allDates.add(date)
      const day = parseInt(date.split('-')[2], 10)
      dayData.strikeouts.set(day, (row.strikeouts as number | null) ?? null)
    }

    return { dayData, allDates: Array.from(allDates).sort() }
  }

  // ── Load player chart
  async function loadPlayerData(pName: string, year: number, month: number) {
    if (!pName) return
    setPlayerLoading(true)
    const { dayData, allDates } = await fetchPlayerStatData(pName, year, month)
    setPlayerDayData(dayData)

    // Synthetic GameEntry[] — gives the chart its calendar structure
    const synthGames: GameEntry[] = allDates.map(date => ({
      rawDate:          date,
      rawTime:          date + 'T00:00:00',
      date:             fmtDate(date),
      opponent:         '',
      isHome:           false,
      isFavorite:       false,
      isSpreadFavorite: false,
      isDivisionGame:   false,
      restDays:         0,
      moneylineResult:  null,
      spreadResult:     null,
      ouResult:         null,
    }))

    setPlayerChartData([{
      teamName:     pName,
      abbreviation: makeAbbr(pName),
      games:        synthGames,
    }])
    setPlayerLoading(false)
  }

  // Re-fetch player when month changes
  useEffect(() => {
    if (playerName) loadPlayerData(playerName, viewYear, viewMonth)
  }, [viewYear, viewMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build player stat row configs
  const playerStatRowConfigs: StatRowConfig[] = useMemo(() =>
    Object.entries(PLAYER_STAT_DEFAULTS).map(([field, { label }]) => ({
      key:     field,
      label,
      line:    playerStatLines[field] ?? PLAYER_STAT_DEFAULTS[field].defaultLine,
      dayData: playerDayData[field] ?? new Map(),
      onLineChange: (v: number) =>
        setPlayerStatLines(prev => ({ ...prev, [field]: v })),
    })),
  [playerStatLines, playerDayData])

  // ── Shared select style
  const selectStyle: React.CSSProperties = {
    height: 44, background: '#0a0a0f',
    border: `1px solid ${BORDER}`, borderRadius: 6, outline: 'none',
    padding: '0 12px', color: TEXT, fontSize: 13, fontFamily: MONO,
    cursor: 'pointer', appearance: 'none' as const,
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      paddingLeft: 64, minHeight: '100vh',
      background: `radial-gradient(ellipse at 50% -10%, rgba(57,255,154,0.07) 0%, transparent 55%), #08080d`,
    }}>
      <style>{`
        @keyframes statsspin { to { transform: rotate(360deg); } }
        @keyframes statsfadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#0f0f14', border: `1px solid ${ACCENT}44`,
          borderRadius: 8, padding: '12px 18px', maxWidth: 360,
          fontFamily: MONO, fontSize: 11, color: TEXT,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          animation: 'statsfadein 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 30,
        background: 'rgba(8,8,13,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        {/* League filter */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 6, height: 48,
          borderBottom: '1px solid #12121a',
        }}>
          {LEAGUE_TABS.map(tab => {
            const on = activeLeague === tab.key
            return (
              <div key={tab.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <button
                  onClick={() => tab.active && setActiveLeague(tab.key)}
                  style={{
                    background:    on ? ACCENT : 'transparent',
                    color:         on ? '#000' : '#ffffff',
                    border:        on ? 'none' : '1px solid transparent',
                    borderRadius:  6, padding: '5px 14px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', cursor: tab.active ? 'pointer' : 'default',
                    fontFamily: MONO, transition: 'all 0.15s',
                    boxShadow: on ? `0 0 12px ${ACCENT}55` : 'none',
                    opacity: tab.active ? 1 : 0.5,
                  }}
                >
                  {tab.label}
                </button>
                {!tab.active && (
                  <span style={{
                    fontSize: 7, fontWeight: 700, color: '#fff',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    fontFamily: MONO, background: '#1a1a24',
                    padding: '1px 5px', borderRadius: 2,
                  }}>
                    SOON
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Primary tabs */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 4, height: 44,
        }}>
          {(['team', 'player'] as const).map(tab => {
            const on = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background:    on ? ACCENT : 'transparent',
                  color:         on ? '#000' : '#ffffff',
                  border:        on ? 'none' : '1px solid transparent',
                  borderRadius:  6, padding: '5px 16px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  fontFamily: MONO, transition: 'all 0.15s',
                  boxShadow: on ? `0 0 12px ${ACCENT}55` : 'none',
                }}
              >
                {tab === 'team' ? 'TEAM STATS' : 'PLAYER STATS'}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{
          fontSize: 10, color: MUTED, letterSpacing: '0.26em',
          textTransform: 'uppercase', margin: '0 0 6px', fontFamily: MONO,
        }}>
          Team and player stat lines — set your line, see the history.
        </p>
        <h1 style={{
          fontSize: 34, fontWeight: 700, color: TEXT,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          margin: 0, fontFamily: OSWALD,
        }}>
          STATS
        </h1>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 8px 80px' }}>

        {/* ──── TEAM STATS ────────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div>
            {/* Team selector */}
            <div style={{ padding: '0 16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{
                fontSize: 9, color: ACCENT, fontFamily: MONO,
                letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                SELECT TEAM
              </label>
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                style={{ ...selectStyle, flex: '1 1 260px', maxWidth: 380, color: selectedTeam ? TEXT : MUTED }}
              >
                <option value="">Choose a team...</option>
                {MLB_TEAMS.map(t => (
                  <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>
                ))}
              </select>
              {teamLoading && (
                <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Loading…
                </span>
              )}
            </div>

            {/* Empty state */}
            {!selectedTeam && (
              <div style={{
                padding: '80px 24px', textAlign: 'center',
                color: MUTED, fontFamily: MONO,
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                Select a team to view their extended chart with stat line rows
              </div>
            )}

            {/* Chart */}
            {selectedTeam && !teamLoading && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <ChartLegend />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <GambchopChart
                    data={chartData}
                    seasonData={seasonChartData}
                    viewYear={viewYear}
                    viewMonth={viewMonth}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    canPrevMonth={canPrevMonth}
                    canNextMonth={canNextMonth}
                    memberTier={memberTier}
                    accent={ACCENT}
                    onJoin={() => { setIsMember(true); openModal('join') }}
                    onUpgrade={() => openModal('pro')}
                    lastUpdated={lastUpdated}
                    statRowConfigs={teamStatRowConfigs}
                  />

                  {/* Save as custom chart — Pro only */}
                  {isPro && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 4px 0' }}>
                      <button
                        onClick={() => showToast('Custom chart saving coming soon — this will let you name and share this chart.')}
                        style={{
                          background: 'transparent', border: `1px solid ${BORDER}`,
                          borderRadius: 4, padding: '6px 14px', cursor: 'pointer',
                          fontSize: 9, fontWeight: 700, color: TEXT, fontFamily: MONO,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                      >
                        SAVE AS CUSTOM CHART →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──── PLAYER STATS ──────────────────────────────────────────────── */}
        {activeTab === 'player' && (
          <div>
            {/* Player search controls */}
            <div style={{ padding: '0 16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Optional team filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  fontSize: 9, color: ACCENT, fontFamily: MONO,
                  letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  FILTER TEAM
                </label>
                <select
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value)}
                  style={{ ...selectStyle, width: 200, color: teamFilter ? TEXT : MUTED, fontSize: 11 }}
                >
                  <option value="">All teams</option>
                  {MLB_TEAMS.map(t => (
                    <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Player search */}
              <label style={{
                fontSize: 9, color: ACCENT, fontFamily: MONO,
                letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                PLAYER
              </label>
              <PlayerSearch
                teamFilter={teamFilter}
                initialName={playerName || undefined}
                onSelect={(name, team) => {
                  setPlayerName(name)
                  setPlayerTeamName(team)
                  loadPlayerData(name, viewYear, viewMonth)
                  const p = new URLSearchParams({ tab: 'player', player: encodeURIComponent(name) })
                  router.replace(`/stats?${p.toString()}`, { scroll: false })
                }}
              />
              {playerName && (
                <span style={{ fontSize: 11, color: ACCENT, fontFamily: MONO }}>
                  ✓ {playerName}
                  {playerTeamName && <span style={{ color: MUTED }}> · {playerTeamName}</span>}
                </span>
              )}
              {playerLoading && (
                <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Loading…
                </span>
              )}
            </div>

            {/* Empty state */}
            {!playerName && (
              <div style={{
                padding: '80px 24px', textAlign: 'center',
                color: MUTED, fontFamily: MONO,
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                Search for a player to view their stat line chart
              </div>
            )}

            {/* Player chart — betting rows hidden, stat rows only */}
            {playerName && !playerLoading && playerChartData.length > 0 && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <ChartLegend />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <GambchopChart
                    data={playerChartData}
                    viewYear={viewYear}
                    viewMonth={viewMonth}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    canPrevMonth={canPrevMonth}
                    canNextMonth={canNextMonth}
                    memberTier={memberTier}
                    accent={ACCENT}
                    onJoin={() => { setIsMember(true); openModal('join') }}
                    onUpgrade={() => openModal('pro')}
                    statRowConfigs={playerStatRowConfigs}
                    hideBettingRows
                  />

                  {isPro && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 4px 0' }}>
                      <button
                        onClick={() => showToast('Custom chart saving coming soon — this will let you name and share this chart.')}
                        style={{
                          background: 'transparent', border: `1px solid ${BORDER}`,
                          borderRadius: 4, padding: '6px 14px', cursor: 'pointer',
                          fontSize: 9, fontWeight: 700, color: TEXT, fontFamily: MONO,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                      >
                        SAVE AS CUSTOM CHART →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No data state */}
            {playerName && !playerLoading && playerChartData.length > 0 && playerChartData[0].games.length === 0 && (
              <div style={{
                padding: '60px 24px', textAlign: 'center',
                color: MUTED, fontFamily: MONO,
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                No data available yet — check back after today&apos;s games are processed
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
