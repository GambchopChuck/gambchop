import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrendResult = 'above' | 'below' | 'average'

export interface TrendCell {
  game_date:    string
  actual_value: number
  season_avg:   number
  result:       TrendResult
  pct_diff:     number          // positive = above, negative = below
}

export interface TeamGameRow {
  game_date:  string
  hits:       number | null
  home_runs:  number | null
  runs:       number | null
  strikeouts: number | null
  walks:      number | null
  at_bats:    number | null
}

export interface PlayerGameRow {
  game_date:  string
  hits:       number | null
  home_runs:  number | null
  rbis:       number | null
  strikeouts: number | null
  walks:      number | null
  at_bats:    number | null
}

export type PlayerEntry = { team: string; games: PlayerGameRow[] }

// Full-season batting averages sourced from the MLB Stats API (same source as Stats page)
export interface TeamMLBAvg {
  hits_per_game:       number
  runs_per_game:       number
  home_runs_per_game:  number
  walks_per_game:      number
  strikeouts_per_game: number
  avg:                 number   // parsed from ".257"
  obp:                 number   // parsed from ".323"
}

// ─── Pure computation helpers ─────────────────────────────────────────────────

export function computeSeasonAvg(values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v !== null)
  if (!valid.length) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

export function computeTrends(
  rows:          TeamGameRow[],
  getValue:      (row: TeamGameRow) => number | null,
  threshold = 5,                          // % deviation to count as above/below
): TrendCell[] {
  const values   = rows.map(getValue)
  const seasonAvg = computeSeasonAvg(values)
  if (seasonAvg === 0) return []

  return rows
    .map(row => {
      const actual = getValue(row)
      if (actual === null) return null
      const pctDiff = ((actual - seasonAvg) / seasonAvg) * 100
      const result: TrendResult =
        pctDiff > threshold ? 'above' :
        pctDiff < -threshold ? 'below' : 'average'
      return { game_date: row.game_date, actual_value: actual, season_avg: seasonAvg, result, pct_diff: pctDiff }
    })
    .filter((c): c is TrendCell => c !== null)
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

type RawRow = { team_name: string } & TeamGameRow

export async function fetchAllTeamGameStats(
  league = 'MLB',
): Promise<Record<string, TeamGameRow[]>> {
  const { data, error } = await supabase
    .from('team_game_stats')
    .select('team_name, game_date, hits, home_runs, runs, strikeouts, walks, at_bats')
    .eq('league', league)
    .order('game_date', { ascending: true })

  if (error) {
    console.error('[trends] fetchAllTeamGameStats:', error.message)
    return {}
  }

  const result: Record<string, TeamGameRow[]> = {}
  for (const raw of (data ?? []) as RawRow[]) {
    const { team_name, ...row } = raw
    if (!result[team_name]) result[team_name] = []
    result[team_name].push(row)
  }
  return result
}

export async function fetchAllPlayerGameStats(
  league = 'MLB',
): Promise<Record<string, PlayerEntry>> {
  const { data, error } = await supabase
    .from('player_game_stats')
    .select('player_name, team_name, game_date, hits, home_runs, rbis, strikeouts, walks, at_bats')
    .eq('league', league)
    .eq('player_type', 'batter')
    .order('game_date', { ascending: true })

  if (error) {
    console.error('[trends] fetchAllPlayerGameStats:', error.message)
    return {}
  }

  type RawPlayerRow = { player_name: string; team_name: string } & PlayerGameRow
  const result: Record<string, PlayerEntry> = {}
  for (const raw of (data ?? []) as RawPlayerRow[]) {
    const { player_name, team_name, ...row } = raw
    if (!result[player_name]) result[player_name] = { team: team_name, games: [] }
    result[player_name].games.push(row)
  }
  return result
}

// Fetch MLB Stats API season averages — same endpoint used by the Stats page.
// Used as the correct season-average baseline on the Trends page so the ±5%
// comparison reflects the full-season average, not just our backfill window.
export async function fetchMLBTeamAverages(): Promise<Record<string, TeamMLBAvg>> {
  try {
    const season = new Date().getFullYear()
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/stats?season=${season}&sportId=1&stats=season&group=hitting`,
      { next: { revalidate: 10800 } } as RequestInit,
    )
    if (!res.ok) return {}
    const json = await res.json() as {
      stats?: Array<{
        splits?: Array<{
          team: { name: string }
          stat: {
            gamesPlayed: number; hits: number; runs: number; homeRuns: number
            baseOnBalls: number; strikeOuts: number; avg: string; obp: string
          }
        }>
      }>
    }
    const result: Record<string, TeamMLBAvg> = {}
    for (const split of json.stats?.[0]?.splits ?? []) {
      const gp = split.stat.gamesPlayed
      if (!gp) continue
      result[split.team.name] = {
        hits_per_game:       split.stat.hits         / gp,
        runs_per_game:       split.stat.runs         / gp,
        home_runs_per_game:  split.stat.homeRuns     / gp,
        walks_per_game:      split.stat.baseOnBalls  / gp,
        strikeouts_per_game: split.stat.strikeOuts   / gp,
        avg: parseFloat(split.stat.avg),
        obp: parseFloat(split.stat.obp),
      }
    }
    return result
  } catch {
    console.error('[trends] fetchMLBTeamAverages failed')
    return {}
  }
}

// ─── Trend direction (for sparkline color) ────────────────────────────────────
// Compare average of last 5 games vs preceding 5 games.

export function computeTrendDirection(
  values:         number[],
  lowerIsBetter:  boolean,
): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat'
  const recent = values.slice(-10)
  const half   = Math.floor(recent.length / 2)
  if (half === 0) return 'flat'
  const early  = recent.slice(0, half)
  const late   = recent.slice(half)
  const avgE   = early.reduce((a, b) => a + b, 0) / early.length
  const avgL   = late.reduce((a, b)  => a + b, 0) / late.length
  const pct    = avgE === 0 ? 0 : ((avgL - avgE) / Math.abs(avgE)) * 100
  if (Math.abs(pct) < 3) return 'flat'
  const improving = lowerIsBetter ? pct < 0 : pct > 0
  return improving ? 'up' : 'down'
}
