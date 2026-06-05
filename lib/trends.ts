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
  game_date:    string
  hits:         number | null
  home_runs:    number | null
  runs:         number | null
  strikeouts:   number | null   // batter strikeouts
  walks:        number | null
  at_bats:      number | null
  home_or_away: string | null
  opponent:     string | null
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
    .select('team_name, game_date, hits, home_runs, runs, strikeouts, walks, at_bats, home_or_away, opponent')
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
