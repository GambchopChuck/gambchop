'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { generateMockGames } from './leagues-data'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BetType    = 'moneyline' | 'spread' | 'over' | 'under'
export type NotifType  = 'streak' | 'line-move' | 'game-day'

export interface Follow {
  teamSlug: string
  leagueId: string
  teamName: string
  addedAt: string
}

export interface Pick {
  id: string
  teamSlug: string
  leagueId: string
  teamName: string
  betType: BetType
  addedAt: string
}

export interface AppNotification {
  id: string
  teamName: string
  message: string
  type: NotifType
  read: boolean
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const FREE_FOLLOWS = 3
export const FREE_PICKS   = 5

const FK = 'gambchop-follows'
const PK = 'gambchop-picks'
const NK = 'gambchop-notifications'

// ─── localStorage helpers ─────────────────────────────────────────────────────

function ls<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}
function persist(key: string, v: unknown) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(v))
}

// ─── Deterministic notification generator ─────────────────────────────────────

function djb(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function genNotifs(teamName: string, now = Date.now()): AppNotification[] {
  const games  = generateMockGames(teamName, 10)
  const played = games.filter(g => g.moneylineResult !== null)
  const out: AppNotification[] = []

  // Streak check (consecutive from most recent)
  const last = played.at(-1)?.moneylineResult ?? null
  let streak = 0
  for (let i = played.length - 1; i >= 0; i--) {
    if (played[i].moneylineResult === last) streak++
    else break
  }
  if (streak >= 3 && last) {
    const e = last === 'win' ? '🔥' : '📉'
    out.push({
      id: `streak-${teamName}`,
      teamName,
      message: `${e} ${teamName}: ${streak}-game ${last} streak`,
      type: 'streak',
      read: false,
      createdAt: new Date(now - 1800000).toISOString(),
    })
  }

  // Line movement (deterministic)
  const h = djb(teamName)
  if (h % 3 !== 0) {
    const mv = h % 2 === 0 ? '+8' : '-12'
    out.push({
      id: `line-${teamName}`,
      teamName,
      message: `📈 ${teamName}: line moved ${mv}¢ since open`,
      type: 'line-move',
      read: false,
      createdAt: new Date(now - 3600000).toISOString(),
    })
  }

  // Game day (always)
  out.push({
    id: `gameday-${teamName}`,
    teamName,
    message: `🏆 ${teamName} plays today — check the chart`,
    type: 'game-day',
    read: false,
    createdAt: new Date(now - 900000).toISOString(),
  })

  return out
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface UCValue {
  follows:      Follow[]
  picks:        Pick[]
  notifications: AppNotification[]
  unreadCount:  number
  isFollowing:  (slug: string) => boolean
  toggleFollow: (slug: string, leagueId: string, teamName: string) => void
  hasPick:      (slug: string, betType: BetType) => boolean
  togglePick:   (slug: string, leagueId: string, teamName: string, betType: BetType) => void
  markRead:     (id: string) => void
  markAllRead:  () => void
}

const UC = createContext<UCValue>({
  follows: [], picks: [], notifications: [], unreadCount: 0,
  isFollowing: () => false, toggleFollow: () => {},
  hasPick: () => false, togglePick: () => {},
  markRead: () => {}, markAllRead: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [follows, setFollows] = useState<Follow[]>([])
  const [picks,   setPicks]   = useState<Pick[]>([])
  const [notifs,  setNotifs]  = useState<AppNotification[]>([])

  useEffect(() => {
    setFollows(ls<Follow>(FK))
    setPicks(ls<Pick>(PK))
    setNotifs(ls<AppNotification>(NK))
  }, [])

  const isFollowing = (slug: string) => follows.some(f => f.teamSlug === slug)
  const hasPick     = (slug: string, bt: BetType) => picks.some(p => p.teamSlug === slug && p.betType === bt)
  const unreadCount = notifs.filter(n => !n.read).length

  const toggleFollow = (slug: string, leagueId: string, teamName: string) => {
    if (isFollowing(slug)) {
      // Unfollow: remove follow + team's notifications
      const nf = follows.filter(f => f.teamSlug !== slug)
      const nn = notifs.filter(n => n.teamName !== teamName)
      setFollows(nf); persist(FK, nf)
      setNotifs(nn);  persist(NK, nn)
    } else {
      // Follow: add entry + generate fresh notifications
      const nf = [...follows, { teamSlug: slug, leagueId, teamName, addedAt: new Date().toISOString() }]
      const fresh    = genNotifs(teamName)
      const filtered = notifs.filter(n => n.teamName !== teamName)
      const nn       = [...filtered, ...fresh]
      setFollows(nf); persist(FK, nf)
      setNotifs(nn);  persist(NK, nn)
    }
  }

  const togglePick = (slug: string, leagueId: string, teamName: string, betType: BetType) => {
    if (hasPick(slug, betType)) {
      const np = picks.filter(p => !(p.teamSlug === slug && p.betType === betType))
      setPicks(np); persist(PK, np)
    } else {
      const np = [...picks, {
        id: `${slug}-${betType}-${Date.now()}`,
        teamSlug: slug, leagueId, teamName, betType,
        addedAt: new Date().toISOString(),
      }]
      setPicks(np); persist(PK, np)
    }
  }

  const markRead = (id: string) => {
    const nn = notifs.map(n => n.id === id ? { ...n, read: true } : n)
    setNotifs(nn); persist(NK, nn)
  }

  const markAllRead = () => {
    const nn = notifs.map(n => ({ ...n, read: true }))
    setNotifs(nn); persist(NK, nn)
  }

  return (
    <UC.Provider value={{ follows, picks, notifications: notifs, unreadCount, isFollowing, toggleFollow, hasPick, togglePick, markRead, markAllRead }}>
      {children}
    </UC.Provider>
  )
}

export function useUser() { return useContext(UC) }
