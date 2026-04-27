export type League = 'AL' | 'NL'
export type Division = 'AL East' | 'AL Central' | 'AL West' | 'NL East' | 'NL Central' | 'NL West'
export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed'
export type BetResult = 'win' | 'loss' | 'push'

export interface Team {
  id: string
  name: string
  abbreviation: string
  city: string
  league: League
  division: Division
  logo_url: string | null
  created_at: string
}

export interface Game {
  id: string
  home_team_id: string
  away_team_id: string
  game_date: string
  game_time: string | null
  season: number
  status: GameStatus
  home_score: number | null
  away_score: number | null
  venue: string | null
  created_at: string
  home_team?: Team
  away_team?: Team
}

export interface Outcome {
  id: string
  game_id: string
  home_moneyline: number | null
  away_moneyline: number | null
  home_spread: number | null
  away_spread: number | null
  spread_juice: number
  over_under: number | null
  over_juice: number
  under_juice: number
  result: 'home_win' | 'away_win' | 'push' | null
  moneyline_result: BetResult | null
  spread_result: BetResult | null
  over_under_result: BetResult | null
  created_at: string
  updated_at: string
}

// Maps bet result to Tailwind color classes
export const betResultColor: Record<BetResult, string> = {
  win:  'bg-green-100 text-green-800 border-green-200',
  loss: 'bg-red-100 text-red-800 border-red-200',
  push: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

export const betResultLabel: Record<BetResult, string> = {
  win:  'W',
  loss: 'L',
  push: 'P',
}
