import type { GameOdds } from './odds-api'
// ─── Pure ingestion helpers — no Supabase imports, fully unit-testable ────────

// ─── slugify ──────────────────────────────────────────────────────────────────

// Converts a UTC ISO timestamp to the US/Eastern calendar date (YYYY-MM-DD).
// MLB games played in evening PT/CT/MT time cross midnight UTC, so
// toISOString() gives the wrong date. Eastern is the canonical MLB time zone.
export function mlbGameDate(commenceTime: string): string {
  return new Date(commenceTime).toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  })
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ─── computeOutcomes ─────────────────────────────────────────────────────────

export interface GameForOutcomes {
  home_team:  string
  away_team:  string
  home_score: number
  away_score: number
}

export interface LineForOutcomes {
  ml_home:     number | null
  ml_away:     number | null
  spread_home: number | null  // home team's spread line (negative = giving points = favorite)
  total:       number | null
}

export interface OutcomeRow {
  team_name:           string   // caller maps to team_id
  was_home:            boolean
  was_ml_favorite:     boolean
  was_spread_favorite: boolean
  own_score:           number
  opponent_score:      number
  moneyline_result:    'win' | 'loss'
  spread_result:       'win' | 'loss' | 'push' | null
  over_under_result:   'over' | 'under' | 'push' | null
}

export function computeOutcomes(
  game: GameForOutcomes,
  line: LineForOutcomes | null,
): OutcomeRow[] {
  const { home_team, away_team, home_score, away_score } = game

  // ── Moneyline ─────────────────────────────────────────────────────────────
  const homeML: 'win' | 'loss' = home_score > away_score ? 'win' : 'loss'
  const awayML: 'win' | 'loss' = away_score > home_score ? 'win' : 'loss'

  // ── Spread ────────────────────────────────────────────────────────────────
  // spread_home is the home team's line (e.g. -1.5 means home gives 1.5)
  // home covers if (home_score - away_score + spread_home) > 0
  let homeSpread: 'win' | 'loss' | 'push' | null = null
  let awaySpread: 'win' | 'loss' | 'push' | null = null
  if (line?.spread_home != null) {
    const margin = (home_score - away_score) + line.spread_home
    if (margin > 0)      { homeSpread = 'win';  awaySpread = 'loss' }
    else if (margin < 0) { homeSpread = 'loss'; awaySpread = 'win'  }
    else                 { homeSpread = 'push'; awaySpread = 'push' }
  }

  // ── Over / Under ──────────────────────────────────────────────────────────
  let ouResult: 'over' | 'under' | 'push' | null = null
  if (line?.total != null) {
    const combined = home_score + away_score
    if (combined > line.total)      ouResult = 'over'
    else if (combined < line.total) ouResult = 'under'
    else                            ouResult = 'push'
  }

  // ── ML Favorite ───────────────────────────────────────────────────────────
  // Negative price = favorite. Both negative (both favored line moves) →
  // smaller absolute value is the bigger favorite.
  let homeIsFav = false
  let awayIsFav = false
  const mh = line?.ml_home ?? null
  const ma = line?.ml_away ?? null
  if (mh !== null && ma !== null) {
    if (mh < 0 && ma >= 0) {
      homeIsFav = true
    } else if (ma < 0 && mh >= 0) {
      awayIsFav = true
    } else if (mh < 0 && ma < 0) {
      // both negative — smaller absolute value = bigger favorite
      homeIsFav = Math.abs(mh) < Math.abs(ma)
      awayIsFav = !homeIsFav
    } else {
      // both positive (rare) — higher price = bigger underdog, lower = closer to favorite
      homeIsFav = mh < ma
      awayIsFav = !homeIsFav
    }
  }

  // ── Spread Favorite ───────────────────────────────────────────────────────
  // Negative spread_home = home is giving points = home favorite
  const homeIsSpreadFav = line?.spread_home != null && line.spread_home < 0
  const awayIsSpreadFav = line?.spread_home != null && line.spread_home > 0

  return [
    {
      team_name:           home_team,
      was_home:            true,
      was_ml_favorite:     homeIsFav,
      was_spread_favorite: homeIsSpreadFav,
      own_score:           home_score,
      opponent_score:      away_score,
      moneyline_result:    homeML,
      spread_result:       homeSpread,
      over_under_result:   ouResult,
    },
    {
      team_name:           away_team,
      was_home:            false,
      was_ml_favorite:     awayIsFav,
      was_spread_favorite: awayIsSpreadFav,
      own_score:           away_score,
      opponent_score:      home_score,
      moneyline_result:    awayML,
      spread_result:       awaySpread,
      over_under_result:   ouResult,
    },
  ]
}

// ─── extractLine ─────────────────────────────────────────────────────────────
// Flattens one bookmaker's h2h/spreads/totals markets from a fetchOdds() game
// into the flat shape the lines table + computeOutcomes expect.
// Bookmaker preference: draftkings → fanduel → betmgm → first available.



export interface ExtractedLine {
  ml_home:      number | null
  ml_away:      number | null
  spread_home:  number | null
  spread_away:  number | null
  spread_juice: number | null
  total:        number | null
  over_juice:   number | null
  under_juice:  number | null
  bookmaker:    string | null
}

const BOOKMAKER_PREFERENCE = ['draftkings', 'fanduel', 'betmgm']

export function extractLine(game: GameOdds): ExtractedLine {
  const empty: ExtractedLine = {
    ml_home: null, ml_away: null,
    spread_home: null, spread_away: null, spread_juice: null,
    total: null, over_juice: null, under_juice: null,
    bookmaker: null,
  }

  if (!game.bookmakers?.length) return empty

  // Pick bookmaker by preference, else first available
  let book = game.bookmakers[0]
  for (const pref of BOOKMAKER_PREFERENCE) {
    const found = game.bookmakers.find(b => b.key === pref)
    if (found) { book = found; break }
  }

  const result: ExtractedLine = { ...empty, bookmaker: book.key }

  for (const market of book.markets ?? []) {
    if (market.key === 'h2h') {
      const home = market.outcomes.find(o => o.name === game.home_team)
      const away = market.outcomes.find(o => o.name === game.away_team)
      result.ml_home = home?.price ?? null
      result.ml_away = away?.price ?? null
    }
    else if (market.key === 'spreads') {
      const home = market.outcomes.find(o => o.name === game.home_team)
      const away = market.outcomes.find(o => o.name === game.away_team)
      result.spread_home  = home?.point ?? null
      result.spread_away  = away?.point ?? null
      result.spread_juice = home?.price ?? null
    }
    else if (market.key === 'totals') {
      const over  = market.outcomes.find(o => o.name === 'Over')
      const under = market.outcomes.find(o => o.name === 'Under')
      result.total      = over?.point ?? null
      result.over_juice  = over?.price ?? null
      result.under_juice = under?.price ?? null
    }
  }

  return result
}