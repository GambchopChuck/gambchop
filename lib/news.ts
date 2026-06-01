export type OutcomeCell = { result: string; date: string }

export type StreakArticle = {
  id:               string
  team_name:        string
  league:           string
  bet_type:         string
  streak_length:    number
  streak_direction: string
  headline:         string
  body:             string
  outcome_cells:    OutcomeCell[]
  generated_at:     string | null
  article_type:     string | null
  chart_svg:        string | null
}

export type NewsArticle = {
  id: string
  external_id: string | null
  headline: string
  summary: string | null
  image_url: string | null
  source: string | null
  article_url: string | null
  sport: string | null
  published_at: string | null
  fetched_at: string | null
}

export const SPORT_TAGS = ['ALL', 'MLB', 'NBA', 'NFL', 'NHL', 'WNBA', 'ATP'] as const
export type SportTag = (typeof SPORT_TAGS)[number]

export const SPORT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MLB:  { bg: '#052010', text: '#22c55e', border: '#22c55e33' },
  NBA:  { bg: '#1c0a00', text: '#f97316', border: '#f9731633' },
  NFL:  { bg: '#0e0b1f', text: '#818cf8', border: '#818cf833' },
  NHL:  { bg: '#041420', text: '#38bdf8', border: '#38bdf833' },
  WNBA: { bg: '#200210', text: '#f472b6', border: '#f472b633' },
  ATP:  { bg: '#1a1000', text: '#fbbf24', border: '#fbbf2433' },
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
