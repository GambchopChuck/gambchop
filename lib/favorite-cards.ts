import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FavoriteCard {
  id:          string
  user_id:     string
  card_number: number
  card_name:   string
  created_at:  string
}

export interface FavoriteCardRow {
  id:            string
  user_id:       string
  card_id:       string
  team_name:     string
  league_name:   string | null
  bet_type:      string
  display_order: number
  in_chop:       boolean
  created_at:    string
}

export type CardSlot = { card: FavoriteCard | null; rows: FavoriteCardRow[] }

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchCards(userId: string): Promise<CardSlot[]> {
  const [{ data: cards }, { data: rows }] = await Promise.all([
    supabase.from('favorite_cards').select('*').eq('user_id', userId).order('card_number'),
    supabase.from('favorite_card_rows').select('*').eq('user_id', userId).order('display_order'),
  ])
  const cardList = (cards ?? []) as FavoriteCard[]
  const rowList  = (rows  ?? []) as FavoriteCardRow[]

  return Array.from({ length: 4 }, (_, i) => {
    const card = cardList.find(c => c.card_number === i + 1) ?? null
    return { card, rows: card ? rowList.filter(r => r.card_id === card.id) : [] }
  })
}

export async function ensureCard(userId: string, cardNumber: number): Promise<FavoriteCard | null> {
  const { data: existing } = await supabase
    .from('favorite_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('card_number', cardNumber)
    .maybeSingle()
  if (existing) return existing as FavoriteCard

  const { data, error } = await supabase
    .from('favorite_cards')
    .insert({ user_id: userId, card_number: cardNumber, card_name: 'My Favorites' })
    .select()
    .single()
  if (error) { console.error('ensureCard:', error); return null }
  return data as FavoriteCard
}

export async function updateCardName(cardId: string, name: string): Promise<boolean> {
  const { error } = await supabase
    .from('favorite_cards')
    .update({ card_name: name })
    .eq('id', cardId)
  if (error) { console.error('updateCardName:', error); return false }
  return true
}

export async function addRowToCard(
  userId: string, cardId: string,
  teamName: string, leagueName: string | null, betType: string,
): Promise<FavoriteCardRow | null> {
  const { data, error } = await supabase
    .from('favorite_card_rows')
    .insert({ user_id: userId, card_id: cardId, team_name: teamName, league_name: leagueName, bet_type: betType, in_chop: false })
    .select()
    .single()
  if (error) { console.error('addRowToCard:', error); return null }
  return data as FavoriteCardRow
}

export async function removeRowFromCard(rowId: string): Promise<boolean> {
  const { error } = await supabase.from('favorite_card_rows').delete().eq('id', rowId)
  if (error) { console.error('removeRowFromCard:', error); return false }
  return true
}

export async function setRowInChop(rowId: string, value: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('favorite_card_rows')
    .update({ in_chop: value })
    .eq('id', rowId)
  if (error) { console.error('setRowInChop:', error); return false }
  return true
}

export async function fetchAllCardRows(userId: string): Promise<FavoriteCardRow[]> {
  const { data, error } = await supabase
    .from('favorite_card_rows')
    .select('*')
    .eq('user_id', userId)
    .order('display_order')
  if (error) { console.error('fetchAllCardRows:', error); return [] }
  return (data ?? []) as FavoriteCardRow[]
}
