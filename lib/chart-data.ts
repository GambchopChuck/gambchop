import { supabase } from './supabase'
import type { GameEntry, TeamChartData, BetResult } from './leagues-data'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}/${d}`
}

function restDaysBetween(prev: string, curr: string): number {
  const ms =
    new Date(curr + 'T00:00:00Z').getTime() -
    new Date(prev + 'T00:00:00Z').getTime()
  return Math.max(0, Math.round(ms / 86400000) - 1)
}

function makeAbbr(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)
}

function monthRange(year: number, month: number): { firstDay: string; lastDay: string } {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay  = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate().toString().padStart(2, '0')}`
  return { firstDay, lastDay }
}

// ─── League UUID cache ────────────────────────────────────────────────────────

const leagueIdCache = new Map<string, string>()

async function resolveLeagueId(slug: string): Promise<string | null> {
  if (leagueIdCache.has(slug)) return leagueIdCache.get(slug)!
  const { data } = await supabase.from('leagues').select('id').eq('slug', slug).single()
  if (!data?.id) return null
  leagueIdCache.set(slug, data.id as string)
  return data.id as string
}

// ─── Raw DB row types ─────────────────────────────────────────────────────────

type TeamRef = { id: string; name: string; slug: string }

type RawOutcome = {
  team_id:             string
  was_home:            boolean
  was_ml_favorite:     boolean
  was_spread_favorite: boolean
  own_score:           number
  opponent_score:      number
  moneyline_result:    string | null
  spread_result:       string | null
  over_under_result:   string | null
  team:                TeamRef | null
}

type RawGameRow = {
  game_date: string
  outcomes:  RawOutcome[]
}

// ─── Outcome → GameEntry ──────────────────────────────────────────────────────

function outcomeToEntry(o: RawOutcome, opponentName: string, gameDate: string): GameEntry {
  return {
    rawDate:          gameDate,
    date:             fmtDate(gameDate),
    opponent:         o.was_home ? opponentName : `@${opponentName}`,
    isHome:           o.was_home,
    isFavorite:       o.was_ml_favorite,
    isSpreadFavorite: o.was_spread_favorite,
    isDivisionGame:   false,
    restDays:         0,
    moneylineResult:  (o.moneyline_result  as BetResult) ?? null,
    spreadResult:     (o.spread_result     as BetResult) ?? null,
    ouResult:         (o.over_under_result as GameEntry['ouResult']) ?? null,
  }
}

function withRestDays(entries: GameEntry[], rawDates: string[]): GameEntry[] {
  return entries.map((e, i) => ({
    ...e,
    restDays: i === 0 ? 0 : restDaysBetween(rawDates[i - 1], rawDates[i]),
  }))
}

// ─── Core batched queries ─────────────────────────────────────────────────────

const OUTCOME_SELECT = `
  game_date,
  outcomes:team_game_outcomes(
    team_id,
    was_home, was_ml_favorite, was_spread_favorite,
    own_score, opponent_score,
    moneyline_result, spread_result, over_under_result,
    team:teams!team_id(id, name, slug)
  )
`

async function fetchLeagueGameRows(leagueId: string): Promise<RawGameRow[]> {
  const { data, error } = await supabase
    .from('games')
    .select(OUTCOME_SELECT)
    .eq('league_id', leagueId)
    .eq('status', 'final')
    .order('game_date', { ascending: false })

  if (error) {
    console.error('[chart-data] fetchLeagueGameRows:', error.message)
    return []
  }
  const rows = (data as unknown as RawGameRow[]) ?? []
  console.log(`[chart-data] fetchLeagueGameRows: ${rows.length} rows, latest: ${rows[0]?.game_date ?? 'none'}`)
  return rows
}

async function fetchLeagueGameRowsByMonth(
  leagueId: string,
  year: number,
  month: number,
): Promise<RawGameRow[]> {
  const { firstDay, lastDay } = monthRange(year, month)
  const { data, error } = await supabase
    .from('games')
    .select(OUTCOME_SELECT)
    .eq('league_id', leagueId)
    .eq('status', 'final')
    .gte('game_date', firstDay)
    .lte('game_date', lastDay)
    .order('game_date', { ascending: true })

  if (error) {
    console.error('[chart-data] fetchLeagueGameRowsByMonth:', error.message)
    return []
  }
  return (data as unknown as RawGameRow[]) ?? []
}

// ─── Helper: rows → TeamChartData[] ──────────────────────────────────────────

type Pair = { entry: GameEntry; date: string }

function rowsToTeamMap(rows: RawGameRow[]): Map<string, { name: string; pairs: Pair[] }> {
  const teamMap = new Map<string, { name: string; pairs: Pair[] }>()
  for (const row of rows) {
    for (const outcome of row.outcomes ?? []) {
      const t = outcome.team
      if (!t) continue
      if (!teamMap.has(t.slug)) teamMap.set(t.slug, { name: t.name, pairs: [] })
      const other = row.outcomes.find(o => o.team_id !== outcome.team_id)
      const opponentName = other?.team?.name ?? 'OPP'
      teamMap.get(t.slug)!.pairs.push({
        entry: outcomeToEntry(outcome, opponentName, row.game_date),
        date:  row.game_date,
      })
    }
  }
  return teamMap
}

// ─── fetchLeagueOutcomes (legacy — used by streak board) ─────────────────────

export async function fetchLeagueOutcomes(
  leagueSlug: string,
  limit = 10,
): Promise<TeamChartData[]> {
  try {
    const leagueId = await resolveLeagueId(leagueSlug)
    if (!leagueId) return []

    const rows = await fetchLeagueGameRows(leagueId)
    if (!rows.length) return []

    const teamMap = rowsToTeamMap(rows)

    return Array.from(teamMap.values()).map(({ name, pairs }) => {
      const recent = pairs
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, limit)
        .reverse()
      const entries = withRestDays(recent.map(p => p.entry), recent.map(p => p.date))
      return { teamName: name, abbreviation: makeAbbr(name), games: entries }
    })
  } catch (err) {
    console.error('[chart-data] fetchLeagueOutcomes:', err)
    return []
  }
}

// ─── fetchLeagueOutcomesByMonth ───────────────────────────────────────────────

export async function fetchLeagueOutcomesByMonth(
  leagueSlug: string,
  year: number,
  month: number,
): Promise<TeamChartData[]> {
  try {
    const leagueId = await resolveLeagueId(leagueSlug)
    if (!leagueId) return []

    const rows = await fetchLeagueGameRowsByMonth(leagueId, year, month)
    if (!rows.length) return []

    const teamMap = rowsToTeamMap(rows)

    return Array.from(teamMap.values()).map(({ name, pairs }) => {
      // Already sorted ASC from DB; no re-sort or slice needed
      const entries = withRestDays(pairs.map(p => p.entry), pairs.map(p => p.date))
      return { teamName: name, abbreviation: makeAbbr(name), games: entries }
    })
  } catch (err) {
    console.error('[chart-data] fetchLeagueOutcomesByMonth:', err)
    return []
  }
}

// ─── fetchLeagueSeasonOutcomes ────────────────────────────────────────────────
// Full season — all final games, no limit, sorted oldest-first.

export async function fetchLeagueSeasonOutcomes(
  leagueSlug: string,
): Promise<TeamChartData[]> {
  try {
    const leagueId = await resolveLeagueId(leagueSlug)
    if (!leagueId) return []

    const rows = await fetchLeagueGameRows(leagueId)
    if (!rows.length) return []

    const teamMap = rowsToTeamMap(rows)

    return Array.from(teamMap.values()).map(({ name, pairs }) => {
      const sorted = pairs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      const entries = withRestDays(sorted.map(p => p.entry), sorted.map(p => p.date))
      return { teamName: name, abbreviation: makeAbbr(name), games: entries }
    })
  } catch (err) {
    console.error('[chart-data] fetchLeagueSeasonOutcomes:', err)
    return []
  }
}

// ─── fetchTeamOutcomes (legacy — used by streak board) ───────────────────────

export async function fetchTeamOutcomes(
  leagueSlug: string,
  teamSlug:   string,
  limit = 10,
): Promise<GameEntry[]> {
  try {
    const leagueId = await resolveLeagueId(leagueSlug)
    if (!leagueId) return []

    const rows = await fetchLeagueGameRows(leagueId)
    if (!rows.length) return []

    const pairs: Pair[] = []
    for (const row of rows) {
      const mine = row.outcomes.find(o => o.team?.slug === teamSlug)
      if (!mine) continue
      const other = row.outcomes.find(o => o.team_id !== mine.team_id)
      pairs.push({
        entry: outcomeToEntry(mine, other?.team?.name ?? 'OPP', row.game_date),
        date:  row.game_date,
      })
    }

    const recent = pairs
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, limit)
      .reverse()
    return withRestDays(recent.map(p => p.entry), recent.map(p => p.date))
  } catch (err) {
    console.error('[chart-data] fetchTeamOutcomes:', err)
    return []
  }
}

// ─── fetchTeamOutcomesByMonth ─────────────────────────────────────────────────

export async function fetchTeamOutcomesByMonth(
  leagueSlug: string,
  teamSlug:   string,
  year:       number,
  month:      number,
): Promise<GameEntry[]> {
  try {
    const leagueId = await resolveLeagueId(leagueSlug)
    if (!leagueId) return []

    const rows = await fetchLeagueGameRowsByMonth(leagueId, year, month)
    if (!rows.length) return []

    const pairs: Pair[] = []
    for (const row of rows) {
      const mine = row.outcomes.find(o => o.team?.slug === teamSlug)
      if (!mine) continue
      const other = row.outcomes.find(o => o.team_id !== mine.team_id)
      pairs.push({
        entry: outcomeToEntry(mine, other?.team?.name ?? 'OPP', row.game_date),
        date:  row.game_date,
      })
    }

    return withRestDays(pairs.map(p => p.entry), pairs.map(p => p.date))
  } catch (err) {
    console.error('[chart-data] fetchTeamOutcomesByMonth:', err)
    return []
  }
}

// ─── fetchTeamSeasonOutcomes ──────────────────────────────────────────────────

export async function fetchTeamSeasonOutcomes(
  leagueSlug: string,
  teamSlug:   string,
): Promise<GameEntry[]> {
  try {
    const leagueId = await resolveLeagueId(leagueSlug)
    if (!leagueId) return []

    const rows = await fetchLeagueGameRows(leagueId)
    if (!rows.length) return []

    const pairs: Pair[] = []
    for (const row of rows) {
      const mine = row.outcomes.find(o => o.team?.slug === teamSlug)
      if (!mine) continue
      const other = row.outcomes.find(o => o.team_id !== mine.team_id)
      pairs.push({
        entry: outcomeToEntry(mine, other?.team?.name ?? 'OPP', row.game_date),
        date:  row.game_date,
      })
    }

    const sorted = pairs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    return withRestDays(sorted.map(p => p.entry), sorted.map(p => p.date))
  } catch (err) {
    console.error('[chart-data] fetchTeamSeasonOutcomes:', err)
    return []
  }
}

// ─── computeStreak ────────────────────────────────────────────────────────────

export type StreakType   = 'W' | 'L' | 'P' | 'O' | 'U'
export type StreakResult = { count: number; type: StreakType }

export function computeStreak(
  games:  GameEntry[],
  metric: 'moneyline' | 'spread' | 'over_under',
): StreakResult | null {
  const get = (g: GameEntry): string | null => {
    if (metric === 'moneyline') return g.moneylineResult
    if (metric === 'spread')    return g.spreadResult
    return g.ouResult
  }

  const isSkip = (r: string | null): boolean => {
    if (r === null) return true
    return metric === 'over_under'
      ? r !== 'over' && r !== 'under'
      : r !== 'win'  && r !== 'loss'
  }

  let ref: string | null = null
  for (let i = games.length - 1; i >= 0; i--) {
    const r = get(games[i])
    if (!isSkip(r)) { ref = r; break }
  }
  if (ref === null) return null

  const type: StreakType =
    metric === 'over_under'
      ? (ref === 'over' ? 'O' : 'U')
      : (ref === 'win'  ? 'W' : 'L')

  let count = 0
  for (let i = games.length - 1; i >= 0; i--) {
    const r = get(games[i])
    if (isSkip(r))  continue
    if (r === ref)  count++
    else            break
  }

  return { count, type }
}
