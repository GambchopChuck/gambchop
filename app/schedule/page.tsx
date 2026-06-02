export const revalidate = 3600

import { supabaseAdmin }       from '@/lib/supabase-admin'
import { extractLine }         from '@/lib/ingestion'
import type { GameOdds }       from '@/lib/odds-api'
import ScheduleClient          from '@/components/schedule/ScheduleClient'
import { rowToTopMatchup }     from '@/lib/topMatchups'
import type { TopMatchupData } from '@/lib/topMatchups'

export const metadata = {
  title: 'Schedule | Gambchop',
  description: 'Upcoming MLB matchups with side-by-side team chart comparisons.',
}

// ─── Types (re-exported so ScheduleClient can import them) ────────────────────

export type OutcomeRow  = { result: string; date: string }
export type TeamChart   = { moneyline: OutcomeRow[]; spread: OutcomeRow[]; over_under: OutcomeRow[] }
export type GameLines   = {
  mlHome:      number | null
  mlAway:      number | null
  spreadHome:  number | null
  spreadAway:  number | null
  spreadJuice: number | null
  total:       number | null
  overJuice:   number | null
  underJuice:  number | null
}
export type ScheduleGame = {
  id:            string
  homeTeam:      string
  awayTeam:      string
  commenceTime:  string   // UTC ISO
  lines:         GameLines
  homeChart:     TeamChart
  awayChart:     TeamChart
  blurb:         string
  // MLB Stats API enrichment (null if unavailable)
  venue:         { name: string; city: string } | null
  awayPitcher:   string | null   // full name from MLB Stats API
  homePitcher:   string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDate(row: any): string {
  const g = row.games
  return (Array.isArray(g) ? g[0]?.game_date : g?.game_date) ?? ''
}

function buildChart(rows: any[]): TeamChart {
  function cells(col: string): OutcomeRow[] {
    return rows
      .filter(r => r[col] != null)
      .map(r => ({ result: r[col] as string, date: getDate(r) }))
      .slice(0, 10)
  }
  return {
    moneyline:  cells('moneyline_result'),
    spread:     cells('spread_result'),
    over_under: cells('over_under_result'),
  }
}

// ─── MLB Stats API ─────────────────────────────────────────────────────────────
// Free, no API key. One call covers the full date range.
// Docs: https://statsapi.mlb.com/api/v1/schedule

interface MlbVenueLocation {
  city?:         string
  stateAbbrev?:  string
  province?:     string   // Canada
}

interface MlbTeamSide {
  team:              { name: string }
  probablePitcher?:  { fullName: string }
}

interface MlbGame {
  teams:  { away: MlbTeamSide; home: MlbTeamSide }
  venue?: { name: string; location?: MlbVenueLocation }
}

interface GameMeta {
  venue:       { name: string; city: string } | null
  awayPitcher: string | null
  homePitcher: string | null
}

async function fetchMlbMeta(etDates: string[]): Promise<Map<string, GameMeta>> {
  if (!etDates.length) return new Map()

  const startDate = etDates[0]
  const endDate   = etDates[etDates.length - 1]

  const url =
    `https://statsapi.mlb.com/api/v1/schedule` +
    `?sportId=1&startDate=${startDate}&endDate=${endDate}` +
    `&hydrate=venue,probablePitcher(note)`

  let data: { dates?: { date: string; games: MlbGame[] }[] }
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) {
      console.warn(`[schedule] MLB Stats API HTTP ${res.status}`)
      return new Map()
    }
    data = await res.json()
  } catch (err) {
    console.warn('[schedule] MLB Stats API fetch failed:', err)
    return new Map()
  }

  const map = new Map<string, GameMeta>()

  for (const dateObj of (data?.dates ?? [])) {
    for (const game of dateObj.games) {
      const awayName = game.teams?.away?.team?.name ?? ''
      const homeName = game.teams?.home?.team?.name ?? ''
      if (!awayName || !homeName) continue

      const loc       = game.venue?.location
      const cityPart  = loc?.city ?? null
      const statePart = loc?.stateAbbrev ?? loc?.province ?? null
      const city      = cityPart ? (statePart ? `${cityPart}, ${statePart}` : cityPart) : null

      map.set(`${awayName}|${homeName}`, {
        venue:       game.venue?.name && city ? { name: game.venue.name, city } : null,
        awayPitcher: game.teams.away.probablePitcher?.fullName ?? null,
        homePitcher: game.teams.home.probablePitcher?.fullName ?? null,
      })
    }
  }

  console.log(`[schedule] MLB Stats API: ${map.size} games enriched for ${etDates.join(', ')}`)
  return map
}

// AI blurb generation removed — no Claude API calls on this page.

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SchedulePage() {
  const apiKey = process.env.THE_ODDS_API_KEY
  if (!apiKey) {
    return <ScheduleClient games={[]} error="THE_ODDS_API_KEY is not configured." />
  }

  // ── 1. Fetch upcoming MLB odds (1-hour cached) ──────────────────────────────
  let rawGames: GameOdds[] = []
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds` +
      `?regions=us&markets=h2h,spreads,totals&oddsFormat=american&eventStatus=upcoming&apiKey=${apiKey}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) throw new Error(`Odds API HTTP ${res.status}`)
    rawGames = await res.json() as GameOdds[]
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return <ScheduleClient games={[]} error={`Could not load schedule: ${msg}`} />
  }

  // Filter to next 7 days
  const now      = Date.now()
  const cutoff   = now + 7 * 24 * 60 * 60 * 1000
  const upcoming = rawGames.filter(g => {
    const t = new Date(g.commence_time).getTime()
    return t >= now && t <= cutoff
  })

  if (!upcoming.length) {
    return <ScheduleClient games={[]} />
  }

  // ── 2. MLB Stats API: venue + probable pitchers (1-hour cached) ─────────────
  // Collect distinct ET dates so one API call covers the full window.
  const etDates = [
    ...new Set(
      upcoming.map(g =>
        new Date(g.commence_time).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      )
    ),
  ].sort()

  const mlbMeta = await fetchMlbMeta(etDates)

  // ── 3. Look up team IDs in Supabase ────────────────────────────────────────
  const teamNames = [...new Set(upcoming.flatMap(g => [g.home_team, g.away_team]))]
  const { data: teamRows } = await supabaseAdmin
    .from('teams')
    .select('id, name')
    .in('name', teamNames)

  const teamIdByName = new Map<string, string>(
    (teamRows ?? []).map((t: any) => [t.name as string, t.id as string])
  )
  const teamIds = (teamRows ?? []).map((t: any) => t.id as string)

  // ── 4. Fetch all recent outcomes for involved teams ─────────────────────────
  let allRows: any[] = []
  if (teamIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('team_game_outcomes')
      .select(
        'team_id, moneyline_result, spread_result, over_under_result, games!inner(game_date)'
      )
      .in('team_id', teamIds)
      .order('team_id',   { ascending: true })
      .order('game_date', { ascending: false, foreignTable: 'games' })

    // Explicit per-team date-desc sort (PostgREST ordering on foreign tables is not guaranteed)
    const byTeam = new Map<string, any[]>()
    for (const row of (data ?? [])) {
      const list = byTeam.get(row.team_id) ?? []
      list.push(row)
      byTeam.set(row.team_id, list)
    }
    for (const [, rows] of byTeam) {
      rows.sort((a, b) => {
        const da = getDate(a), db = getDate(b)
        return da < db ? 1 : da > db ? -1 : 0
      })
    }
    for (const [, rows] of byTeam) allRows.push(...rows)
  }

  const rowsByTeam = new Map<string, any[]>()
  for (const row of allRows) {
    const list = rowsByTeam.get(row.team_id) ?? []
    list.push(row)
    rowsByTeam.set(row.team_id, list)
  }

  // ── 5. Build schedule games ─────────────────────────────────────────────────
  const scheduleGames: ScheduleGame[] = upcoming.map((game) => {
    const line     = extractLine(game)
    const homeId   = teamIdByName.get(game.home_team) ?? ''
    const awayId   = teamIdByName.get(game.away_team) ?? ''
    const homeRows = homeId ? (rowsByTeam.get(homeId) ?? []) : []
    const awayRows = awayId ? (rowsByTeam.get(awayId) ?? []) : []

    // Match against MLB Stats API by team-name key
    const meta = mlbMeta.get(`${game.away_team}|${game.home_team}`) ?? null

    return {
      id:           game.id,
      homeTeam:     game.home_team,
      awayTeam:     game.away_team,
      commenceTime: game.commence_time,
      lines: {
        mlHome:      line.ml_home,
        mlAway:      line.ml_away,
        spreadHome:  line.spread_home,
        spreadAway:  line.spread_away,
        spreadJuice: line.spread_juice,
        total:       line.total,
        overJuice:   line.over_juice,
        underJuice:  line.under_juice,
      },
      homeChart:   buildChart(homeRows),
      awayChart:   buildChart(awayRows),
      blurb:       '',
      venue:       meta?.venue       ?? null,
      awayPitcher: meta?.awayPitcher ?? null,
      homePitcher: meta?.homePitcher ?? null,
    }
  })

  // ── 6. Read today's top matchups from Supabase (written by cron) ────────────
  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  let topMatchups: TopMatchupData[] = []
  try {
    const { data: tmRows } = await supabaseAdmin
      .from('top_matchups')
      .select('*')
      .eq('game_date', todayET)
    topMatchups = (tmRows ?? []).map(rowToTopMatchup).filter(Boolean) as TopMatchupData[]
  } catch {
    // Table may not exist yet — degrade gracefully
  }

  return <ScheduleClient games={scheduleGames} topMatchups={topMatchups} />
}
