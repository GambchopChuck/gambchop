import { supabaseAdmin } from '@/lib/supabase-admin'

// =============================================================================
// Types
// =============================================================================

export type ChartRow =
  | 'moneyline'
  | 'spread'
  | 'ml_favorite'
  | 'ml_underdog'
  | 'spread_favorite'
  | 'spread_dog'
  | 'home'
  | 'away'
  | 'over_under'

export type LeaderCategory =
  | 'moneyline_wins'
  | 'spread_covers'
  | 'overs'
  | 'unders'
  | 'home_wins'
  | 'away_wins'
  | 'ml_favorite_wins'
  | 'ml_underdog_wins'

// =============================================================================
// Tool 1: identifyChartContent
// =============================================================================

export async function identifyChartContent() {
  return {
    note: 'Use vision to describe the image. Confirm the subject (team/player), chart row, and time range with the user before running data queries. Gambchop rows: moneyline, spread, ml_favorite, ml_underdog, spread_favorite, spread_dog, home, away, over_under.',
  }
}

// =============================================================================
// Tool 2: searchSubject
// =============================================================================

export async function searchSubject(params: { query: string; league?: string }) {
  const matches: Array<{
    id: string
    name: string
    type: 'team' | 'player'
    league: string
  }> = []

  let teamQuery: any = supabaseAdmin
    .from('teams')
    .select('id, name, abbreviation, leagues(name)')
    .or(`name.ilike.%${params.query}%,abbreviation.ilike.%${params.query}%`)

  if (params.league) {
    teamQuery = teamQuery.eq('leagues.name', params.league)
  }

  const { data: teams, error } = await teamQuery.limit(10)

  if (error) {
    console.error('searchSubject teams error:', error)
  }

  if (teams) {
    for (const team of teams) {
      const leagueObj = team.leagues as { name?: string } | { name?: string }[] | null
      const leagueName = Array.isArray(leagueObj)
        ? leagueObj[0]?.name ?? 'unknown'
        : leagueObj?.name ?? 'unknown'

      matches.push({
        id: team.id,
        name: team.name,
        type: 'team',
        league: leagueName,
      })
    }
  }

  return { matches }
}

// =============================================================================
// Filter builder — same logic as before
// =============================================================================

type RowFilter = {
  resultColumn: 'moneyline_result' | 'spread_result' | 'over_under_result'
  contextFilters: Array<{ column: string; value: boolean }>
  excludeNullResult: boolean
}

function getRowFilter(row: ChartRow): RowFilter {
  switch (row) {
    case 'moneyline':
      return { resultColumn: 'moneyline_result', contextFilters: [], excludeNullResult: false }
    case 'spread':
      return { resultColumn: 'spread_result', contextFilters: [], excludeNullResult: true }
    case 'ml_favorite':
      return {
        resultColumn: 'moneyline_result',
        contextFilters: [{ column: 'was_ml_favorite', value: true }],
        excludeNullResult: false,
      }
    case 'ml_underdog':
      return {
        resultColumn: 'moneyline_result',
        contextFilters: [{ column: 'was_ml_favorite', value: false }],
        excludeNullResult: false,
      }
    case 'spread_favorite':
      return {
        resultColumn: 'spread_result',
        contextFilters: [{ column: 'was_spread_favorite', value: true }],
        excludeNullResult: true,
      }
    case 'spread_dog':
      return {
        resultColumn: 'spread_result',
        contextFilters: [{ column: 'was_spread_favorite', value: false }],
        excludeNullResult: true,
      }
    case 'home':
      return {
        resultColumn: 'moneyline_result',
        contextFilters: [{ column: 'was_home', value: true }],
        excludeNullResult: false,
      }
    case 'away':
      return {
        resultColumn: 'moneyline_result',
        contextFilters: [{ column: 'was_home', value: false }],
        excludeNullResult: false,
      }
    case 'over_under':
      return { resultColumn: 'over_under_result', contextFilters: [], excludeNullResult: true }
  }
}

// =============================================================================
// Tool 3: getRecord
// Joins to games to get game_date. Date filters operate on games.game_date.
// =============================================================================

export async function getRecord(params: {
  subject_id: string
  subject_type: 'team' | 'player'
  chart_row: ChartRow
  start_date?: string
  end_date?: string
}) {
  if (params.subject_type === 'player') {
    return {
      wins: 0,
      losses: 0,
      pushes: 0,
      total_games: 0,
      win_rate: 0,
      date_range: { start: null, end: null },
      note: 'Player records not yet available — player outcomes table pending.',
    }
  }

  const filter = getRowFilter(params.chart_row)

  let query: any = supabaseAdmin
    .from('team_game_outcomes')
    .select(`${filter.resultColumn}, games!inner(game_date)`)
    .eq('team_id', params.subject_id)

  for (const ctx of filter.contextFilters) {
    query = query.eq(ctx.column, ctx.value)
  }

  if (filter.excludeNullResult) {
    query = query.not(filter.resultColumn, 'is', null)
  }

  if (params.start_date) query = query.gte('games.game_date', params.start_date)
  if (params.end_date) query = query.lte('games.game_date', params.end_date)

  const { data, error } = await query.order('game_date', {
    ascending: true,
    foreignTable: 'games',
  })

  if (error) {
    console.error('getRecord error:', error)
    return {
      wins: 0,
      losses: 0,
      pushes: 0,
      total_games: 0,
      win_rate: 0,
      date_range: { start: null, end: null },
    }
  }

  const rows = (data ?? []) as Array<Record<string, any>>

  const getGameDate = (r: Record<string, any>): string | null => {
    const g = r.games
    if (!g) return null
    if (Array.isArray(g)) return g[0]?.game_date ?? null
    return g.game_date ?? null
  }

  const results = rows.map((r) => r[filter.resultColumn] as string | null)

  let wins = 0
  let losses = 0
  let pushes = 0

  if (params.chart_row === 'over_under') {
    wins = results.filter((r) => r === 'over').length
    losses = results.filter((r) => r === 'under').length
    pushes = results.filter((r) => r === 'push').length
  } else {
    wins = results.filter((r) => r === 'win').length
    losses = results.filter((r) => r === 'loss').length
    pushes = results.filter((r) => r === 'push').length
  }

  const total = wins + losses + pushes
  const decided = wins + losses
  const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0

  return {
    wins,
    losses,
    pushes,
    total_games: total,
    win_rate: winRate,
    date_range: {
      start: rows.length > 0 ? getGameDate(rows[0]) : null,
      end: rows.length > 0 ? getGameDate(rows[rows.length - 1]) : null,
    },
  }
}

// =============================================================================
// Tool 4: getCurrentStreaks
// Joins to games AND teams. Date column comes from games.game_date.
// =============================================================================

export async function getCurrentStreaks(params: {
  league: string
  chart_row: ChartRow
  min_length?: number
  direction?: 'win' | 'loss' | 'over' | 'under'
}) {
  const minLength = params.min_length ?? 3
  const filter = getRowFilter(params.chart_row)

  const query: any = supabaseAdmin
    .from('team_game_outcomes')
    .select(
      `team_id, ${filter.resultColumn}, games!inner(game_date), teams!inner(name, leagues!inner(name))`
    )
    .eq('teams.leagues.name', params.league)

  let scoped: any = query
  for (const ctx of filter.contextFilters) {
    scoped = scoped.eq(ctx.column, ctx.value)
  }

  if (filter.excludeNullResult) {
    scoped = scoped.not(filter.resultColumn, 'is', null)
  }

  const { data, error } = await scoped
    .order('team_id', { ascending: true })
    .order('game_date', { ascending: false, foreignTable: 'games' })

  if (error) {
    console.error('getCurrentStreaks error:', error)
    return { streaks: [] }
  }

  const rows = (data ?? []) as Array<Record<string, any>>

  const byTeam = new Map<string, Array<Record<string, any>>>()
  for (const row of rows) {
    const list = byTeam.get(row.team_id) ?? []
    list.push(row)
    byTeam.set(row.team_id, list)
  }

  const streaks: Array<{
    subject_name: string
    streak_length: number
    streak_type: string
    last_outcome_date: string | null
  }> = []

  const getGameDate = (r: Record<string, any>): string | null => {
    const g = r.games
    if (!g) return null
    if (Array.isArray(g)) return g[0]?.game_date ?? null
    return g.game_date ?? null
  }

  for (const [, teamRows] of byTeam) {
    if (teamRows.length === 0) continue

    const mostRecent = teamRows[0]
    const mostRecentResult = mostRecent[filter.resultColumn] as string | null
    if (!mostRecentResult || mostRecentResult === 'push') continue
    if (params.direction && mostRecentResult !== params.direction) continue

    let length = 1
    for (let i = 1; i < teamRows.length; i++) {
      const next = teamRows[i][filter.resultColumn] as string | null
      if (next === mostRecentResult) length++
      else break
    }

    if (length >= minLength) {
      const teamObj = mostRecent.teams as { name?: string } | { name?: string }[] | null
      const teamName = Array.isArray(teamObj)
        ? teamObj[0]?.name ?? 'unknown'
        : teamObj?.name ?? 'unknown'

      streaks.push({
        subject_name: teamName,
        streak_length: length,
        streak_type: mostRecentResult,
        last_outcome_date: getGameDate(mostRecent),
      })
    }
  }

  streaks.sort((a, b) => b.streak_length - a.streak_length)
  return { streaks }
}

// =============================================================================
// Tool 5: getSplit
// =============================================================================

export async function getSplit(params: {
  subject_id?: string
  league: string
  split_type: 'home_away' | 'favorite_underdog'
  start_date?: string
  end_date?: string
}) {
  const rowA: ChartRow = params.split_type === 'home_away' ? 'home' : 'ml_favorite'
  const rowB: ChartRow = params.split_type === 'home_away' ? 'away' : 'ml_underdog'
  const labelA = params.split_type === 'home_away' ? 'home' : 'favorite'
  const labelB = params.split_type === 'home_away' ? 'away' : 'underdog'

  const sideA = await querySplitSide({ ...params, chart_row: rowA })
  const sideB = await querySplitSide({ ...params, chart_row: rowB })

  return {
    split_a: { label: labelA, ...sideA },
    split_b: { label: labelB, ...sideB },
  }
}

async function querySplitSide(params: {
  subject_id?: string
  league: string
  chart_row: ChartRow
  start_date?: string
  end_date?: string
}) {
  const filter = getRowFilter(params.chart_row)

  let query: any = supabaseAdmin
    .from('team_game_outcomes')
    .select(
      `${filter.resultColumn}, games!inner(game_date), teams!inner(leagues!inner(name))`
    )
    .eq('teams.leagues.name', params.league)

  for (const ctx of filter.contextFilters) {
    query = query.eq(ctx.column, ctx.value)
  }

  if (filter.excludeNullResult) {
    query = query.not(filter.resultColumn, 'is', null)
  }

  if (params.subject_id) query = query.eq('team_id', params.subject_id)
  if (params.start_date) query = query.gte('games.game_date', params.start_date)
  if (params.end_date) query = query.lte('games.game_date', params.end_date)

  const { data, error } = await query

  if (error) {
    console.error('querySplitSide error:', error)
    return { wins: 0, losses: 0, pushes: 0 }
  }

  const rows = (data ?? []) as Array<Record<string, any>>
  const results = rows.map((r) => r[filter.resultColumn] as string | null)

  return {
    wins: results.filter((r) => r === 'win').length,
    losses: results.filter((r) => r === 'loss').length,
    pushes: results.filter((r) => r === 'push').length,
  }
}

// =============================================================================
// Tool 6: getLeaders
// =============================================================================

export async function getLeaders(params: {
  league: string
  category: LeaderCategory
  start_date?: string
  end_date?: string
  limit?: number
}) {
  const limit = params.limit ?? 10

  const categoryMap: Record<LeaderCategory, { row: ChartRow; target: string }> = {
    moneyline_wins:   { row: 'moneyline',   target: 'win'   },
    spread_covers:    { row: 'spread',      target: 'win'   },
    overs:            { row: 'over_under',  target: 'over'  },
    unders:           { row: 'over_under',  target: 'under' },
    home_wins:        { row: 'home',        target: 'win'   },
    away_wins:        { row: 'away',        target: 'win'   },
    ml_favorite_wins: { row: 'ml_favorite', target: 'win'   },
    ml_underdog_wins: { row: 'ml_underdog', target: 'win'   },
  }

  const { row: chartRow, target } = categoryMap[params.category]
  const filter = getRowFilter(chartRow)

  let query: any = supabaseAdmin
    .from('team_game_outcomes')
    .select(
      `team_id, ${filter.resultColumn}, games!inner(game_date), teams!inner(name, leagues!inner(name))`
    )
    .eq('teams.leagues.name', params.league)

  for (const ctx of filter.contextFilters) {
    query = query.eq(ctx.column, ctx.value)
  }

  if (filter.excludeNullResult) {
    query = query.not(filter.resultColumn, 'is', null)
  }

  if (params.start_date) query = query.gte('games.game_date', params.start_date)
  if (params.end_date) query = query.lte('games.game_date', params.end_date)

  const { data, error } = await query

  if (error) {
    console.error('getLeaders error:', error)
    return { leaders: [] }
  }

  const rows = (data ?? []) as Array<Record<string, any>>

  const counts = new Map<string, { name: string; matching: number; total: number }>()
  for (const row of rows) {
    const teamObj = row.teams as { name?: string } | { name?: string }[] | null
    const teamName = Array.isArray(teamObj)
      ? teamObj[0]?.name ?? 'unknown'
      : teamObj?.name ?? 'unknown'

    const result = row[filter.resultColumn] as string | null
    const current = counts.get(row.team_id) ?? { name: teamName, matching: 0, total: 0 }
    current.total++
    if (result === target) current.matching++
    counts.set(row.team_id, current)
  }

  const leaders = Array.from(counts.values())
    .sort((a, b) => b.matching - a.matching)
    .slice(0, limit)
    .map((entry, index) => ({
      rank:          index + 1,
      subject_name:  entry.name,
      count:         entry.matching,
      total_games:   entry.total,
    }))

  return { leaders }
}
