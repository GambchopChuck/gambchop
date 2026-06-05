import { supabaseAdmin } from './supabase-admin'

// ─── Player game stat history ─────────────────────────────────────────────────
// Returns raw stat rows for a player + player type, newest first.
// player_type: 'batter' | 'pitcher'
// The threshold comparison (over/under a user-set line) happens in the UI.

export async function getPlayerStatHistory(
  playerName: string,
  playerType: 'batter' | 'pitcher' = 'batter',
  league = 'MLB',
  limit = 20,
) {
  const { data, error } = await supabaseAdmin
    .from('player_game_stats')
    .select('game_date, player_type, team_name, hits, home_runs, rbis, strikeouts, walks, at_bats, innings_pitched, earned_runs')
    .eq('player_name', playerName)
    .eq('player_type', playerType)
    .eq('league', league)
    .order('game_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[propStats] getPlayerStatHistory:', error.message)
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
    .select(`game_date, home_or_away, opponent, ${statType}`)
    .eq('team_name', teamName)
    .order('game_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[propStats] getTeamStatHistory:', error.message)
    return []
  }
  return data ?? []
}
