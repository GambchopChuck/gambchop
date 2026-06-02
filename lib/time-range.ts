import type { GameEntry } from './leagues-data'

export type TimeRange = 'last-7' | 'last-14' | 'last-30' | 'this-month' | 'this-season'

export const RANGE_OPTIONS: { value: TimeRange; label: string; promptLabel: string }[] = [
  { value: 'last-7',      label: 'Last 7 Days',  promptLabel: 'over the last 7 days'  },
  { value: 'last-14',     label: 'Last 14 Days', promptLabel: 'over the last 14 days' },
  { value: 'last-30',     label: 'Last 30 Days', promptLabel: 'over the last 30 days' },
  { value: 'this-month',  label: 'This Month',   promptLabel: 'this month'             },
  { value: 'this-season', label: 'This Season',  promptLabel: 'this season'            },
]

/** Returns ISO date strings bounding the range, or null for this-season (no filter). */
export function dateRangeFor(range: TimeRange): { from: string; to: string } | null {
  if (range === 'this-season') return null
  const today = new Date()
  const to = today.toISOString().split('T')[0]
  let from: Date
  if (range === 'last-7') {
    from = new Date(today); from.setDate(from.getDate() - 7)
  } else if (range === 'last-14') {
    from = new Date(today); from.setDate(from.getDate() - 14)
  } else if (range === 'last-30') {
    from = new Date(today); from.setDate(from.getDate() - 30)
  } else {
    from = new Date(today.getFullYear(), today.getMonth(), 1)
  }
  return { from: from.toISOString().split('T')[0], to }
}

/** Client-side filter of GameEntry[] by rolling window. */
export function filterGamesByRange(games: GameEntry[], range: TimeRange): GameEntry[] {
  const dr = dateRangeFor(range)
  if (!dr) return games
  return games.filter(g => g.rawDate >= dr.from && g.rawDate <= dr.to)
}
