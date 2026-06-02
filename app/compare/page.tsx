'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import GambchopChart from '@/components/GambchopChart'
import { LEAGUES, LEAGUE_SEASONS, slugify } from '@/lib/leagues-data'
import type { TeamChartData, GameEntry } from '@/lib/leagues-data'
import { fetchTeamOutcomesByMonth, fetchTeamSeasonOutcomes, computeStreak } from '@/lib/chart-data'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ─── Palette ──────────────────────────────────────────────────────────────────

const CARD        = '#0f0f14'
const BORDER      = '#1a1a24'
const TEXT        = '#f4f4f5'
const MUTED       = '#52525b'
const SUB         = '#a1a1aa'
const GREEN       = '#22c55e'
const ACCENT_PILL = '#39ff9a'   // Matches NewsPageClient tab accent
const OSWALD      = 'var(--font-oswald), "Oswald", sans-serif'
const MONO        = 'var(--font-geist-mono), monospace'

// ─── Time range ───────────────────────────────────────────────────────────────

type TimeRange = 'last-7' | 'last-14' | 'last-30' | 'this-month' | 'this-season'

const RANGE_OPTIONS: { value: TimeRange; label: string; promptLabel: string }[] = [
  { value: 'last-7',      label: 'Last 7 Days',  promptLabel: 'over the last 7 days'  },
  { value: 'last-14',     label: 'Last 14 Days', promptLabel: 'over the last 14 days' },
  { value: 'last-30',     label: 'Last 30 Days', promptLabel: 'over the last 30 days' },
  { value: 'this-month',  label: 'This Month',   promptLabel: 'this month'             },
  { value: 'this-season', label: 'This Season',  promptLabel: 'this season'            },
]

function filterGamesByRange(games: GameEntry[], range: TimeRange): GameEntry[] {
  if (range === 'this-season') return games

  const today    = new Date()
  const todayStr = today.toISOString().split('T')[0]

  let fromDate: Date
  if (range === 'last-7') {
    fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 7)
  } else if (range === 'last-14') {
    fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 14)
  } else if (range === 'last-30') {
    fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 30)
  } else {
    // this-month
    fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
  }

  const fromStr = fromDate.toISOString().split('T')[0]
  return games.filter(g => g.rawDate >= fromStr && g.rawDate <= todayStr)
}

// ─── Team resolution ──────────────────────────────────────────────────────────

interface ResolvedTeam { name: string; slug: string; leagueId: string; emoji: string }

function resolveTeam(slug: string): ResolvedTeam | null {
  for (const league of LEAGUES) {
    const name = league.entities.find(e => slugify(e) === slug)
    if (name) return { name, slug, leagueId: league.id, emoji: league.emoji }
  }
  return null
}

function makeAbbr(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)
}

// ─── Stat computation ─────────────────────────────────────────────────────────

interface StatCardData { label: string; value: string; color: string }

function computeStatCards(games: GameEntry[]): StatCardData[] {
  const mlW    = games.filter(g => g.moneylineResult === 'win').length
  const mlL    = games.filter(g => g.moneylineResult === 'loss').length
  const spW    = games.filter(g => g.spreadResult    === 'win').length
  const spL    = games.filter(g => g.spreadResult    === 'loss').length
  const overs  = games.filter(g => g.ouResult === 'over').length
  const unders = games.filter(g => g.ouResult === 'under').length

  const mlStreak = computeStreak(games, 'moneyline')
  const spStreak = computeStreak(games, 'spread')
  const ouStreak = computeStreak(games, 'over_under')

  type C = { label: string; count: number; color: string }
  const candidates: C[] = []
  if (mlStreak) candidates.push({ label: `${mlStreak.type}${mlStreak.count}`, count: mlStreak.count, color: mlStreak.type === 'W' ? GREEN : '#ef4444' })
  if (spStreak) candidates.push({ label: spStreak.type === 'W' ? `COV${spStreak.count}` : `MIS${spStreak.count}`, count: spStreak.count, color: spStreak.type === 'W' ? GREEN : '#ef4444' })
  if (ouStreak) candidates.push({ label: `${ouStreak.type}${ouStreak.count}`, count: ouStreak.count, color: ouStreak.type === 'O' ? '#8b5cf6' : '#b45309' })
  candidates.sort((a, b) => b.count - a.count)
  const streak = candidates[0] ?? { label: '—', color: MUTED }

  return [
    { label: 'Record',     value: `${mlW}-${mlL}`,     color: mlW > mlL ? GREEN : mlW < mlL ? '#ef4444' : MUTED },
    { label: 'ATS',        value: `${spW}-${spL}`,     color: spW > spL ? GREEN : spW < spL ? '#ef4444' : MUTED },
    { label: 'Over/Under', value: `${overs}-${unders}`, color: overs > unders ? '#8b5cf6' : overs < unders ? '#b45309' : MUTED },
    { label: 'Streak',     value: streak.label,         color: streak.color },
  ]
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: StatCardData) {
  return (
    <div className="stat-card" style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
      padding: '14px 18px', textAlign: 'center', flex: '1 1 0', minWidth: 0,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '0.02em', lineHeight: 1, fontFamily: OSWALD }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6 }}>
        {label}
      </div>
    </div>
  )
}

// ─── Time Frame Toggle ────────────────────────────────────────────────────────
// Pill style matches NewsPageClient.tsx primary tab pattern (ACCENT = #39ff9a)

function TimeFrameToggle({ value, onChange }: { value: TimeRange; onChange: (r: TimeRange) => void }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      gap: 4, padding: '16px 0 20px', flexWrap: 'wrap',
    }}>
      {RANGE_OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              background:    active ? ACCENT_PILL : 'transparent',
              color:         active ? '#000'       : '#71717a',
              border:        active ? 'none'        : '1px solid transparent',
              borderRadius:  6,
              padding:       '5px 16px',
              fontSize:      12,
              fontWeight:    700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor:        'pointer',
              fontFamily:    MONO,
              transition:    'all 0.15s',
              boxShadow:     active ? `0 0 12px ${ACCENT_PILL}55` : 'none',
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

// ─── Team Dropdown ────────────────────────────────────────────────────────────

function TeamDropdown({ slot, value, onChange }: { slot: 1 | 2; value: string; onChange: (slug: string) => void }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const resolved     = value ? resolveTeam(value) : null
  const displayLabel = resolved ? `${resolved.emoji} ${resolved.name}` : `Select Team ${slot}`

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const lower    = search.toLowerCase()
  const filtered = LEAGUES.flatMap(l =>
    l.entities
      .filter(e => !lower || e.toLowerCase().includes(lower) || l.name.toLowerCase().includes(lower))
      .map(e => ({ name: e, slug: slugify(e), leagueId: l.id, emoji: l.emoji }))
  )
  const grouped = LEAGUES.map(l => ({ league: l, teams: filtered.filter(t => t.leagueId === l.id) }))
    .filter(g => g.teams.length > 0)

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: CARD,
          border: `1px solid ${open ? GREEN + '55' : BORDER}`,
          borderRadius: 10, padding: '12px 16px',
          color: resolved ? TEXT : MUTED,
          fontSize: 13, fontWeight: resolved ? 700 : 400,
          letterSpacing: '0.04em', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          fontFamily: OSWALD, transition: 'border-color 0.15s',
        }}
      >
        <span>{displayLabel}</span>
        <span style={{ fontSize: 10, color: MUTED }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#0d0d14', border: `1px solid ${BORDER}`, borderRadius: 10,
          zIndex: 50, maxHeight: 360, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}` }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search teams or leagues…"
              style={{
                width: '100%', background: '#0a0a0f',
                border: `1px solid ${BORDER}`, borderRadius: 6,
                padding: '8px 12px', color: TEXT, fontSize: 12,
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {grouped.length === 0 && (
              <div style={{ padding: 16, fontSize: 11, color: MUTED, textAlign: 'center', letterSpacing: '0.1em' }}>No teams found</div>
            )}
            {grouped.map(({ league, teams }) => (
              <div key={league.id}>
                <div style={{ padding: '8px 14px 4px', fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, position: 'sticky', top: 0, background: '#0d0d14' }}>
                  {league.emoji} {league.name}
                </div>
                {teams.map(team => (
                  <div
                    key={team.slug}
                    onClick={() => { onChange(team.slug); setOpen(false); setSearch('') }}
                    style={{
                      padding: '9px 14px 9px 22px', fontSize: 13,
                      color: team.slug === value ? GREEN : SUB,
                      background: team.slug === value ? `${GREEN}0d` : 'transparent',
                      cursor: 'pointer', letterSpacing: '0.03em',
                      transition: 'background 0.1s, color 0.1s', fontFamily: OSWALD,
                    }}
                    onMouseEnter={e => { if (team.slug !== value) (e.currentTarget as HTMLDivElement).style.background = '#1a1a24' }}
                    onMouseLeave={e => { if (team.slug !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    {team.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Paywall ──────────────────────────────────────────────────────────────────

function ComparePaywall() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '40px 48px', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700, fontFamily: OSWALD }}>Pro Feature</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px', fontFamily: OSWALD }}>Chart Compare</h2>
        <p style={{ fontSize: 12, color: SUB, lineHeight: 1.7, margin: '0 0 28px' }}>
          Compare any two teams side by side — full outcome charts, season records, and an AI comparison briefing. Available on the Pro plan.
        </p>
        <Link href="/pricing" style={{
          display: 'inline-block', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          borderRadius: 8, padding: '12px 28px', color: '#000', fontSize: 12, fontWeight: 900,
          letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none',
          fontFamily: OSWALD, boxShadow: '0 0 20px #22c55e44',
        }}>
          Upgrade to Pro →
        </Link>
      </div>
    </div>
  )
}

// ─── Team Stats panel (header + stat cards) ───────────────────────────────────

interface TeamStatsProps {
  team:    ResolvedTeam
  games:   GameEntry[]    // already filtered by selected range
  loading: boolean
}

function TeamStats({ team, games, loading }: TeamStatsProps) {
  const stats = !loading && games.length > 0 ? computeStatCards(games) : null

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Team header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
        padding: '14px 20px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
      }}>
        <span style={{ fontSize: 26 }}>{team.emoji}</span>
        <div>
          <Link
            href={`/leagues/${team.leagueId}/${team.slug}`}
            style={{ fontSize: 18, fontWeight: 700, color: GREEN, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: OSWALD }}
          >
            {team.name}
          </Link>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 3 }}>
            {team.leagueId.toUpperCase()} · <Link href={`/leagues/${team.leagueId}/${team.slug}`} style={{ color: MUTED, textDecoration: 'none' }}>Full Chart →</Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading stats…</div>
      ) : stats ? (
        <div className="stat-cards-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      ) : (
        <div style={{ padding: '12px 0', fontSize: 11, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {games.length === 0 ? 'No game data for this range.' : 'No season data available.'}
        </div>
      )}
    </div>
  )
}

// ─── Team Chart panel ─────────────────────────────────────────────────────────

interface TeamChartPanelProps {
  team:       ResolvedTeam
  chartData:  TeamChartData[]   // monthly, filtered by range
  seasonData: TeamChartData[]   // season, filtered by range (for record badges)
  year:       number
  month:      number
  onPrev:     () => void
  onNext:     () => void
  canPrev:    boolean
  canNext:    boolean
  loading:    boolean
}

function TeamChartPanel({ team, chartData, seasonData, year, month, onPrev, onNext, canPrev, canNext, loading }: TeamChartPanelProps) {
  const hasGames = chartData.length > 0 && chartData[0].games.length > 0
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading chart…</div>
      ) : hasGames ? (
        <GambchopChart
          data={chartData}
          seasonData={seasonData}
          viewYear={year}
          viewMonth={month}
          onPrevMonth={onPrev}
          onNextMonth={onNext}
          canPrevMonth={canPrev}
          canNextMonth={canNext}
          memberTier="pro"
          accent={GREEN}
          lastUpdated={null}
        />
      ) : (
        <div style={{ padding: '28px 20px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, textAlign: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          No game data for this month in the selected range.
        </div>
      )}
    </div>
  )
}

// ─── Share button ─────────────────────────────────────────────────────────────

function ShareButton() {
  const [copied, setCopied] = useState(false)
  function handleShare() {
    if (typeof window === 'undefined') return
    navigator.clipboard.writeText(window.location.href)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => {})
  }
  return (
    <button
      onClick={handleShare}
      style={{
        background: 'none', border: `1px solid ${BORDER}`, borderRadius: 10,
        padding: '12px 20px', color: copied ? GREEN : SUB,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', cursor: 'pointer',
        fontFamily: 'inherit', flexShrink: 0, transition: 'color 0.15s',
      }}
    >
      {copied ? 'Copied!' : 'Share ↗'}
    </button>
  )
}

// ─── Main Compare Client ──────────────────────────────────────────────────────

function CompareClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { memberTier, user } = useAuth()

  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])

  const [team1Slug, setTeam1Slug] = useState(searchParams.get('team1') ?? '')
  const [team2Slug, setTeam2Slug] = useState(searchParams.get('team2') ?? '')
  const [range,     setRange]     = useState<TimeRange>((searchParams.get('range') as TimeRange) ?? 'this-season')

  const today = new Date()
  const [year1,  setYear1]  = useState(today.getFullYear())
  const [month1, setMonth1] = useState(today.getMonth() + 1)
  const [year2,  setYear2]  = useState(today.getFullYear())
  const [month2, setMonth2] = useState(today.getMonth() + 1)

  // Raw season game arrays — filtered downstream by range
  const [team1Games,  setTeam1Games]  = useState<GameEntry[]>([])
  const [team2Games,  setTeam2Games]  = useState<GameEntry[]>([])

  // Monthly chart data (for current view month)
  const [team1Chart,  setTeam1Chart]  = useState<TeamChartData[]>([])
  const [team2Chart,  setTeam2Chart]  = useState<TeamChartData[]>([])

  // Season data wrappers (for chart record badges / streaks)
  const [team1Season, setTeam1Season] = useState<TeamChartData[]>([])
  const [team2Season, setTeam2Season] = useState<TeamChartData[]>([])

  const [loading1, setLoading1] = useState(false)
  const [loading2, setLoading2] = useState(false)

  const [briefing,        setBriefing]        = useState<string | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [compared,        setCompared]        = useState(false)

  // Prevent duplicate month-nav fetches
  const lastFetch1 = useRef({ slug: '', year: 0, month: 0 })
  const lastFetch2 = useRef({ slug: '', year: 0, month: 0 })

  // ── Derived filtered data ─────────────────────────────────────────────────

  const filteredGames1 = useMemo(() => filterGamesByRange(team1Games, range), [team1Games, range])
  const filteredGames2 = useMemo(() => filterGamesByRange(team2Games, range), [team2Games, range])

  const filteredChartData1 = useMemo(() => {
    if (!team1Chart.length) return []
    return [{ ...team1Chart[0], games: filterGamesByRange(team1Chart[0].games, range) }]
  }, [team1Chart, range])

  const filteredChartData2 = useMemo(() => {
    if (!team2Chart.length) return []
    return [{ ...team2Chart[0], games: filterGamesByRange(team2Chart[0].games, range) }]
  }, [team2Chart, range])

  const filteredSeasonData1 = useMemo(() => {
    if (!team1Season.length) return []
    return [{ ...team1Season[0], games: filteredGames1 }]
  }, [team1Season, filteredGames1])

  const filteredSeasonData2 = useMemo(() => {
    if (!team2Season.length) return []
    return [{ ...team2Season[0], games: filteredGames2 }]
  }, [team2Season, filteredGames2])

  // ── Season window helpers ─────────────────────────────────────────────────

  function seasonNav(leagueId: string, yr: number, mo: number) {
    const w = LEAGUE_SEASONS[leagueId]
    if (!w) return { canPrev: false, canNext: false }
    const ym      = yr * 12 + mo
    const startYM = w.startYear * 12 + w.startMonth
    const todayYM = today.getFullYear() * 12 + (today.getMonth() + 1)
    return { canPrev: ym > startYM, canNext: ym < todayYM }
  }

  function prevMonth(yr: number, mo: number, setY: (y: number) => void, setM: (m: number) => void) {
    if (mo === 1) { setY(yr - 1); setM(12) } else { setM(mo - 1) }
  }
  function nextMonth(yr: number, mo: number, setY: (y: number) => void, setM: (m: number) => void) {
    if (mo === 12) { setY(yr + 1); setM(1) } else { setM(mo + 1) }
  }

  // ── Month-navigation re-fetch effects ───────────────────────────────────

  useEffect(() => {
    if (!compared || !team1Slug) return
    const team = resolveTeam(team1Slug)
    if (!team) return
    if (lastFetch1.current.slug === team1Slug && lastFetch1.current.year === year1 && lastFetch1.current.month === month1) return
    lastFetch1.current = { slug: team1Slug, year: year1, month: month1 }
    setLoading1(true)
    fetchTeamOutcomesByMonth(team.leagueId, team1Slug, year1, month1).then(games => {
      setTeam1Chart([{ teamName: team.name, abbreviation: makeAbbr(team.name), games }])
      setLoading1(false)
    })
  }, [compared, team1Slug, year1, month1]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!compared || !team2Slug) return
    const team = resolveTeam(team2Slug)
    if (!team) return
    if (lastFetch2.current.slug === team2Slug && lastFetch2.current.year === year2 && lastFetch2.current.month === month2) return
    lastFetch2.current = { slug: team2Slug, year: year2, month: month2 }
    setLoading2(true)
    fetchTeamOutcomesByMonth(team.leagueId, team2Slug, year2, month2).then(games => {
      setTeam2Chart([{ teamName: team.name, abbreviation: makeAbbr(team.name), games }])
      setLoading2(false)
    })
  }, [compared, team2Slug, year2, month2]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-compare from URL params ─────────────────────────────────────────

  useEffect(() => {
    if (ready && team1Slug && team2Slug && !compared) {
      handleCompare(team1Slug, team2Slug, range)
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Briefing generation ──────────────────────────────────────────────────

  async function generateBriefingForRange(
    r1: ResolvedTeam, r2: ResolvedTeam,
    g1: GameEntry[], g2: GameEntry[],
    promptLabel: string,
  ) {
    setBriefingLoading(true)
    setBriefing(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/compare-briefing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          team1Name:  r1.name,
          team2Name:  r2.name,
          team1Games: g1.slice(-20),
          team2Games: g2.slice(-20),
          rangeLabel: promptLabel,
        }),
      })
      const json = await res.json()
      if (json.briefing) setBriefing(json.briefing)
    } catch { /* silent */ }
    setBriefingLoading(false)
  }

  // ── Core compare handler ─────────────────────────────────────────────────

  async function handleCompare(t1 = team1Slug, t2 = team2Slug, activeRange = range) {
    if (!t1 || !t2) return
    const r1 = resolveTeam(t1)
    const r2 = resolveTeam(t2)
    if (!r1 || !r2) return

    lastFetch1.current = { slug: t1, year: year1, month: month1 }
    lastFetch2.current = { slug: t2, year: year2, month: month2 }

    setBriefing(null)
    setCompared(true)

    const params = new URLSearchParams()
    params.set('team1', t1)
    params.set('team2', t2)
    params.set('range', activeRange)
    router.replace(`/compare?${params.toString()}`, { scroll: false })

    setLoading1(true)
    setLoading2(true)

    const [t1Monthly, t1Season, t2Monthly, t2Season] = await Promise.all([
      fetchTeamOutcomesByMonth(r1.leagueId, t1, year1, month1),
      fetchTeamSeasonOutcomes(r1.leagueId, t1),
      fetchTeamOutcomesByMonth(r2.leagueId, t2, year2, month2),
      fetchTeamSeasonOutcomes(r2.leagueId, t2),
    ])

    setTeam1Games(t1Season)
    setTeam1Chart([{ teamName: r1.name, abbreviation: makeAbbr(r1.name), games: t1Monthly }])
    setTeam1Season([{ teamName: r1.name, abbreviation: makeAbbr(r1.name), games: t1Season }])
    setLoading1(false)

    setTeam2Games(t2Season)
    setTeam2Chart([{ teamName: r2.name, abbreviation: makeAbbr(r2.name), games: t2Monthly }])
    setTeam2Season([{ teamName: r2.name, abbreviation: makeAbbr(r2.name), games: t2Season }])
    setLoading2(false)

    if (t1Season.length > 0 || t2Season.length > 0) {
      const promptLabel = RANGE_OPTIONS.find(o => o.value === activeRange)?.promptLabel ?? 'this season'
      const g1 = filterGamesByRange(t1Season, activeRange)
      const g2 = filterGamesByRange(t2Season, activeRange)
      generateBriefingForRange(r1, r2, g1, g2, promptLabel)
    }
  }

  // ── Range change handler ─────────────────────────────────────────────────

  function handleRangeChange(newRange: TimeRange) {
    setRange(newRange)

    // Update URL
    if (compared && team1Slug && team2Slug) {
      const params = new URLSearchParams()
      params.set('team1', team1Slug)
      params.set('team2', team2Slug)
      params.set('range', newRange)
      router.replace(`/compare?${params.toString()}`, { scroll: false })
    }

    // Auto-navigate to current month for short ranges so relevant games are visible
    if (newRange !== 'this-season') {
      const curY = today.getFullYear()
      const curM = today.getMonth() + 1
      if (year1 !== curY || month1 !== curM) { setYear1(curY); setMonth1(curM) }
      if (year2 !== curY || month2 !== curM) { setYear2(curY); setMonth2(curM) }
    }

    // Regenerate briefing with filtered data
    if (!compared || !team1Slug || !team2Slug) return
    const r1 = resolveTeam(team1Slug)
    const r2 = resolveTeam(team2Slug)
    if (!r1 || !r2) return

    const g1 = filterGamesByRange(team1Games, newRange)
    const g2 = filterGamesByRange(team2Games, newRange)
    const promptLabel = RANGE_OPTIONS.find(o => o.value === newRange)?.promptLabel ?? 'this season'
    generateBriefingForRange(r1, r2, g1, g2, promptLabel)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!ready) return null
  if (memberTier !== 'pro') return <ComparePaywall />

  const team1 = team1Slug ? resolveTeam(team1Slug) : null
  const team2 = team2Slug ? resolveTeam(team2Slug) : null
  const { canPrev: can1Prev, canNext: can1Next } = team1 ? seasonNav(team1.leagueId, year1, month1) : { canPrev: false, canNext: false }
  const { canPrev: can2Prev, canNext: can2Next } = team2 ? seasonNav(team2.leagueId, year2, month2) : { canPrev: false, canNext: false }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>

      {/* Page header */}
      <div style={{ padding: '24px 24px 20px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700, fontFamily: OSWALD }}>
            ⚡ Pro · Chart Compare
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: TEXT, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px', fontFamily: OSWALD }}>
            Compare
          </h1>
          <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.6 }}>
            Select any two teams to view their outcome charts and season records side by side.
          </p>
        </div>
      </div>

      {/* Selector bar */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, background: '#0a0a0f' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="selector-row" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <TeamDropdown slot={1} value={team1Slug} onChange={setTeam1Slug} />
            <span style={{ color: MUTED, fontWeight: 700, fontFamily: OSWALD, fontSize: 14, flexShrink: 0 }}>VS</span>
            <TeamDropdown slot={2} value={team2Slug} onChange={setTeam2Slug} />
            <button
              onClick={() => handleCompare()}
              disabled={!team1Slug || !team2Slug}
              style={{
                background: team1Slug && team2Slug ? 'linear-gradient(135deg, #22c55e, #16a34a)' : CARD,
                border: 'none', borderRadius: 10, padding: '13px 28px',
                color: team1Slug && team2Slug ? '#000' : MUTED,
                fontSize: 13, fontWeight: 900, letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: team1Slug && team2Slug ? 'pointer' : 'default',
                fontFamily: OSWALD, flexShrink: 0,
                boxShadow: team1Slug && team2Slug ? '0 0 20px #22c55e44' : 'none',
                transition: 'all 0.15s',
              }}
            >
              Compare
            </button>
            {compared && <ShareButton />}
          </div>
        </div>
      </div>

      {/* Comparison content */}
      {compared && team1 && team2 && (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px' }}>

          {/* Row 1: Team headers + stat cards */}
          <div className="compare-grid" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <TeamStats team={team1} games={filteredGames1} loading={loading1} />
            <TeamStats team={team2} games={filteredGames2} loading={loading2} />
          </div>

          {/* Time frame toggle — between stat cards and charts */}
          <TimeFrameToggle value={range} onChange={handleRangeChange} />

          {/* Row 2: Charts */}
          <div className="compare-grid" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <TeamChartPanel
              team={team1}
              chartData={filteredChartData1}
              seasonData={filteredSeasonData1}
              year={year1} month={month1}
              onPrev={() => prevMonth(year1, month1, setYear1, setMonth1)}
              onNext={() => nextMonth(year1, month1, setYear1, setMonth1)}
              canPrev={can1Prev} canNext={can1Next}
              loading={loading1}
            />
            <TeamChartPanel
              team={team2}
              chartData={filteredChartData2}
              seasonData={filteredSeasonData2}
              year={year2} month={month2}
              onPrev={() => prevMonth(year2, month2, setYear2, setMonth2)}
              onNext={() => nextMonth(year2, month2, setYear2, setMonth2)}
              canPrev={can2Prev} canNext={can2Next}
              loading={loading2}
            />
          </div>

          {/* AI Briefing */}
          <div style={{ marginTop: 32, padding: '24px 28px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, fontFamily: OSWALD }}>
                ◈ Chart Comparison
              </div>
              <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: MONO }}>
                · {RANGE_OPTIONS.find(o => o.value === range)?.label ?? 'This Season'}
              </div>
            </div>
            {briefingLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: MUTED, fontSize: 11, letterSpacing: '0.1em' }}>
                <div className="briefing-spinner" />
                Generating comparison briefing…
              </div>
            ) : briefing ? (
              <p style={{ fontSize: 13, color: SUB, lineHeight: 1.85, margin: 0 }}>{briefing}</p>
            ) : (
              <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                {user ? 'No data for this range — try a longer time frame.' : 'Sign in to generate an AI comparison briefing.'}
              </p>
            )}
          </div>

          <p style={{ fontSize: 10, color: '#2a2a34', textAlign: 'center', marginTop: 20, letterSpacing: '0.06em' }}>
            Charts scroll independently. Synchronized horizontal scroll is a planned future enhancement.
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .compare-grid { flex-direction: column !important; }
        }
        @media (max-width: 640px) {
          .selector-row { flex-direction: column !important; align-items: stretch !important; }
          .stat-card { flex: 1 1 calc(50% - 4px) !important; }
        }
        .briefing-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #1a1a24; border-top-color: #22c55e;
          border-radius: 50%; animation: gc-spin 0.7s linear infinite;
        }
        @keyframes gc-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 60, textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        Loading…
      </div>
    }>
      <CompareClient />
    </Suspense>
  )
}
