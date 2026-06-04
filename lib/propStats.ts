import { supabaseAdmin } from './supabase-admin'

// ─── Player prop history ──────────────────────────────────────────────────────
// Returns all result rows for a player + prop type, newest first.

export async function getPlayerPropHistory(
  playerName: string,
  propType:   string,
  limit = 20,
) {
  const { data, error } = await supabaseAdmin
    .from('player_prop_results')
    .select('game_date, prop_type, line, actual_value, result, team_name')
    .eq('player_name', playerName)
    .eq('prop_type',   propType)
    .order('game_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[propStats] getPlayerPropHistory:', error.message)
    return []
  }
  return data ?? []
}

// ─── Team stat history ────────────────────────────────────────────────────────
// Returns the requested stat column for a team, newest first.
// statType: 'hits' | 'home_runs' | 'runs' | 'strikeouts' | 'walks' | 'at_bats'

export async function getTeamStatHistory(
  teamName: string,
  statType: string,
  limit = 20,
) {
  const { data, error } = await supabaseAdmin
    .from('team_game_stats')
    .select(`game_date, ${statType}`)
    .eq('team_name', teamName)
    .order('game_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[propStats] getTeamStatHistory:', error.message)
    return []
  }
  return data ?? []
}

// ─── Today's prop lines ───────────────────────────────────────────────────────
// Returns all prop lines for today (or for a specific player).

export async function getTodayPropLines(playerName?: string) {
  const today = new Date().toISOString().slice(0, 10)

  let q = supabaseAdmin
    .from('player_prop_lines')
    .select('player_name, team_name, game_date, game_id, prop_type, line, over_odds, under_odds')
    .eq('game_date', today)
    .order('player_name', { ascending: true })

  if (playerName) q = q.eq('player_name', playerName)

  const { data, error } = await q
  if (error) {
    console.error('[propStats] getTodayPropLines:', error.message)
    return []
  }
  return data ?? []
}
