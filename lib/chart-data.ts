import { supabase } from './supabase'
import type { GameEntry, TeamChartData, BetResult } from './leagues-data'

// ─── Date / rest-day helpers ──────────────────────────────────────────────────

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

// ─── League UUID cache (per module lifetime, refreshes on hard-reload) ────────

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
    date:             fmtDate(gameDate),
    opponent:         o.was_home ? opponentName : `@${opponentName}`,
    isHome:           o.was_home,
    isFavorite:       o.was_ml_favorite,
    isSpreadFavorite: o.was_spread_favorite,
    isDivisionGame:   false,
    restDays:         0,      // filled in by withRestDays after sorting
    moneylineResult:  (o.moneyline_result  as BetResult) ?? null,
    spreadResult:     (o.spread_result     as BetResult) ?? null,
    ouResult:         (o.over_under_result as GameEntry['ouResult']) ?? null,
  }
}

function withRestDays(entries: GameEntry[], rawDates: string[]): GameEntry[] {
  // Both arrays are oldest-first after the caller reverses them
  return entries.map((e, i) => ({
    ...e,
    restDays: i === 0 ? 0 : restDaysBetween(rawDates[i - 1], rawDates[i]),
  }))
}

// ─── Core batched query (shared by both exports) ──────────────────────────────
//
// Fetches ALL final games for a league in a single round-trip.
// Each game row contains an `outcomes` array (2 entries: one per team) with
// embedded team info. The opponent name is resolved from the sibling outcome,
// avoiding a separate home_team / away_team FK join entirely.

async function fetchLeagueGameRows(leagueId: string): Promise<RawGameRow[]> {
  const { data, error } = await supabase
    .from('games')
    .select(`
      game_date,
      outcomes:team_game_outcomes(
        team_id,
        was_home, was_ml_favorite, was_spread_favorite,
        own_score, opponent_score,
        moneyline_result, spread_result, over_under_result,
        team:teams!team_id(id, name, slug)
      )
    `)
    .eq('league_id', leagueId)
    .eq('status', 'final')
    .order('game_date', { ascending: false })

  if (error) {
    console.error('[chart-data] fetchLeagueGameRows:', error.message)
    return []
  }
  return (data as unknown as RawGameRow[]) ?? []
}

// ─── fetchLeagueOutcomes ──────────────────────────────────────────────────────
// One batched query → groups into TeamChartData[] for the league page.
// With 30 teams × 10 games the result set is ~600 rows max.

export async function fetchLeagueOutcomes(
  leagueSlug: string,
  limit = 10,
): Promise<TeamChartData[]> {
  try {
    const leagueId = await resolveLeagueId(leagueSlug)
    if (!leagueId) return []

    const rows = await fetchLeagueGameRows(leagueId)
    if (!rows.length) return []

    type Accum = { name: string; slug: string; pairs: Array<{ entry: GameEntry; date: string }> }
    const teamMap = new Map<string, Accum>()

    for (const row of rows) {
      for (const outcome of row.outcomes ?? []) {
        const t = outcome.team
        if (!t) continue

        if (!teamMap.has(t.slug)) {
          teamMap.set(t.slug, { name: t.name, slug: t.slug, pairs: [] })
        }

        // Collect ALL outcomes — no early limit cutoff.
        // Doubleheaders produce two rows with the same game_date; cutting mid-group
        // is non-deterministic because row.outcomes order isn't guaranteed.
        const other = row.outcomes.find(o => o.team_id !== outcome.team_id)
        const opponentName = other?.team?.name ?? 'OPP'

        teamMap.get(t.slug)!.pairs.push({
          entry: outcomeToEntry(outcome, opponentName, row.game_date),
          date:  row.game_date,
        })
      }
    }

    return Array.from(teamMap.values()).map(({ name, pairs }) => {
      // Sort DESC (most recent first), take the N most recent, then reverse to oldest-first.
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

// ─── fetchTeamOutcomes ────────────────────────────────────────────────────────
// Uses the same batched query as fetchLeagueOutcomes but filters to one team.
// At current scale (~185 games) this is negligible; when seasons grow we can
// switch to a team-scoped query via team_id.

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

    const pairs: Array<{ entry: GameEntry; date: string }> = []

    for (const row of rows) {
      const mine = row.outcomes.find(o => o.team?.slug === teamSlug)
      if (!mine) continue

      const other = row.outcomes.find(o => o.team_id !== mine.team_id)
      const opponentName = other?.team?.name ?? 'OPP'

      // Collect ALL — sort + slice after, same as fetchLeagueOutcomes.
      pairs.push({
        entry: outcomeToEntry(mine, opponentName, row.game_date),
        date:  row.game_date,
      })
    }

    // Sort DESC, take N most recent, reverse to oldest-first.
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

// ─── computeStreak ────────────────────────────────────────────────────────────
// games is oldest-first: games[0] = oldest, games[games.length-1] = most recent.
// Both passes walk newest → oldest so we always read the present first.

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

  // Null (unplayed/missing) and pushes are both transparent — skipped, not streak-terminating.
  const isSkip = (r: string | null): boolean => {
    if (r === null) return true
    return metric === 'over_under'
      ? r !== 'over' && r !== 'under'
      : r !== 'win'  && r !== 'loss'
  }

  // Pass 1 — newest → oldest: find the most-recent decisive result.
  // This defines the streak type (W / L / O / U).
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

  // Pass 2 — newest → oldest: count consecutive games that match ref.
  // Example: [W,W,L,W,W,W,L,W,L,L] → ref='loss', i=9→L(1), i=8→L(2), i=7→W(break) → L2
  let count = 0
  for (let i = games.length - 1; i >= 0; i--) {
    const r = get(games[i])
    if (isSkip(r)) continue    // push or missing — transparent
    if (r === ref) count++
    else           break       // different result — streak over
  }

  return { count, type }
}
