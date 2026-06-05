import type { Metadata } from 'next'
import { Suspense } from 'react'
import StatsClient from './StatsClient'

export const metadata: Metadata = {
  title: 'Stats | Gambchop',
  description: '2026 MLB team and player statistics — batting and pitching tables.',
}

// ─── MLB Stats API types ──────────────────────────────────────────────────────

interface MLBStatValue {
  gamesPlayed?:    number
  atBats?:         number
  runs?:           number
  hits?:           number
  doubles?:        number
  triples?:        number
  homeRuns?:       number
  rbi?:            number
  totalBases?:     number
  baseOnBalls?:    number
  strikeOuts?:     number
  stolenBases?:    number
  avg?:            string
  obp?:            string
  slg?:            string
  ops?:            string
  wins?:            number
  losses?:          number
  era?:             string
  saves?:           number
  completeGames?:   number
  shutouts?:        number
  qualityStarts?:   number
  inningsPitched?:  string
  earnedRuns?:      number
  whip?:            string
  numberOfPitches?: number
}

// ─── Public data shapes ───────────────────────────────────────────────────────

export interface TeamBatRow {
  team: string; gp: number; ab: number; r: number; h: number
  d: number; t: number; hr: number; rbi: number; tb: number
  bb: number; so: number; sb: number
  avg: string; obp: string; slg: string; ops: string
}

export interface TeamPitRow {
  team: string; gp: number; w: number; l: number; era: string
  sv: number; cg: number; sho: number; qs: number; ip: string
  pc: number
  h: number; er: number; hr: number; bb: number; so: number
  oba: string; whip: string
}

export interface PlayerBatRow extends TeamBatRow { player: string }
export interface PlayerPitRow extends TeamPitRow { player: string }

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const BASE   = 'https://statsapi.mlb.com/api/v1'
const SEASON = new Date().getFullYear()
const OPTS   = { next: { revalidate: 10800 } }

function nv(v: number | undefined): number { return v ?? 0 }
function sv(v: string | undefined): string { return v ?? '--' }

async function fetchTeamBatting(): Promise<TeamBatRow[]> {
  try {
    const res  = await fetch(`${BASE}/teams/stats?season=${SEASON}&sportId=1&stats=season&group=hitting`, OPTS)
    if (!res.ok) return []
    const json = await res.json() as {
      stats?: Array<{ splits?: Array<{ team?: { name?: string }; stat?: MLBStatValue }> }>
    }
    return (json.stats?.[0]?.splits ?? []).map(row => ({
      team: row.team?.name ?? '—',
      gp: nv(row.stat?.gamesPlayed), ab: nv(row.stat?.atBats),     r:  nv(row.stat?.runs),
      h:  nv(row.stat?.hits),        d:  nv(row.stat?.doubles),    t:  nv(row.stat?.triples),
      hr: nv(row.stat?.homeRuns),    rbi:nv(row.stat?.rbi),        tb: nv(row.stat?.totalBases),
      bb: nv(row.stat?.baseOnBalls), so: nv(row.stat?.strikeOuts), sb: nv(row.stat?.stolenBases),
      avg: sv(row.stat?.avg), obp: sv(row.stat?.obp), slg: sv(row.stat?.slg), ops: sv(row.stat?.ops),
    }))
  } catch { return [] }
}

async function fetchTeamPitching(): Promise<TeamPitRow[]> {
  try {
    const res  = await fetch(`${BASE}/teams/stats?season=${SEASON}&sportId=1&stats=season&group=pitching`, OPTS)
    if (!res.ok) return []
    const json = await res.json() as {
      stats?: Array<{ splits?: Array<{ team?: { name?: string }; stat?: MLBStatValue }> }>
    }
    return (json.stats?.[0]?.splits ?? []).map(row => ({
      team: row.team?.name ?? '—',
      gp: nv(row.stat?.gamesPlayed), w:  nv(row.stat?.wins),          l:   nv(row.stat?.losses),
      sv: nv(row.stat?.saves),       cg: nv(row.stat?.completeGames),  sho: nv(row.stat?.shutouts),
      qs: nv(row.stat?.qualityStarts),
      pc: nv(row.stat?.numberOfPitches),
      h:  nv(row.stat?.hits),        er:  nv(row.stat?.earnedRuns),
      hr: nv(row.stat?.homeRuns),    bb: nv(row.stat?.baseOnBalls),    so:  nv(row.stat?.strikeOuts),
      era: sv(row.stat?.era), ip: sv(row.stat?.inningsPitched),
      oba: sv(row.stat?.avg), whip: sv(row.stat?.whip),
    }))
  } catch { return [] }
}

type PlayerSplit = { player?: { fullName?: string }; team?: { name?: string }; stat?: MLBStatValue }

async function fetchPlayerBatting(): Promise<PlayerBatRow[]> {
  try {
    const res  = await fetch(`${BASE}/stats?stats=season&season=${SEASON}&sportId=1&group=hitting&limit=100`, OPTS)
    if (!res.ok) return []
    const json = await res.json() as { stats?: Array<{ splits?: PlayerSplit[] }> }
    return (json.stats?.[0]?.splits ?? []).slice(0, 100).map(sp => ({
      player: sp.player?.fullName ?? '—', team: sp.team?.name ?? '—',
      gp: nv(sp.stat?.gamesPlayed), ab: nv(sp.stat?.atBats),     r:  nv(sp.stat?.runs),
      h:  nv(sp.stat?.hits),        d:  nv(sp.stat?.doubles),    t:  nv(sp.stat?.triples),
      hr: nv(sp.stat?.homeRuns),    rbi:nv(sp.stat?.rbi),        tb: nv(sp.stat?.totalBases),
      bb: nv(sp.stat?.baseOnBalls), so: nv(sp.stat?.strikeOuts), sb: nv(sp.stat?.stolenBases),
      avg: sv(sp.stat?.avg), obp: sv(sp.stat?.obp), slg: sv(sp.stat?.slg), ops: sv(sp.stat?.ops),
    }))
  } catch { return [] }
}

async function fetchPlayerPitching(): Promise<PlayerPitRow[]> {
  try {
    const res  = await fetch(`${BASE}/stats?stats=season&season=${SEASON}&sportId=1&group=pitching&limit=100`, OPTS)
    if (!res.ok) return []
    const json = await res.json() as { stats?: Array<{ splits?: PlayerSplit[] }> }
    return (json.stats?.[0]?.splits ?? []).slice(0, 100).map(sp => ({
      player: sp.player?.fullName ?? '—', team: sp.team?.name ?? '—',
      gp: nv(sp.stat?.gamesPlayed), w:  nv(sp.stat?.wins),          l:   nv(sp.stat?.losses),
      sv: nv(sp.stat?.saves),       cg: nv(sp.stat?.completeGames),  sho: nv(sp.stat?.shutouts),
      qs: nv(sp.stat?.qualityStarts),
      pc: nv(sp.stat?.numberOfPitches),
      h:  nv(sp.stat?.hits),        er:  nv(sp.stat?.earnedRuns),
      hr: nv(sp.stat?.homeRuns),    bb: nv(sp.stat?.baseOnBalls),    so:  nv(sp.stat?.strikeOuts),
      era: sv(sp.stat?.era), ip: sv(sp.stat?.inningsPitched),
      oba: sv(sp.stat?.avg), whip: sv(sp.stat?.whip),
    }))
  } catch { return [] }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  const [teamBat, teamPit, playerBat, playerPit] = await Promise.all([
    fetchTeamBatting(),
    fetchTeamPitching(),
    fetchPlayerBatting(),
    fetchPlayerPitching(),
  ])

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#08080d' }} />}>
      <StatsClient
        teamBat={teamBat}
        teamPit={teamPit}
        playerBat={playerBat}
        playerPit={playerPit}
        season={SEASON}
      />
    </Suspense>
  )
}
