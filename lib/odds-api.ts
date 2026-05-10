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
    `/v4/sports/${sport}/odds?regions=${regions}&markets=${markets}&apiKey=${apiKey()}`,
  )
}
