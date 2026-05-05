import { supabase } from '@/lib/supabase'
import { LEAGUE_MAP, LEAGUES } from '@/lib/leagues-data'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BetType      = 'moneyline' | 'spread' | 'over' | 'under'
export type ItemOutcome  = 'pending' | 'win' | 'loss' | 'push' | 'over' | 'under'
export type GroupStatus  = 'active' | 'complete'

export interface UpcomingEvent {
  id:          string
  leagueId:    string
  leagueName:  string
  homeTeam:    string
  awayTeam:    string
  displayDate: string
  isoDate:     string
  homeOdds:    number
  awayOdds:    number
  spread:      number   // negative = home is favored
  total:       number
}

export interface FavoriteItem {
  id:                 string
  favorite_group_id:  string
  team_name:          string
  league_id:          string
  league_name:        string
  event_id:           string
  event_date:         string
  opponent:           string
  bet_type:           BetType
  outcome:            ItemOutcome
  created_at:         string
}

export interface FavoriteGroup {
  id:         string
  user_id:    string
  name:       string
  status:     GroupStatus
  items:      FavoriteItem[]
  created_at: string
  updated_at: string
}

// ─── User Identity ────────────────────────────────────────────────────────────

export function getUserId(authId?: string | null): string {
  if (typeof window === 'undefined') return authId ?? ''
  // Supabase auth UUID takes precedence — write it back so it persists across sessions
  if (authId) {
    localStorage.setItem('gambchop-user-id', authId)
    return authId
  }
  // Migrate from old key if present
  const legacy = localStorage.getItem('gambchop-parlay-uid')
  if (legacy) {
    localStorage.setItem('gambchop-user-id', legacy)
    localStorage.removeItem('gambchop-parlay-uid')
    return legacy
  }
  let uid = localStorage.getItem('gambchop-user-id')
  if (!uid) {
    uid = 'usr_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('gambchop-user-id', uid)
  }
  return uid
}

// ─── Mock Upcoming Events ─────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function seeded(seed: number, idx: number): number {
  const x = Math.sin(seed + idx) * 10000
  return x - Math.floor(x)
}

function getTotalRange(leagueId: string): [number, number] {
  const r: Record<string, [number, number]> = {
    mlb:    [7.5,  10.5],
    nfl:    [41.5, 55.5],
    nba:    [210.5, 240.5],
    nhl:    [5.5,  7.5],
    ncaaf:  [45.5, 65.5],
    ncaab:  [130,  160],
    ncaawb: [120,  155],
    wnba:   [155,  175],
    atp:    [21.5, 28.5],
    wta:    [21.5, 28.5],
    ncaabl: [8.5,  13.5],
  }
  return r[leagueId] ?? [40, 60]
}

function getSpreadRange(leagueId: string): [number, number] {
  if (leagueId === 'mlb' || leagueId === 'nhl') return [1.5, 1.5]
  const r: Record<string, [number, number]> = {
    nfl:    [1.5, 14.5],
    nba:    [1.5, 12.5],
    ncaaf:  [3.5, 21.5],
    ncaab:  [2.5, 15.5],
    ncaawb: [2.5, 12.5],
    wnba:   [2.5, 10.5],
    atp:    [1.5, 4.5],
    wta:    [1.5, 4.5],
  }
  return r[leagueId] ?? [2.5, 10.5]
}

export function getSpreadLabel(leagueId: string): string {
  if (leagueId === 'mlb')                          return 'Run Line'
  if (leagueId === 'nhl')                          return 'Puck Line'
  if (leagueId === 'atp' || leagueId === 'wta')    return 'Game Spread'
  return 'Spread'
}

const ITEMS_PER_DAY: Record<string, number> = {
  mlb: 3, nba: 2, nhl: 2, ncaab: 3, ncaawb: 3, wnba: 2,
}

export function generateUpcomingEvents(leagueId: string): UpcomingEvent[] {
  const league = LEAGUE_MAP[leagueId]
  if (!league) return []

  const teams = league.entities
  const today = new Date()
  const events: UpcomingEvent[] = []
  const [tMin, tMax] = getTotalRange(leagueId)
  const [sMin, sMax] = getSpreadRange(leagueId)
  const itemsPerDay  = ITEMS_PER_DAY[leagueId] ?? 1

  for (let day = 1; day <= 7; day++) {
    const date = new Date(today)
    date.setDate(date.getDate() + day)
    const dateKey = date.toISOString().slice(0, 10)

    for (let g = 0; g < itemsPerDay; g++) {
      const seed = hashStr(`${leagueId}-${dateKey}-${g}`)

      const homeIdx = seed % teams.length
      let awayIdx   = Math.floor(seeded(seed, 1) * teams.length)
      if (awayIdx === homeIdx) awayIdx = (awayIdx + 1) % teams.length

      const homeTeam  = teams[homeIdx]
      const awayTeam  = teams[awayIdx]
      const isHomeFav = seeded(seed, 2) > 0.45
      const favLine   = -(105 + Math.floor(seeded(seed, 3) * 115))
      const dogLine   = Math.abs(favLine) - 15
      const spread    = Math.round((sMin + seeded(seed, 4) * (sMax - sMin)) * 2) / 2
      const total     = Math.round((tMin + seeded(seed, 5) * (tMax - tMin)) * 2) / 2

      events.push({
        id:          `${leagueId}-${dateKey}-${g}`,
        leagueId,
        leagueName:  league.name,
        homeTeam,
        awayTeam,
        displayDate: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        isoDate:     date.toISOString(),
        homeOdds:    isHomeFav ? favLine : dogLine,
        awayOdds:    isHomeFav ? dogLine : favLine,
        spread:      isHomeFav ? -spread : spread,
        total,
      })
    }
  }

  return events
}

export function findEventForTeam(leagueId: string, teamName: string): UpcomingEvent | null {
  const events = generateUpcomingEvents(leagueId)
  return events.find(e => e.homeTeam === teamName || e.awayTeam === teamName) ?? null
}

// ─── Supabase CRUD ────────────────────────────────────────────────────────────

export async function fetchFavoriteGroups(userId: string): Promise<FavoriteGroup[]> {
  const { data, error } = await supabase
    .from('favorite_groups')
    .select('*, items:favorite_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) { console.error('fetchFavoriteGroups:', error); return [] }
  return (data ?? []).map(g => ({ ...g, items: g.items ?? [] })) as FavoriteGroup[]
}

export async function createFavoriteGroup(userId: string, name: string): Promise<FavoriteGroup | null> {
  const { data, error } = await supabase
    .from('favorite_groups')
    .insert({ user_id: userId, name, status: 'active' })
    .select()
    .single()

  if (error) { console.error('createFavoriteGroup:', error); return null }
  return { ...data, items: [] } as FavoriteGroup
}

export async function addItemToGroup(
  groupId: string,
  item: Omit<FavoriteItem, 'id' | 'favorite_group_id' | 'created_at'>,
): Promise<FavoriteItem | null> {
  const { data, error } = await supabase
    .from('favorite_items')
    .insert({ favorite_group_id: groupId, ...item })
    .select()
    .single()

  if (error) { console.error('addItemToGroup:', error); return null }
  return data as FavoriteItem
}

export async function removeItemFromGroup(itemId: string): Promise<boolean> {
  const { error } = await supabase.from('favorite_items').delete().eq('id', itemId)
  if (error) { console.error('removeItem:', error); return false }
  return true
}

export async function deleteFavoriteGroup(groupId: string): Promise<boolean> {
  const { error } = await supabase.from('favorite_groups').delete().eq('id', groupId)
  if (error) { console.error('deleteFavoriteGroup:', error); return false }
  return true
}

export async function renameFavoriteGroup(groupId: string, name: string): Promise<void> {
  await supabase.from('favorite_groups').update({ name }).eq('id', groupId)
}

export async function checkAndCompleteGroups(groups: FavoriteGroup[]): Promise<void> {
  const toComplete = groups.filter(g =>
    g.status === 'active' &&
    g.items.length > 0 &&
    g.items.every(i => i.outcome !== 'pending'),
  )
  await Promise.all(
    toComplete.map(g =>
      supabase.from('favorite_groups').update({ status: 'complete' }).eq('id', g.id),
    ),
  )
}

// ─── Hot Favorites ────────────────────────────────────────────────────────────
// Shows teams that won in previous tracked groups — surfaces them when starting a new group.

export interface HotFavoriteTeam {
  teamName:   string
  leagueId:   string
  leagueName: string
  wins:       number
  event:      UpcomingEvent | null
}

export function getHotFavoriteTeams(groups: FavoriteGroup[]): HotFavoriteTeam[] {
  const winMap = new Map<string, { leagueId: string; leagueName: string; wins: number }>()

  for (const group of groups) {
    for (const item of group.items) {
      if (item.outcome === 'win') {
        const existing = winMap.get(item.team_name)
        if (existing) {
          existing.wins++
        } else {
          winMap.set(item.team_name, {
            leagueId:   item.league_id,
            leagueName: item.league_name,
            wins:       1,
          })
        }
      }
    }
  }

  return Array.from(winMap.entries())
    .map(([teamName, data]) => ({
      teamName,
      ...data,
      event: findEventForTeam(data.leagueId, teamName),
    }))
    .filter(t => t.event !== null)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 6)
}
