import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BetType =
  | 'moneyline' | 'spread'
  | 'ml_favorite' | 'ml_underdog'
  | 'spread_favorite' | 'spread_dog'
  | 'home' | 'away'
  | 'over' | 'under'

export const BET_TYPE_LABELS: Record<BetType, string> = {
  moneyline:       'Moneyline',
  spread:          'Spread',
  ml_favorite:     'ML Favorite',
  ml_underdog:     'ML Underdog',
  spread_favorite: 'Spread Favorite',
  spread_dog:      'Spread Dog',
  home:            'Home',
  away:            'Away',
  over:            'Over',
  under:           'Under',
}

export const BET_TYPE_ACCENTS: Record<BetType, string> = {
  moneyline:       '#22c55e',
  spread:          '#22c55e',
  ml_favorite:     '#eab308',
  ml_underdog:     '#f97316',
  spread_favorite: '#2563eb',
  spread_dog:      '#9333ea',
  home:            '#14b8a6',
  away:            '#94a3b8',
  over:            '#8b5cf6',
  under:           '#b45309',
}

export interface Favorite {
  id:            string
  user_id:       string
  team_name:     string
  league_id:     string
  league_name:   string
  bet_type:      BetType
  display_order: number
  created_at:    string
}

export type FavResult =
  | { data: Favorite; error: null }
  | { data: null;     error: string }

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchFavorites(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true })

  if (error) { console.error('fetchFavorites:', error); return [] }
  return (data ?? []) as Favorite[]
}

export async function addFavorite(
  userId: string,
  payload: Pick<Favorite, 'team_name' | 'league_id' | 'league_name' | 'bet_type'>,
  displayOrder: number,
): Promise<FavResult> {
  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, ...payload, display_order: displayOrder })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Already in favorites' }
    const msg = (error.message ?? '').toLowerCase()
    if (msg.includes('16') || msg.includes('maximum') || msg.includes('limit') || msg.includes('cap')) {
      return { data: null, error: "You've reached your 16-favorite limit" }
    }
    console.error('addFavorite:', error)
    return { data: null, error: 'Failed to add favorite' }
  }
  return { data: data as Favorite, error: null }
}

export async function removeFavorite(id: string): Promise<boolean> {
  const { error } = await supabase.from('favorites').delete().eq('id', id)
  if (error) { console.error('removeFavorite:', error); return false }
  return true
}

export async function reorderFavorites(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('favorites').update({ display_order: i }).eq('id', id),
    ),
  )
}
