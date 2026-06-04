export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 120

// ─── Stage: Daily player prop results ingestion ───────────────────────────────
//
// Runs daily at 6am UTC via Vercel Cron (after overnight games complete).
// Fetches boxscores for yesterday's final MLB games from the MLB Stats API.
// For each player stat, looks up any matching prop line and computes
// over / under / push.
// Upserts player results into player_prop_results.
// Upserts team batting totals into team_game_stats.
// Accepts optional ?date=YYYY-MM-DD to reprocess a specific date.

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
  strikeOuts?: number
}

type MLBPlayerStats = {
  batting?:  MLBBattingStats
  pitching?: MLBPitchingStats
}

type MLBPlayer = {
  person: { id: number; fullName: string }
  stats:  MLBPlayerStats
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
}

type MLBScheduleResponse = {
  dates?: Array<{ games: MLBScheduleGame[] }>
}

// ─── Prop type → batting/pitching stat key ────────────────────────────────────

const PROP_TO_STAT: Record<string, { source: 'batting' | 'pitching'; field: string }> = {
  hits:       { source: 'batting',  field: 'hits'       },
  home_runs:  { source: 'batting',  field: 'homeRuns'   },
  rbis:       { source: 'batting',  field: 'rbi'        },
  strikeouts: { source: 'pitching', field: 'strikeOuts' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toResult(actual: number, line: number): 'over' | 'under' | 'push' {
  if (actual > line) return 'over'
  if (actual < line) return 'under'
  return 'push'
}

async function fetchBoxscore(gamePk: number): Promise<MLBBoxscore | null> {
  const url = `${MLB_BASE}/api/v1/game/${gamePk}/boxscore`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    console.warn(`[fetch-prop-results] boxscore HTTP ${res.status} for gamePk ${gamePk}`)
    return null
  }
  return res.json() as Promise<MLBBoxscore>
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
    console.warn('[fetch-prop-results] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Default to yesterday; allow override via ?date=YYYY-MM-DD
  const dateParam = params.get('date')
  let gameDate: string
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    gameDate = dateParam
  } else {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 1)
    gameDate = d.toISOString().slice(0, 10)
  }

  const startedAt = Date.now()
  console.log(`[fetch-prop-results] processing game date: ${gameDate}`)

  try {
    // Fetch yesterday's schedule
    const scheduleUrl =
      `${MLB_BASE}/api/v1/schedule?sportId=1&date=${gameDate}&gameType=R`
    const schedRes = await fetch(scheduleUrl, { cache: 'no-store' })
    if (!schedRes.ok) throw new Error(`MLB Stats API schedule HTTP ${schedRes.status}`)

    const schedule = await schedRes.json() as MLBScheduleResponse
    const allGames: MLBScheduleGame[] = schedule.dates?.flatMap(d => d.games) ?? []
    const finalGames = allGames.filter(g => g.status.abstractGameState === 'Final')

    console.log(`[fetch-prop-results] ${finalGames.length} final games for ${gameDate}`)

    if (!finalGames.length) {
      return NextResponse.json({
        success: true, date: gameDate, games_processed: 0,
        results_upserted: 0, team_stats_upserted: 0,
        duration_seconds: parseFloat(((Date.now() - startedAt) / 1000).toFixed(1)),
      })
    }

    // Pre-fetch today's prop lines for quick lookup
    const { data: propLines } = await supabaseAdmin
      .from('player_prop_lines')
      .select('player_name, prop_type, line')
      .eq('game_date', gameDate)

    type PropKey = `${string}::${string}`
    const lineMap = new Map<PropKey, number>()
    for (const row of propLines ?? []) {
      lineMap.set(`${row.player_name}::${row.prop_type}` as PropKey, Number(row.line))
    }

    let resultsUpserted  = 0
    let teamStatsUpserted = 0

    for (const game of finalGames) {
      const box = await fetchBoxscore(game.gamePk)
      if (!box) continue

      for (const side of ['home', 'away'] as const) {
        const teamBox  = box.teams[side]
        const teamName = teamBox.team.name

        // ── Team batting totals ────────────────────────────────────────────
        const tb = teamBox.teamStats?.batting
        if (tb) {
          const teamRow = {
            team_name:  teamName,
            game_date:  gameDate,
            hits:       tb.hits        ?? null,
            home_runs:  tb.homeRuns    ?? null,
            runs:       tb.runs        ?? null,
            strikeouts: tb.strikeOuts  ?? null,
            walks:      tb.baseOnBalls ?? null,
            at_bats:    tb.atBats      ?? null,
          }
          const { error: tErr } = await supabaseAdmin
            .from('team_game_stats')
            .upsert(teamRow, { onConflict: 'team_name,game_date', ignoreDuplicates: false })
          if (tErr) {
            console.error(`[fetch-prop-results] team_game_stats upsert ${teamName}:`, tErr.message)
          } else {
            teamStatsUpserted++
          }
        }

        // ── Per-player stats ───────────────────────────────────────────────
        for (const playerEntry of Object.values(teamBox.players ?? {})) {
          const playerName = playerEntry.person.fullName
          const stats      = playerEntry.stats

          for (const [propType, { source, field }] of Object.entries(PROP_TO_STAT)) {
            const statBlock = stats[source] as Record<string, number | undefined> | undefined
            if (!statBlock) continue
            const actual = statBlock[field]
            if (actual == null) continue

            // Always store the stat even without a matching prop line
            const lineKey: PropKey = `${playerName}::${propType}`
            const line = lineMap.get(lineKey)

            // Only write a result row if a prop line exists to compare against
            if (line == null) continue

            const resultRow = {
              player_name:  playerName,
              team_name:    teamName,
              game_date:    gameDate,
              prop_type:    propType,
              line,
              actual_value: actual,
              result:       toResult(actual, line),
            }

            const { error: rErr } = await supabaseAdmin
              .from('player_prop_results')
              .upsert(resultRow, { onConflict: 'player_name,game_date,prop_type', ignoreDuplicates: false })

            if (rErr) {
              console.error(
                `[fetch-prop-results] results upsert ${playerName} ${propType}:`, rErr.message,
              )
            } else {
              resultsUpserted++
            }
          }
        }
      }
    }

    const duration = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(
      `[fetch-prop-results] done — games:${finalGames.length}` +
      ` results:${resultsUpserted} team_stats:${teamStatsUpserted} duration:${duration}s`,
    )

    return NextResponse.json({
      success: true,
      date: gameDate,
      games_processed:    finalGames.length,
      results_upserted:   resultsUpserted,
      team_stats_upserted: teamStatsUpserted,
      duration_seconds:   parseFloat(duration),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[fetch-prop-results] error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
