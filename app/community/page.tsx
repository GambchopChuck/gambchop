import { createClient } from '@supabase/supabase-js'
import CommunityClient from './CommunityClient'

// ─── Type shared with CommunityClient ────────────────────────────────────────

export interface TopFavorite {
  team_name:      string
  league_name:    string
  bet_type:       string
  favorite_count: number
}

// ─── Server-side data fetch ───────────────────────────────────────────────────

async function fetchTopFavorites(): Promise<TopFavorite[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data, error } = await supabase
      .from('favorites')
      .select('team_name, league_name, bet_type')

    if (error || !data) return []

    // Aggregate by team_name + league_name + bet_type in JS
    const counts = new Map<string, TopFavorite>()
    for (const row of data as { team_name: string; league_name: string; bet_type: string }[]) {
      const key = `${row.team_name}|||${row.league_name}|||${row.bet_type}`
      const existing = counts.get(key)
      if (existing) {
        existing.favorite_count++
      } else {
        counts.set(key, {
          team_name:      row.team_name,
          league_name:    row.league_name,
          bet_type:       row.bet_type,
          favorite_count: 1,
        })
      }
    }

    return Array.from(counts.values())
      .sort((a, b) => b.favorite_count - a.favorite_count)
      .slice(0, 4)
  } catch {
    return []
  }
}

// ─── Page (server component) ──────────────────────────────────────────────────

export default async function CommunityPage() {
  const topFavorites = await fetchTopFavorites()
  return <CommunityClient topFavorites={topFavorites} />
}
