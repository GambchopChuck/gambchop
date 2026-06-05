// scripts/backfill-mlb-stats.ts
//
// Backfills player_game_stats and team_game_stats for a range of dates.
// Step 1: fetch schedule to get gamePks of Final games.
// Step 2: fetch /api/v1/game/{gamePk}/boxscore for each game (schedule endpoint
//         does not embed boxscore even with hydrate=boxscore — fetched separately).
//
// Run:
//   npx tsx --env-file=.env.local scripts/backfill-mlb-stats.ts --start 2026-05-15 --end 2026-06-05

import { createClient } from '@supabase/supabase-js'

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Run with: npx tsx --env-file=.env.local scripts/backfill-mlb-stats.ts --start YYYY-MM-DD --end YYYY-MM-DD')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const MLB_BASE = 'https://statsapi.mlb.com'

// ─── Arg parsing ──────────────────────────────────────────────────────────────

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null
}

const startArg = getArg('--start')
const endArg   = getArg('--end')

if (!startArg || !endArg) {
  console.error('Usage: npx tsx --env-file=.env.local scripts/backfill-mlb-stats.ts --start YYYY-MM-DD --end YYYY-MM-DD')
  process.exit(1)
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T12:00:00Z')
  const last = new Date(end + 'T12:00:00Z')
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

// ─── MLB Stats API types ──────────────────────────────────────────────────────

type MLBBattingStats = {
  hits?: number; homeRuns?: number; rbi?: number
  strikeOuts?: number; baseOnBalls?: number; atBats?: number; runs?: number
}

type MLBPitchingStats = {
  strikeOuts?: number; inningsPitched?: string; earnedRuns?: number
}

type MLBPlayer = {
  person:   { id: number; fullName: string }
  position: { type: string }
  stats:    { batting?: MLBBattingStats; pitching?: MLBPitchingStats }
}

type MLBTeamBox = {
  team:       { id: number; name: string }
  teamStats?: { batting?: MLBBattingStats; pitching?: MLBPitchingStats }
  players?:   Record<string, MLBPlayer>
}

type MLBScheduleGame = {
  gamePk: number
  status: { abstractGameState: string }
}

type MLBScheduleResponse = {
  dates?: Array<{ games: MLBScheduleGame[] }>
}

type MLBBoxscoreResponse = {
  teams: { home: MLBTeamBox; away: MLBTeamBox }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseInningsPitched(raw: string | undefined): number | null {
  if (!raw) return null
  const [whole, thirds] = raw.split('.').map(Number)
  return (whole ?? 0) + ((thirds ?? 0) / 3)
}

// ─── Process one date ─────────────────────────────────────────────────────────

async function processDate(gameDate: string): Promise<{ teams: number; players: number }> {
  // Step 1: schedule — get gamePks of Final regular-season games
  const schedUrl = `${MLB_BASE}/api/v1/schedule?sportId=1&date=${gameDate}&gameType=R`
  const schedRes = await fetch(schedUrl)
  if (!schedRes.ok) throw new Error(`MLB Schedule API HTTP ${schedRes.status} for ${gameDate}`)

  const schedule   = await schedRes.json() as MLBScheduleResponse
  const allGames   = schedule.dates?.flatMap(d => d.games) ?? []
  const finalGames = allGames.filter(g => g.status.abstractGameState === 'Final')

  let teams   = 0
  let players = 0

  for (const game of finalGames) {
    // Step 2: fetch boxscore for this game individually
    const boxUrl = `${MLB_BASE}/api/v1/game/${game.gamePk}/boxscore`
    const boxRes = await fetch(boxUrl)
    if (!boxRes.ok) {
      console.warn(`  ${gameDate} gamePk ${game.gamePk}: boxscore HTTP ${boxRes.status} — skipping`)
      continue
    }
    const box = await boxRes.json() as MLBBoxscoreResponse

    const homeTeamName = box.teams.home.team.name
    const awayTeamName = box.teams.away.team.name

    for (const side of ['home', 'away'] as const) {
      const teamBox    = box.teams[side]
      const teamName   = teamBox.team.name
      const opponentName = side === 'home' ? awayTeamName : homeTeamName

      // ── Team stats ──────────────────────────────────────────────────────────
      const tb = teamBox.teamStats?.batting
      if (tb) {
        const { error } = await supabase.from('team_game_stats').upsert(
          {
            team_name:    teamName,
            game_date:    gameDate,
            league:       'MLB',
            home_or_away: side,
            opponent:     opponentName,
            hits:         tb.hits        ?? null,
            home_runs:    tb.homeRuns    ?? null,
            runs:         tb.runs        ?? null,
            strikeouts:   tb.strikeOuts  ?? null,
            walks:        tb.baseOnBalls ?? null,
            at_bats:      tb.atBats      ?? null,
          },
          { onConflict: 'team_name,game_date', ignoreDuplicates: false },
        )
        if (error) {
          console.warn(`  team_game_stats upsert ${teamName} ${gameDate}: ${error.message}`)
        } else {
          teams++
        }
      }

      // ── Player stats ────────────────────────────────────────────────────────
      for (const entry of Object.values(teamBox.players ?? {})) {
        const playerName = entry.person.fullName
        const batting    = entry.stats.batting
        const pitching   = entry.stats.pitching

        if (batting && batting.atBats != null) {
          const { error } = await supabase.from('player_game_stats').upsert(
            {
              player_name:     playerName,
              team_name:       teamName,
              game_date:       gameDate,
              league:          'MLB',
              player_type:     'batter',
              hits:            batting.hits        ?? null,
              home_runs:       batting.homeRuns    ?? null,
              rbis:            batting.rbi         ?? null,
              strikeouts:      batting.strikeOuts  ?? null,
              walks:           batting.baseOnBalls ?? null,
              at_bats:         batting.atBats      ?? null,
              innings_pitched: null,
              earned_runs:     null,
            },
            { onConflict: 'player_name,game_date,league,player_type', ignoreDuplicates: false },
          )
          if (error) {
            console.warn(`  player_game_stats batter ${playerName} ${gameDate}: ${error.message}`)
          } else {
            players++
          }
        }

        if (pitching && pitching.inningsPitched != null) {
          const { error } = await supabase.from('player_game_stats').upsert(
            {
              player_name:     playerName,
              team_name:       teamName,
              game_date:       gameDate,
              league:          'MLB',
              player_type:     'pitcher',
              hits:            null,
              home_runs:       null,
              rbis:            null,
              strikeouts:      pitching.strikeOuts ?? null,
              walks:           null,
              at_bats:         null,
              innings_pitched: parseInningsPitched(pitching.inningsPitched),
              earned_runs:     pitching.earnedRuns ?? null,
            },
            { onConflict: 'player_name,game_date,league,player_type', ignoreDuplicates: false },
          )
          if (error) {
            console.warn(`  player_game_stats pitcher ${playerName} ${gameDate}: ${error.message}`)
          } else {
            players++
          }
        }
      }
    }
  }

  return { teams, players }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dates = dateRange(startArg!, endArg!)
  console.log(`Backfilling MLB stats from ${startArg} to ${endArg} (${dates.length} dates)`)

  let totalTeams   = 0
  let totalPlayers = 0

  for (const date of dates) {
    try {
      const { teams, players } = await processDate(date)
      totalTeams   += teams
      totalPlayers += players
      console.log(`  ${date}: ${teams} team rows, ${players} player rows`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ${date}: ERROR — ${msg}`)
    }
  }

  console.log(`\nDone. Total: ${totalTeams} team rows, ${totalPlayers} player rows upserted.`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
