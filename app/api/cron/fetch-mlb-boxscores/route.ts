export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 120

// Runs daily at 7am UTC via Vercel Cron.
// Fetches MLB final games from the MLB Stats API.
// Upserts team/player stats into team_game_stats and player_game_stats.
// Also extracts inning-by-inning linescore data into team_game_linescore.
// Accepts optional ?date=YYYY-MM-DD for backfilling.
//
// Architecture:
// 1. Fetch schedule with hydrate=linescore to get inning scores + Final game list.
// 2. For each Final game fetch /api/v1/game/{gamePk}/boxscore individually
//    (schedule endpoint does not embed boxscore even with hydrate=boxscore).
// 3. Write team/player batting stats from boxscore.
// 4. Write linescore rows (cumulative scores after 3, 5, 7 innings + run diff).

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
  strikeOuts?:     number
  inningsPitched?: string
  earnedRuns?:     number
}

type MLBPlayer = {
  person:   { id: number; fullName: string }
  position: { type: string; abbreviation: string }
  stats:    { batting?: MLBBattingStats; pitching?: MLBPitchingStats }
}

type MLBTeamBox = {
  team:       MLBTeamRef
  teamStats?: { batting?: MLBBattingStats; pitching?: MLBPitchingStats }
  players?:   Record<string, MLBPlayer>
}

type MLBBoxscore = {
  teams: { home: MLBTeamBox; away: MLBTeamBox }
}

// Linescore: each inning has home/away run totals
type MLBInningHalf = { runs?: number }
type MLBInning     = { num: number; home: MLBInningHalf; away: MLBInningHalf }

type MLBLinescore = {
  innings: MLBInning[]
  teams:   { home: { runs?: number }; away: { runs?: number } }
}

// Schedule game — linescore IS embedded when hydrate=linescore is used
type MLBScheduleGame = {
  gamePk:       number
  officialDate: string
  status:       { abstractGameState: string }
  teams:        { home: { team: MLBTeamRef }; away: { team: MLBTeamRef } }
  linescore?:   MLBLinescore
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

// Returns cumulative runs for a side after the first N innings.
// Returns null if the game didn't reach inning N (e.g. rain-shortened).
function cumulativeAfter(innings: MLBInning[], side: 'home' | 'away', n: number): number | null {
  const relevant = innings.filter(inn => inn.num <= n)
  if (relevant.length < n) return null
  return relevant.reduce((s, inn) => s + (inn[side].runs ?? 0), 0)
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
  const gameDate  =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : yesterday()

  const startedAt = Date.now()
  console.log(`[fetch-mlb-boxscores] processing date: ${gameDate}`)

  try {
    // Step 1: fetch schedule with linescore hydration to get inning scores
    const scheduleUrl =
      `${MLB_BASE}/api/v1/schedule?sportId=1&date=${gameDate}` +
      `&gameType=R&hydrate=linescore`

    const schedRes = await fetch(scheduleUrl, { cache: 'no-store' })
    if (!schedRes.ok) throw new Error(`MLB Stats API HTTP ${schedRes.status}`)

    const schedule   = await schedRes.json() as MLBScheduleResponse
    const allGames   = schedule.dates?.flatMap(d => d.games) ?? []
    const finalGames = allGames.filter(g => g.status.abstractGameState === 'Final')

    console.log(`[fetch-mlb-boxscores] ${finalGames.length} final games for ${gameDate}`)

    if (!finalGames.length) {
      return NextResponse.json({
        success: true, date: gameDate,
        games_processed: 0, team_stats_upserted: 0,
        player_stats_upserted: 0, linescore_upserted: 0,
        duration_seconds: parseFloat(((Date.now() - startedAt) / 1000).toFixed(1)),
      })
    }

    let teamStatsUpserted   = 0
    let playerStatsUpserted = 0
    let linescoreUpserted   = 0

    for (const game of finalGames) {
      const homeTeamName = game.teams.home.team.name
      const awayTeamName = game.teams.away.team.name

      // Step 2: fetch individual boxscore for team/player batting stats
      let box: MLBBoxscore | null = null
      try {
        const boxRes = await fetch(`${MLB_BASE}/api/v1/game/${game.gamePk}/boxscore`, { cache: 'no-store' })
        if (boxRes.ok) {
          box = await boxRes.json() as MLBBoxscore
        } else {
          console.warn(`[fetch-mlb-boxscores] boxscore HTTP ${boxRes.status} for gamePk ${game.gamePk}`)
        }
      } catch (boxErr) {
        console.error(`[fetch-mlb-boxscores] boxscore fetch error for ${game.gamePk}:`, boxErr)
      }

      // Step 3: write team/player stats from boxscore
      if (box) {
        for (const side of ['home', 'away'] as const) {
          const teamBox      = box.teams[side]
          const teamName     = teamBox.team.name
          const opponentName = side === 'home' ? awayTeamName : homeTeamName

          const tb = teamBox.teamStats?.batting
          if (tb) {
            const { error: tErr } = await supabaseAdmin
              .from('team_game_stats')
              .upsert({
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
              }, { onConflict: 'team_name,game_date', ignoreDuplicates: false })
            if (tErr) console.error(`[fetch-mlb-boxscores] team_game_stats ${teamName}:`, tErr.message)
            else teamStatsUpserted++
          }

          for (const entry of Object.values(teamBox.players ?? {})) {
            const playerName = entry.person.fullName
            const batting    = entry.stats.batting
            const pitching   = entry.stats.pitching

            if (batting && batting.atBats != null) {
              const { error: bErr } = await supabaseAdmin
                .from('player_game_stats')
                .upsert({
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
                }, { onConflict: 'player_name,game_date,league,player_type', ignoreDuplicates: false })
              if (bErr) console.error(`[fetch-mlb-boxscores] player batter ${playerName}:`, bErr.message)
              else playerStatsUpserted++
            }

            if (pitching && pitching.inningsPitched != null) {
              const { error: pErr } = await supabaseAdmin
                .from('player_game_stats')
                .upsert({
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
                }, { onConflict: 'player_name,game_date,league,player_type', ignoreDuplicates: false })
              if (pErr) console.error(`[fetch-mlb-boxscores] player pitcher ${playerName}:`, pErr.message)
              else playerStatsUpserted++
            }
          }
        }
      }

      // Step 4: write linescore rows from schedule hydration
      const ls = game.linescore
      if (ls) {
        const homeFinal = ls.teams.home.runs ?? null
        const awayFinal = ls.teams.away.runs ?? null

        for (const side of ['home', 'away'] as const) {
          const opp  = side === 'home' ? 'away' : 'home'
          const name = side === 'home' ? homeTeamName : awayTeamName
          const oppName = side === 'home' ? awayTeamName : homeTeamName
          const myFinal  = side === 'home' ? homeFinal : awayFinal
          const oppFinal = side === 'home' ? awayFinal : homeFinal
          const runDiff  = (myFinal !== null && oppFinal !== null) ? myFinal - oppFinal : null

          const row = {
            team_name:               name,
            league:                  'MLB',
            game_date:               gameDate,
            opponent:                oppName,
            home_away:               side,
            score_after_3:           cumulativeAfter(ls.innings, side, 3),
            opponent_score_after_3:  cumulativeAfter(ls.innings, opp,  3),
            score_after_5:           cumulativeAfter(ls.innings, side, 5),
            opponent_score_after_5:  cumulativeAfter(ls.innings, opp,  5),
            score_after_7:           cumulativeAfter(ls.innings, side, 7),
            opponent_score_after_7:  cumulativeAfter(ls.innings, opp,  7),
            final_score:             myFinal,
            opponent_final_score:    oppFinal,
            run_differential:        runDiff,
          }

          const { error: lErr } = await supabaseAdmin
            .from('team_game_linescore')
            .upsert(row, { onConflict: 'team_name,league,game_date', ignoreDuplicates: false })
          if (lErr) console.error(`[fetch-mlb-boxscores] team_game_linescore ${name}:`, lErr.message)
          else linescoreUpserted++
        }
      }
    }

    const duration = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(
      `[fetch-mlb-boxscores] done — games:${finalGames.length}` +
      ` team_stats:${teamStatsUpserted} player_stats:${playerStatsUpserted}` +
      ` linescore:${linescoreUpserted} duration:${duration}s`,
    )

    return NextResponse.json({
      success: true,
      date:                  gameDate,
      games_processed:       finalGames.length,
      team_stats_upserted:   teamStatsUpserted,
      player_stats_upserted: playerStatsUpserted,
      linescore_upserted:    linescoreUpserted,
      duration_seconds:      parseFloat(duration),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[fetch-mlb-boxscores] error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
