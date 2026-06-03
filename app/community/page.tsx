import { createClient } from '@supabase/supabase-js'
import { fetchTeamOutcomes } from '@/lib/chart-data'
import { buildSvg } from '@/lib/svgChart'
import type { GameEntry } from '@/lib/leagues-data'
import CommunityClient from './CommunityClient'

// ─── Types shared with CommunityClient ───────────────────────────────────────

export interface TopFavorite {
  team_name:      string
  league_name:    string
  bet_type:       string
  favorite_count: number
}

export interface FanFavorite {
  team_name:   string
  league_name: string
  bet_type:    string
  today_count: number
  chart_svg:   string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function resultForBetType(game: GameEntry, betType: string): string | null {
  if (betType === 'over_under') return game.ouResult
  if (betType === 'spread' || betType === 'spread_favorite' || betType === 'spread_dog')
    return game.spreadResult
  return game.moneylineResult
}

// ─── Server-side data fetches ─────────────────────────────────────────────────

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

    const counts = new Map<string, TopFavorite>()
    for (const row of data as { team_name: string; league_name: string; bet_type: string }[]) {
      const key = `${row.team_name}|||${row.league_name}|||${row.bet_type}`
      const existing = counts.get(key)
      if (existing) {
        existing.favorite_count++
      } else {
        counts.set(key, { team_name: row.team_name, league_name: row.league_name, bet_type: row.bet_type, favorite_count: 1 })
      }
    }

    return Array.from(counts.values())
      .sort((a, b) => b.favorite_count - a.favorite_count)
      .slice(0, 4)
  } catch {
    return []
  }
}

async function fetchFanFavorite(): Promise<FanFavorite | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Today midnight UTC
    const todayUtc = new Date()
    todayUtc.setUTCHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('favorites')
      .select('team_name, league_name, bet_type, created_at')
      .gte('created_at', todayUtc.toISOString())

    if (error || !data || data.length === 0) return null

    type Row = { team_name: string; league_name: string; bet_type: string; created_at: string }

    // Aggregate: count + track earliest created_at per group (tie-breaking)
    const groups = new Map<string, { count: number; earliest: string; row: Row }>()
    for (const row of data as Row[]) {
      const key = `${row.team_name}|||${row.bet_type}`
      const existing = groups.get(key)
      if (existing) {
        existing.count++
        if (row.created_at < existing.earliest) existing.earliest = row.created_at
      } else {
        groups.set(key, { count: 1, earliest: row.created_at, row })
      }
    }

    // Winner: highest count; ties broken by earliest created_at
    let winner: { count: number; earliest: string; row: Row } | null = null
    for (const g of groups.values()) {
      if (
        !winner ||
        g.count > winner.count ||
        (g.count === winner.count && g.earliest < winner.earliest)
      ) {
        winner = g
      }
    }

    if (!winner) return null

    // Fetch last 10 game outcomes for this team to build the chart strip
    const leagueSlug = toSlug(winner.row.league_name)
    const teamSlug   = toSlug(winner.row.team_name)
    const games      = await fetchTeamOutcomes(leagueSlug, teamSlug, 10)

    const cells = games
      .map(g => {
        const result = resultForBetType(g, winner!.row.bet_type)
        if (!result || result === 'push') return null
        return { result, date: g.date }
      })
      .filter((c): c is { result: string; date: string } => c !== null)

    return {
      team_name:   winner.row.team_name,
      league_name: winner.row.league_name,
      bet_type:    winner.row.bet_type,
      today_count: winner.count,
      chart_svg:   buildSvg(cells),
    }
  } catch {
    return null
  }
}

// ─── Page (server component) ──────────────────────────────────────────────────

export default async function CommunityPage() {
  const [topFavorites, fanFavorite] = await Promise.all([
    fetchTopFavorites(),
    fetchFanFavorite(),
  ])
  return <CommunityClient topFavorites={topFavorites} fanFavorite={fanFavorite} />
}
