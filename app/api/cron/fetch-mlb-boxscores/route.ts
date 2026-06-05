export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 120

// Runs daily at 7am UTC via Vercel Cron.
// Fetches yesterday's final MLB games from the MLB Stats API (boxscore hydration).
// Upserts raw team stats into team_game_stats and player stats into player_game_stats.
// No Odds API calls — threshold comparison happens at query time in the UI.
// Accepts optional ?date=YYYY-MM-DD for backfilling.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MLB_BASE = 'https://statsapi.mlb.com'

// ─── MLB Stats API types ──────────────────────────────────────────────────────

type MLBTeamRef = { id: number; name: string }

type MLBBattingStats = {
  hits?:        number
  homeRuns?:    number
  rbi?:         number
  strikeOuts?:  number
  baseOnBalls?: number
  atBats?:      number
  runs?:        number
}

type MLBPitchingStats = {
  strikeOuts?:      number
  inningsPitched?:  string  // e.g. "6.0", "5.2"
  earnedRuns?:      number
}

type MLBPlayerStats = {
  batting?:  MLBBattingStats
  pitching?: MLBPitchingStats
}

type MLBPlayer = {
  person:   { id: number; fullName: string }
  position: { type: string; abbreviation: string }
  stats:    MLBPlayerStats
}

type MLBTeamBox = {
  team:       MLBTeamRef
  teamStats?: {
    batting?:  MLBBattingStats
    pitching?: MLBPitchingStats
  }
  players?: Record<string, MLBPlayer>
}

type MLBBoxscore = {
  teams: { home: MLBTeamBox; away: MLBTeamBox }
}

type MLBScheduleGame = {
  gamePk:       number
  officialDate: string
  status:       { abstractGameState: string }
  teams:        { home: { team: MLBTeamRef }; away: { team: MLBTeamRef } }
  boxscore?:    MLBBoxscore
}

type MLBScheduleResponse = {
  dates?: Array<{ games: MLBScheduleGame[] }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseInningsPitched(raw: string | undefined): number | null {
  if (!raw) return null
  const [whole, thirds] = raw.split('.').map(Number)
  return (whole ?? 0) + ((thirds ?? 0) / 3)
}

function yesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const params     = new URL(req.url).searchParams
  const tokenParam = params.get('token')
  const cronSecret = process.env.CRON_SECRET
  const adminToken = process.env.INGESTION_ADMIN_TOKEN

  const viaCron  = cronSecret && authHeader === `Bearer ${cronSecret}`
  const viaToken = adminToken && tokenParam === adminToken

  if (!viaCron && !viaToken) {
    console.warn('[fetch-mlb-boxscores] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dateParam = params.get('date')
  const gameDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : yesterday()

  const startedAt = Date.now()
  console.log(`[fetch-mlb-boxscores] processing date: ${gameDate}`)

  try {
    const scheduleUrl =
      `${MLB_BASE}/api/v1/schedule?sportId=1&date=${gameDate}` +
      `&gameType=R&hydrate=boxscore,linescore`

    const schedRes = await fetch(scheduleUrl, { cache: 'no-store' })
    if (!schedRes.ok) throw new Error(`MLB Stats API HTTP ${schedRes.status}`)

    const schedule  = await schedRes.json() as MLBScheduleResponse
    const allGames  = schedule.dates?.flatMap(d => d.games) ?? []
    const finalGames = allGames.filter(g => g.status.abstractGameState === 'Final')

    console.log(`[fetch-mlb-boxscores] ${finalGames.length} final games for ${gameDate}`)

    if (!finalGames.length) {
      return NextResponse.json({
        success: true, date: gameDate,
        games_processed: 0, team_stats_upserted: 0, player_stats_upserted: 0,
        duration_seconds: parseFloat(((Date.now() - startedAt) / 1000).toFixed(1)),
      })
    }

    let teamStatsUpserted   = 0
    let playerStatsUpserted = 0

    for (const game of finalGames) {
      const box = game.boxscore
      if (!box) continue

      const homeTeamName = box.teams.home.team.name
      const awayTeamName = box.teams.away.team.name

      for (const side of ['home', 'away'] as const) {
        const teamBox    = box.teams[side]
        const teamName   = teamBox.team.name
        const opponentName = side === 'home' ? awayTeamName : homeTeamName
        const homeOrAway = side

        // ── Team batting totals ──────────────────────────────────────────────
        const tb = teamBox.teamStats?.batting
        if (tb) {
          const teamRow = {
            team_name:    teamName,
            game_date:    gameDate,
            league:       'MLB',
            home_or_away: homeOrAway,
            opponent:     opponentName,
            hits:         tb.hits        ?? null,
            home_runs:    tb.homeRuns    ?? null,
            runs:         tb.runs        ?? null,
            strikeouts:   tb.strikeOuts  ?? null,
            walks:        tb.baseOnBalls ?? null,
            at_bats:      tb.atBats      ?? null,
          }
          const { error: tErr } = await supabaseAdmin
            .from('team_game_stats')
            .upsert(teamRow, { onConflict: 'team_name,game_date', ignoreDuplicates: false })
          if (tErr) {
            console.error(`[fetch-mlb-boxscores] team_game_stats ${teamName}:`, tErr.message)
          } else {
            teamStatsUpserted++
          }
        }

        // ── Per-player stats ─────────────────────────────────────────────────
        for (const entry of Object.values(teamBox.players ?? {})) {
          const playerName = entry.person.fullName
          const batting    = entry.stats.batting
          const pitching   = entry.stats.pitching

          // Write a batter row if they had at-bats
          if (batting && batting.atBats != null) {
            const batterRow = {
              player_name:  playerName,
              team_name:    teamName,
              game_date:    gameDate,
              league:       'MLB',
              player_type:  'batter',
              hits:         batting.hits        ?? null,
              home_runs:    batting.homeRuns    ?? null,
              rbis:         batting.rbi         ?? null,
              strikeouts:   batting.strikeOuts  ?? null,
              walks:        batting.baseOnBalls ?? null,
              at_bats:      batting.atBats      ?? null,
              innings_pitched: null,
              earned_runs:  null,
            }
            const { error: bErr } = await supabaseAdmin
              .from('player_game_stats')
              .upsert(batterRow, { onConflict: 'player_name,game_date,league,player_type', ignoreDuplicates: false })
            if (bErr) {
              console.error(`[fetch-mlb-boxscores] player_game_stats batter ${playerName}:`, bErr.message)
            } else {
              playerStatsUpserted++
            }
          }

          // Write a pitcher row if they recorded outs
          if (pitching && pitching.inningsPitched != null) {
            const pitcherRow = {
              player_name:     playerName,
              team_name:       teamName,
              game_date:       gameDate,
              league:          'MLB',
              player_type:     'pitcher',
              hits:            null,
              home_runs:       null,
              rbis:            null,
              strikeouts:      pitching.strikeOuts  ?? null,
              walks:           null,
              at_bats:         null,
              innings_pitched: parseInningsPitched(pitching.inningsPitched),
              earned_runs:     pitching.earnedRuns  ?? null,
            }
            const { error: pErr } = await supabaseAdmin
              .from('player_game_stats')
              .upsert(pitcherRow, { onConflict: 'player_name,game_date,league,player_type', ignoreDuplicates: false })
            if (pErr) {
              console.error(`[fetch-mlb-boxscores] player_game_stats pitcher ${playerName}:`, pErr.message)
            } else {
              playerStatsUpserted++
            }
          }
        }
      }
    }

    const duration = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(
      `[fetch-mlb-boxscores] done — games:${finalGames.length}` +
      ` team_stats:${teamStatsUpserted} player_stats:${playerStatsUpserted} duration:${duration}s`,
    )

    return NextResponse.json({
      success: true,
      date:                  gameDate,
      games_processed:       finalGames.length,
      team_stats_upserted:   teamStatsUpserted,
      player_stats_upserted: playerStatsUpserted,
      duration_seconds:      parseFloat(duration),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[fetch-mlb-boxscores] error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
