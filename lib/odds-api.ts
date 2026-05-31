// ─── The Odds API — thin client ───────────────────────────────────────────────
// Docs: https://the-odds-api.com/liveapi/guides/v4/

const BASE = 'https://api.the-odds-api.com'

function apiKey(): string {
  const k = process.env.THE_ODDS_API_KEY
  if (!k) throw new Error('THE_ODDS_API_KEY env var is not set')
  return k
}

// ─── Shared response wrapper ──────────────────────────────────────────────────

export interface OddsApiResponse<T> {
  data:              T
  remainingRequests: number
  usedRequests:      number
}

async function oddsApiFetch<T>(path: string): Promise<OddsApiResponse<T>> {
  const url = `${BASE}${path}`
  console.log('[odds-api] GET', url.replace(/apiKey=[^&]+/, 'apiKey=***'))

  const res = await fetch(url, { cache: 'no-store' })

  if (res.status === 401) throw new Error('Odds API: invalid API key (401)')
  if (res.status === 422) throw new Error('Odds API: unprocessable request (422) — check sport key or params')
  if (res.status === 429) throw new Error('Odds API: rate limited (429) — quota exhausted')
  if (!res.ok)            throw new Error(`Odds API: unexpected HTTP ${res.status}`)

  const data = await res.json() as T
  const remaining = parseInt(res.headers.get('x-requests-remaining') ?? '-1', 10)
  const used      = parseInt(res.headers.get('x-requests-used')      ?? '-1', 10)

  console.log(`[odds-api] quota: remaining=${remaining} used=${used}`)
  return { data, remainingRequests: remaining, usedRequests: used }
}

// ─── /v4/sports ───────────────────────────────────────────────────────────────

export interface Sport {
  key:           string
  group:         string
  title:         string
  description:   string
  active:        boolean
  has_outrights: boolean
}

export function fetchSports(): Promise<OddsApiResponse<Sport[]>> {
  return oddsApiFetch<Sport[]>(`/v4/sports?apiKey=${apiKey()}`)
}

// ─── /v4/sports/{sport}/scores ────────────────────────────────────────────────

export interface ScoreEntry {
  name:  string
  score: string
}

export interface GameScore {
  id:            string
  sport_key:     string
  sport_title:   string
  commence_time: string
  completed:     boolean
  home_team:     string
  away_team:     string
  scores:        ScoreEntry[] | null
  last_update:   string | null
}

export function fetchScores(
  sport:    string,
  daysFrom: number = 3,
): Promise<OddsApiResponse<GameScore[]>> {
  return oddsApiFetch<GameScore[]>(
    `/v4/sports/${sport}/scores?daysFrom=${daysFrom}&apiKey=${apiKey()}`,
  )
}

// ─── /v4/sports/{sport}/odds ──────────────────────────────────────────────────

export interface OddsOutcome {
  name:   string
  price:  number
  point?: number
}

export interface Market {
  key:         string
  last_update: string
  outcomes:    OddsOutcome[]
}

export interface Bookmaker {
  key:         string
  title:       string
  last_update: string
  markets:     Market[]
}

export interface GameOdds {
  id:            string
  sport_key:     string
  home_team:     string
  away_team:     string
  commence_time: string
  bookmakers:    Bookmaker[]
}

export function fetchOdds(
  sport:   string,
  regions: string = 'us',
  markets: string = 'h2h,spreads,totals',
): Promise<OddsApiResponse<GameOdds[]>> {
  return oddsApiFetch<GameOdds[]>(
    `/v4/sports/${sport}/odds?regions=${regions}&markets=${markets}&oddsFormat=american&eventStatus=upcoming&apiKey=${apiKey()}`,
  )
}

// ─── MLB Stats API (free, no key, full history) ────────────────────────────────
// Used for historical scores beyond the 3-day Odds API window.
// Endpoint: https://statsapi.mlb.com/api/v1/schedule
// Returns GameScore[] normalized to the same shape as fetchScores() so the
// caller (backfill route) can treat both sources identically.
// external_id = gamePk.toString() — a different namespace from Odds API UUIDs,
// but the two windows (days 1–3 via Odds API, days 4–14 via MLB Stats) don't
// overlap so there are no duplicate game rows.

const MLB_STATS_BASE = 'https://statsapi.mlb.com'

interface MLBStatsResponse {
  dates: Array<{
    date: string
    games: Array<{
      gamePk:       number
      gameDate:     string   // ISO 8601 timestamp, e.g. "2026-05-01T20:10:00Z"
      officialDate: string   // YYYY-MM-DD
      status:       { detailedState: string }
      teams: {
        home: { score: number; team: { name: string } }
        away: { score: number; team: { name: string } }
      }
    }>
  }>
}

export async function fetchMLBStatsScores(
  startDate: string,   // YYYY-MM-DD
  endDate:   string,   // YYYY-MM-DD
): Promise<GameScore[]> {
  const url =
    `${MLB_STATS_BASE}/api/v1/schedule` +
    `?sportId=1&startDate=${startDate}&endDate=${endDate}&gameType=R&hydrate=linescore`
  console.log('[mlb-stats] GET', url)

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`MLB Stats API: HTTP ${res.status}`)

  const body = await res.json() as MLBStatsResponse
  const games: GameScore[] = []

  for (const dateGroup of body.dates ?? []) {
    const dayGames: GameScore[] = []
    for (const g of dateGroup.games ?? []) {
      if (g.status.detailedState !== 'Final') continue
      const homeScore = g.teams.home.score
      const awayScore = g.teams.away.score
      if (homeScore == null || awayScore == null) continue
      const homeTeam = g.teams.home.team.name
      const awayTeam = g.teams.away.team.name
      dayGames.push({
        id:            g.gamePk.toString(),
        sport_key:     'baseball_mlb',
        sport_title:   'MLB',
        commence_time: g.gameDate,
        completed:     true,
        home_team:     homeTeam,
        away_team:     awayTeam,
        scores: [
          { name: homeTeam, score: homeScore.toString() },
          { name: awayTeam, score: awayScore.toString() },
        ],
        last_update: null,
      })
    }
    console.log(`[mlb-stats] ${dateGroup.date}: ${dayGames.length} final games`)
    games.push(...dayGames)
  }

  console.log(`[mlb-stats] total: ${games.length} final games for ${startDate} → ${endDate}`)
  return games
}
