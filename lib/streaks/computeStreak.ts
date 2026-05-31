import type { GameEntry } from '@/lib/leagues-data'

export type StreakType   = 'W' | 'L' | 'P' | 'O' | 'U'
export type StreakResult = { count: number; type: StreakType }

/**
 * Canonical streak detection used by both the Streak Board UI and Chopper tools.
 * Walks backward from the most recent game, skipping nulls and pushes, and counts
 * consecutive matching results. This is the single source of truth for "active streak."
 */
export function computeStreak(
  games:  GameEntry[],
  metric: 'moneyline' | 'spread' | 'over_under',
): StreakResult | null {
  // Sort chronologically (date ASC, then time ASC within the same date) so
  // doubleheader games are ordered by start time. Walk backward from the end.
  const sorted = [...games].sort((a, b) =>
    a.rawDate !== b.rawDate
      ? a.rawDate.localeCompare(b.rawDate)
      : a.rawTime.localeCompare(b.rawTime)
  )

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
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = get(sorted[i])
    if (!isSkip(r)) { ref = r; break }
  }
  if (ref === null) return null

  const type: StreakType =
    metric === 'over_under'
      ? (ref === 'over' ? 'O' : 'U')
      : (ref === 'win'  ? 'W' : 'L')

  let count = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = get(sorted[i])
    if (isSkip(r))  continue
    if (r === ref)  count++
    else            break
  }

  return { count, type }
}
