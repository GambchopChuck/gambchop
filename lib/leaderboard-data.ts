import { supabase } from './supabase'
import type { BetResult, GameEntry } from './leagues-data'
import { dateRangeFor } from './time-range'
import type { TimeRange } from './time-range'
import type { LeaderboardCategory, LeaderboardRow, Outcome } from './mockLeaderboard'
import { computeStreak } from './streaks/computeStreak'

// ─── Team color map (by slug) ─────────────────────────────────────────────────

const TEAM_COLORS: Record<string, string> = {
  'arizona-diamondbacks': '#A71930',
  'atlanta-braves':        '#CE1141',
  'baltimore-orioles':     '#DF4601',
  'boston-red-sox':        '#BD3039',
  'chicago-cubs':          '#0E3386',
  'chicago-white-sox':     '#27251F',
  'cincinnati-reds':       '#C6011F',
  'cleveland-guardians':   '#00385D',
  'colorado-rockies':      '#33006F',
  'detroit-tigers':        '#0C2340',
  'houston-astros':        '#002D62',
  'kansas-city-royals':    '#004687',
  'los-angeles-angels':    '#BA0021',
  'los-angeles-dodgers':   '#005A9C',
  'miami-marlins':         '#00A3E0',
  'milwaukee-brewers':     '#FFC52F',
  'minnesota-twins':       '#002B5C',
  'new-york-mets':         '#FF5910',
  'new-york-yankees':      '#003087',
  'oakland-athletics':     '#003831',
  'philadelphia-phillies': '#E81828',
  'pittsburgh-pirates':    '#FDB827',
  'san-diego-padres':      '#2F241D',
  'san-francisco-giants':  '#FD5A1E',
  'seattle-mariners':      '#0C2C56',
  'st-louis-cardinals':    '#C41E3A',
  'tampa-bay-rays':        '#092C5C',
  'texas-rangers':         '#003278',
  'toronto-blue-jays':     '#134A8E',
  'washington-nationals':  '#AB0003',
}
const DEFAULT_TEAM_COLOR = '#334155'

// ─── Public types ──────────────────────────────────────────────────────────────

export interface TeamSummary {
  teamName:     string
  teamSlug:     string
  teamColor:    string
  totalGames:   number
  mlWins:       number
  mlLosses:     number
  spreadWins:   number
  spreadLosses: number
  overs:        number
  unders:       number
  pushes:       number   // moneyline pushes
  homeWins:     number
  awayWins:     number
  games:        GameEntry[]   // sorted oldest-first; used for streak calc
}

export interface LeagueStats {
  totalGames:         number   // unique game matchups in range
  avgWinRate:         number   // 0–1, for active category
  mostWinsTeam:       string
  mostWinsCount:      number
  longestStreakTeam:  string
  longestStreakLabel: string   // e.g. "W5" or "O3"
}

// ─── DB row types ──────────────────────────────────────────────────────────────

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
  game_time: string
  outcomes:  RawOutcome[]
}

const OUTCOME_SELECT = `
  game_date,
  game_time,
  outcomes:team_game_outcomes(
    team_id,
    was_home, was_ml_favorite, was_spread_favorite,
    own_score, opponent_score,
    moneyline_result, spread_result, over_under_result,
    team:teams!team_id(id, name, slug)
  )
`

// ─── League UUID cache ─────────────────────────────────────────────────────────

const leagueIdCache = new Map<string, string>()

async function resolveLeagueId(slug: string): Promise<string | null> {
  if (leagueIdCache.has(slug)) return leagueIdCache.get(slug)!
  const { data } = await supabase.from('leagues').select('id').eq('slug', slug).single()
  if (!data?.id) return null
  leagueIdCache.set(slug, data.id as string)
  return data.id as string
}

// ─── Supabase fetch ────────────────────────────────────────────────────────────

async function fetchLeagueRows(leagueId: string, range: TimeRange): Promise<RawGameRow[]> {
  const dr = dateRangeFor(range)

  let q = supabase
    .from('games')
    .select(OUTCOME_SELECT)
    .eq('league_id', leagueId)
    .eq('status', 'final')
    .order('game_date', { ascending: true })
    .limit(10000)

  if (dr) {
    q = q.gte('game_date', dr.from).lte('game_date', dr.to)
  }

  const { data, error } = await q
  if (error) {
    console.error('[leaderboard-data] fetchLeagueRows:', error.message)
    return []
  }
  return (data as unknown as RawGameRow[]) ?? []
}

// ─── Rows → per-team summaries ────────────────────────────────────────────────

function rowsToTeamSummaries(rows: RawGameRow[]): TeamSummary[] {
  const map = new Map<string, TeamSummary>()

  for (const row of rows) {
    for (const o of row.outcomes ?? []) {
      const t = o.team
      if (!t) continue

      if (!map.has(t.slug)) {
        map.set(t.slug, {
          teamName:     t.name,
          teamSlug:     t.slug,
          teamColor:    TEAM_COLORS[t.slug] ?? DEFAULT_TEAM_COLOR,
          totalGames:   0,
          mlWins:       0,
          mlLosses:     0,
          spreadWins:   0,
          spreadLosses: 0,
          overs:        0,
          unders:       0,
          pushes:       0,
          homeWins:     0,
          awayWins:     0,
          games:        [],
        })
      }

      const s = map.get(t.slug)!
      const opponentName =
        row.outcomes.find(x => x.team_id !== o.team_id)?.team?.name ?? 'OPP'

      const entry: GameEntry = {
        rawDate:          row.game_date,
        rawTime:          row.game_time,
        date:             row.game_date.slice(5).replace('-', '/'),
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

      s.totalGames++
      if (o.moneyline_result === 'win')    s.mlWins++
      if (o.moneyline_result === 'loss')   s.mlLosses++
      if (o.moneyline_result === 'push')   s.pushes++
      if (o.spread_result    === 'win')    s.spreadWins++
      if (o.spread_result    === 'loss')   s.spreadLosses++
      if (o.over_under_result === 'over')  s.overs++
      if (o.over_under_result === 'under') s.unders++
      if (o.moneyline_result === 'win' &&  o.was_home) s.homeWins++
      if (o.moneyline_result === 'win' && !o.was_home) s.awayWins++

      s.games.push(entry)
    }
  }

  return Array.from(map.values())
}

// ─── Outcome array builders (for chart strips) ─────────────────────────────────

function mlOutcomes(s: TeamSummary): Outcome[] {
  return s.games.slice(-28).map(g => {
    if (!g.moneylineResult) return 'none'
    if (g.moneylineResult === 'push') return 'push'
    return g.moneylineResult  // 'win' | 'loss'
  })
}

function spreadOutcomes(s: TeamSummary): Outcome[] {
  return s.games.slice(-28).map(g => {
    if (!g.spreadResult) return 'none'
    if (g.spreadResult === 'push') return 'push'
    return g.spreadResult
  })
}

function ouOutcomes(s: TeamSummary): Outcome[] {
  return s.games.slice(-28).map(g => {
    if (!g.ouResult) return 'none'
    if (g.ouResult === 'push') return 'push'
    return g.ouResult  // 'over' | 'under'
  })
}

function homeOutcomes(s: TeamSummary): Outcome[] {
  return s.games.slice(-28).map(g => {
    if (!g.isHome) return 'none'
    if (!g.moneylineResult || g.moneylineResult === 'push') return 'push'
    return g.moneylineResult
  })
}

function awayOutcomes(s: TeamSummary): Outcome[] {
  return s.games.slice(-28).map(g => {
    if (g.isHome) return 'none'
    if (!g.moneylineResult || g.moneylineResult === 'push') return 'push'
    return g.moneylineResult
  })
}

function pushOutcomes(s: TeamSummary): Outcome[] {
  return s.games.slice(-28).map(g => {
    const mlP = g.moneylineResult === 'push'
    const spP = g.spreadResult    === 'push'
    if (mlP || spP) return 'push'
    if (g.moneylineResult === 'win')  return 'win'
    if (g.moneylineResult === 'loss') return 'loss'
    return 'none'
  })
}

// ─── Category spec table ──────────────────────────────────────────────────────

interface CategorySpec {
  id:          string
  label:       string
  countUnit:   string
  getValue:    (s: TeamSummary) => number
  getOutcomes: (s: TeamSummary) => Outcome[]
  streakMetric: 'moneyline' | 'spread' | 'over_under'
}

const CATEGORY_SPECS: CategorySpec[] = [
  { id: 'most-overs',      label: 'Most Overs',      countUnit: 'OVERS',      getValue: s => s.overs,        getOutcomes: ouOutcomes,     streakMetric: 'over_under' },
  { id: 'most-unders',     label: 'Most Unders',     countUnit: 'UNDERS',     getValue: s => s.unders,       getOutcomes: ouOutcomes,     streakMetric: 'over_under' },
  { id: 'most-ml-wins',    label: 'Most ML Wins',    countUnit: 'ML WINS',    getValue: s => s.mlWins,       getOutcomes: mlOutcomes,     streakMetric: 'moneyline'  },
  { id: 'most-ml-losses',  label: 'Most ML Losses',  countUnit: 'ML LOSSES',  getValue: s => s.mlLosses,     getOutcomes: mlOutcomes,     streakMetric: 'moneyline'  },
  { id: 'most-ats-covers', label: 'Most ATS Covers', countUnit: 'COVERS',     getValue: s => s.spreadWins,   getOutcomes: spreadOutcomes, streakMetric: 'spread'     },
  { id: 'most-ats-losses', label: 'Most ATS Losses', countUnit: 'ATS LOSSES', getValue: s => s.spreadLosses, getOutcomes: spreadOutcomes, streakMetric: 'spread'     },
  { id: 'most-pushes',     label: 'Most Pushes',     countUnit: 'PUSHES',     getValue: s => s.pushes,       getOutcomes: pushOutcomes,   streakMetric: 'moneyline'  },
  { id: 'most-home-wins',  label: 'Most Home Wins',  countUnit: 'HOME WINS',  getValue: s => s.homeWins,     getOutcomes: homeOutcomes,   streakMetric: 'moneyline'  },
  { id: 'most-away-wins',  label: 'Most Away Wins',  countUnit: 'AWAY WINS',  getValue: s => s.awayWins,     getOutcomes: awayOutcomes,   streakMetric: 'moneyline'  },
]

export const LEADERBOARD_CATEGORY_IDS = CATEGORY_SPECS.map(s => s.id)

// ─── Build a ranked LeaderboardCategory from team data ────────────────────────

function buildCategory(spec: CategorySpec, teams: TeamSummary[], maxGames: number): LeaderboardCategory {
  const sorted = [...teams].sort((a, b) => spec.getValue(b) - spec.getValue(a))

  const rows: LeaderboardRow[] = sorted.map((t, _i, arr) => {
    const count = spec.getValue(t)
    const firstIdx = arr.findIndex(s => spec.getValue(s) === count)
    return {
      rank:       firstIdx + 1,
      team:       t.teamName,
      teamColor:  t.teamColor,
      count,
      totalGames: t.totalGames,
      outcomes:   spec.getOutcomes(t),
    }
  })

  return {
    id:        spec.id,
    label:     spec.label,
    countUnit: spec.countUnit,
    metaUnit:  maxGames > 0 ? `OUT OF ${maxGames} GAMES` : '',
    rows,
  }
}

// ─── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchLeaderboardData(range: TimeRange): Promise<{
  categories:  LeaderboardCategory[]
  teamStats:   TeamSummary[]
  totalGames:  number
}> {
  const leagueId = await resolveLeagueId('mlb')
  if (!leagueId) return { categories: [], teamStats: [], totalGames: 0 }

  const rows = await fetchLeagueRows(leagueId, range)
  if (!rows.length) return { categories: [], teamStats: [], totalGames: 0 }

  const teamStats  = rowsToTeamSummaries(rows)
  const maxGames   = Math.max(...teamStats.map(t => t.totalGames), 0)
  const categories = CATEGORY_SPECS.map(spec => buildCategory(spec, teamStats, maxGames))

  return { categories, teamStats, totalGames: rows.length }
}

// ─── League-wide stats (recomputed client-side when category changes) ──────────

export function computeLeagueStats(
  teamStats:   TeamSummary[],
  categoryId:  string,
  totalGames:  number,
): LeagueStats {
  const spec = CATEGORY_SPECS.find(s => s.id === categoryId)
  if (!spec || !teamStats.length) {
    return {
      totalGames:         0,
      avgWinRate:         0,
      mostWinsTeam:       '—',
      mostWinsCount:      0,
      longestStreakTeam:  '—',
      longestStreakLabel: '—',
    }
  }

  const withGames  = teamStats.filter(t => t.totalGames > 0)
  const winRates   = withGames.map(t => spec.getValue(t) / t.totalGames)
  const avgWinRate = winRates.length
    ? winRates.reduce((a, b) => a + b, 0) / winRates.length
    : 0

  const sorted        = [...teamStats].sort((a, b) => spec.getValue(b) - spec.getValue(a))
  const mostWinsTeam  = sorted[0]?.teamName ?? '—'
  const mostWinsCount = sorted[0] ? spec.getValue(sorted[0]) : 0

  let longestStreakTeam  = '—'
  let longestStreakLabel = '—'
  let longestCount       = 0

  for (const t of teamStats) {
    if (!t.games.length) continue
    const streak = computeStreak(t.games, spec.streakMetric)
    if (streak && streak.count > longestCount) {
      longestCount       = streak.count
      longestStreakTeam  = t.teamName.split(' ').slice(-1)[0] ?? t.teamName
      longestStreakLabel = `${streak.type}${streak.count}`
    }
  }

  return {
    totalGames,
    avgWinRate,
    mostWinsTeam,
    mostWinsCount,
    longestStreakTeam,
    longestStreakLabel,
  }
}
