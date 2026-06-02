// Server-only — imports supabaseAdmin. Never import this in client components.
// Import types with `import type` from here safely.

import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchOdds }     from '@/lib/odds-api'
import { extractLine }   from '@/lib/ingestion'
import type { GameOdds } from '@/lib/odds-api'

// ─── Shared types (import with `import type` from client components) ──────────

export interface TeamForm {
  moneyline:  { result: string; date: string }[]
  spread:     { result: string; date: string }[]
  over_under: { result: string; date: string }[]
}

export interface TopMatchupData {
  league:        string
  gameDate:      string   // YYYY-MM-DD ET
  homeTeam:      string
  awayTeam:      string
  homeScore:     number   // 0–1  (season win rate)
  awayScore:     number
  combinedScore: number
  homeForm:      TeamForm
  awayForm:      TeamForm
  lines: {
    mlHome:       number | null
    mlAway:       number | null
    spreadHome:   number | null
    spreadAway:   number | null
    spreadJuice:  number | null
    total:        number | null
    commenceTime: string | null   // ISO UTC — stored inside lines JSONB
  }
}

// ─── Sport key map ────────────────────────────────────────────────────────────

const SPORT_KEYS: Record<string, string> = {
  mlb:  'baseball_mlb',
  nba:  'basketball_nba',
  nfl:  'americanfootball_nfl',
  nhl:  'icehockey_nhl',
  wnba: 'basketball_wnba',
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getGameDate(row: any): string {
  const g = row.games
  return (Array.isArray(g) ? g[0]?.game_date : g?.game_date) ?? ''
}

function computeScore(rows: any[]): number {
  let wins = 0, total = 0
  for (const r of rows) {
    if (r.moneyline_result !== null && r.moneyline_result !== undefined) {
      if (r.moneyline_result === 'win') wins++
      total++
    }
    if (r.spread_result !== null && r.spread_result !== undefined) {
      if (r.spread_result === 'win') wins++
      total++
    }
  }
  return total > 0 ? wins / total : 0
}

function buildForm(rows: any[], limit = 10): TeamForm {
  const cells = (col: string) =>
    rows
      .filter(r => r[col] != null)
      .slice(0, limit)
      .map(r => ({ result: r[col] as string, date: getGameDate(r) }))
  return {
    moneyline:  cells('moneyline_result'),
    spread:     cells('spread_result'),
    over_under: cells('over_under_result'),
  }
}

// ─── Convert raw Supabase top_matchups row → TopMatchupData ──────────────────

export function rowToTopMatchup(row: any): TopMatchupData | null {
  if (!row) return null
  return {
    league:        row.league,
    gameDate:      row.game_date,
    homeTeam:      row.home_team,
    awayTeam:      row.away_team,
    homeScore:     row.home_score  ?? 0,
    awayScore:     row.away_score  ?? 0,
    combinedScore: row.combined_score ?? 0,
    homeForm:      (row.home_form  as TeamForm) ?? { moneyline: [], spread: [], over_under: [] },
    awayForm:      (row.away_form  as TeamForm) ?? { moneyline: [], spread: [], over_under: [] },
    lines:         row.lines ?? { mlHome: null, mlAway: null, spreadHome: null, spreadAway: null, spreadJuice: null, total: null, commenceTime: null },
  }
}

// ─── Core function ────────────────────────────────────────────────────────────

export async function getTopMatchupByLeague(league: string): Promise<TopMatchupData | null> {
  const sportKey = SPORT_KEYS[league]
  if (!sportKey) {
    console.warn(`[topMatchups] no sport key for league: ${league}`)
    return null
  }

  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  // 1. Fetch today's odds from The Odds API
  let todayGames: GameOdds[] = []
  try {
    const res = await fetchOdds(sportKey)
    todayGames = res.data.filter(g => {
      const d = new Date(g.commence_time).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      return d === todayET
    })
    console.log(`[topMatchups] ${league}: ${todayGames.length} games today (${todayET})`)
  } catch (err) {
    console.error(`[topMatchups] odds fetch failed for ${league}:`, err)
    return null
  }

  if (!todayGames.length) return null

  // 2. Resolve team IDs from Supabase
  const teamNames = [...new Set(todayGames.flatMap(g => [g.home_team, g.away_team]))]
  const { data: teamRows } = await supabaseAdmin
    .from('teams')
    .select('id, name')
    .in('name', teamNames)

  const teamIdByName = new Map<string, string>(
    (teamRows ?? []).map((t: any) => [t.name as string, t.id as string])
  )
  const teamIds = (teamRows ?? []).map((t: any) => t.id as string)

  // 3. Fetch all season outcomes for involved teams
  const byTeam = new Map<string, any[]>()
  if (teamIds.length) {
    const { data: outcomes } = await supabaseAdmin
      .from('team_game_outcomes')
      .select('team_id, moneyline_result, spread_result, over_under_result, games!inner(game_date)')
      .in('team_id', teamIds)
      .order('game_date', { ascending: false, foreignTable: 'games' })

    for (const row of (outcomes ?? [])) {
      const list = byTeam.get(row.team_id) ?? []
      list.push(row)
      byTeam.set(row.team_id, list)
    }

    // Guarantee date-descending order per team
    for (const [, rows] of byTeam) {
      rows.sort((a, b) => {
        const da = getGameDate(a), db = getGameDate(b)
        return da < db ? 1 : da > db ? -1 : 0
      })
    }
  }

  // 4. Score every game, pick the one with the highest combined win rate
  let bestGame:      GameOdds | null = null
  let bestCombined   = -1
  let bestHomeScore  = 0
  let bestAwayScore  = 0

  for (const game of todayGames) {
    const homeId   = teamIdByName.get(game.home_team)
    const awayId   = teamIdByName.get(game.away_team)
    const homeScore = computeScore(homeId ? byTeam.get(homeId) ?? [] : [])
    const awayScore = computeScore(awayId ? byTeam.get(awayId) ?? [] : [])
    const combined  = homeScore + awayScore

    if (combined > bestCombined) {
      bestCombined  = combined
      bestGame      = game
      bestHomeScore = homeScore
      bestAwayScore = awayScore
    }
  }

  if (!bestGame) return null

  // 5. Build form and line data for the best game
  const homeId   = teamIdByName.get(bestGame.home_team)
  const awayId   = teamIdByName.get(bestGame.away_team)
  const homeRows = homeId ? byTeam.get(homeId) ?? [] : []
  const awayRows = awayId ? byTeam.get(awayId) ?? [] : []
  const line     = extractLine(bestGame)

  console.log(`[topMatchups] ${league}: best matchup → ${bestGame.away_team} @ ${bestGame.home_team} (${bestCombined.toFixed(3)})`)

  return {
    league,
    gameDate:      todayET,
    homeTeam:      bestGame.home_team,
    awayTeam:      bestGame.away_team,
    homeScore:     bestHomeScore,
    awayScore:     bestAwayScore,
    combinedScore: bestCombined,
    homeForm:      buildForm(homeRows),
    awayForm:      buildForm(awayRows),
    lines: {
      mlHome:       line.ml_home,
      mlAway:       line.ml_away,
      spreadHome:   line.spread_home,
      spreadAway:   line.spread_away,
      spreadJuice:  line.spread_juice,
      total:        line.total,
      commenceTime: bestGame.commence_time,
    },
  }
}
