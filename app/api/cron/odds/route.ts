export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

// ─── Odds capture cron ────────────────────────────────────────────────────────
//
// Runs 3x daily. For each active league, fetches odds for upcoming/live games
// from the Odds API /odds endpoint, upserts a stub `games` row (status
// 'scheduled') so the lines FK is satisfiable, then upserts the line.
//
// The score cron later upserts the SAME games row (matched on
// league_id + external_id), filling in scores and flipping status to 'final'.
// The two crons converge on one row from opposite ends.
//
// COST: ~3 Odds API credits per league per run (1 region × 3 markets).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchOdds } from '@/lib/odds-api'
import { slugify, extractLine } from '@/lib/ingestion'

const ACTIVE_LEAGUES: { slug: string; oddsApiKey: string }[] = [
  { slug: 'mlb', oddsApiKey: 'baseball_mlb' },
]

type LeagueResult = {
  league_slug:   string
  status:        'success' | 'failed'
  games_stubbed: number
  lines_upserted: number
  error?:        string
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const tokenParam = new URL(req.url).searchParams.get('token')
  const cronSecret = process.env.CRON_SECRET
  const adminToken = process.env.INGESTION_ADMIN_TOKEN

  const viaCron  = cronSecret && authHeader === `Bearer ${cronSecret}`
  const viaToken = adminToken && tokenParam === adminToken

  if (!viaCron && !viaToken) {
    console.warn('[odds-cron] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const results: LeagueResult[] = []

  for (const league of ACTIVE_LEAGUES) {
    results.push(await captureLeagueOdds(league))
  }

  const anyFailed = results.some(r => r.status === 'failed')
  return NextResponse.json(
    {
      success:          !anyFailed,
      duration_seconds: parseFloat(((Date.now() - startedAt) / 1000).toFixed(1)),
      leagues:          results,
    },
    { status: anyFailed ? 207 : 200 },
  )
}

async function captureLeagueOdds(
  league: { slug: string; oddsApiKey: string },
): Promise<LeagueResult> {
  const tag = `[odds-cron:${league.slug}]`

  let runId: string | null = null
  try {
    const { data: run, error } = await supabaseAdmin
      .from('ingestion_runs')
      .insert({ run_type: 'odds', league_slug: league.slug, status: 'running' })
      .select('id')
      .single()
    if (error) throw error
    runId = run.id
    console.log(`${tag} run_id:`, runId)
  } catch (e) {
    console.error(`${tag} could not open ingestion_runs row (non-fatal):`, e)
  }

  try {
    // Resolve league_id
    const { data: leagueRow, error: leagueErr } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('slug', league.slug)
      .single()
    if (leagueErr || !leagueRow) {
      throw new Error(`league row not found for slug "${league.slug}" — seed it first`)
    }
    const leagueId: string = leagueRow.id

    // Fetch odds for upcoming/live games
    console.log(`${tag} Odds API: fetching odds...`)
    const oddsResp = await fetchOdds(league.oddsApiKey)
    console.log(`${tag} Odds API: ${oddsResp.data.length} games | quota remaining: ${oddsResp.remainingRequests}`)

    if (!oddsResp.data.length) {
      if (runId) {
        await supabaseAdmin
          .from('ingestion_runs')
          .update({ status: 'success', completed_at: new Date().toISOString(), games_inserted: 0, api_calls_used: 3 })
          .eq('id', runId)
      }
      console.log(`${tag} no upcoming games — nothing to do`)
      return { league_slug: league.slug, status: 'success', games_stubbed: 0, lines_upserted: 0 }
    }

    // Collect all teams across all games, batch upsert
    const teamNameSet = new Set<string>()
    for (const g of oddsResp.data) {
      teamNameSet.add(g.home_team)
      teamNameSet.add(g.away_team)
    }
    const teamPayloads = Array.from(teamNameSet).map(name => ({
      league_id:   leagueId,
      external_id: slugify(name),
      name,
      slug:        slugify(name),
    }))
    const { error: teamsErr } = await supabaseAdmin
      .from('teams')
      .upsert(teamPayloads, { onConflict: 'league_id,external_id', ignoreDuplicates: true })
    if (teamsErr) throw new Error(`teams batch upsert failed: ${teamsErr.message}`)

    const { data: teamRows, error: teamFetchErr } = await supabaseAdmin
      .from('teams')
      .select('id, slug')
      .in('slug', teamPayloads.map(t => t.slug))
      .eq('league_id', leagueId)
    if (teamFetchErr) throw new Error(`team ID fetch failed: ${teamFetchErr.message}`)
    const teamIdBySlug = new Map<string, string>(
      (teamRows ?? []).map(t => [t.slug as string, t.id as string]),
    )

    let gamesStubbed  = 0
    let linesUpserted = 0
    let gamesFailed   = 0

    for (const game of oddsResp.data) {
      try {
        const homeTeamId = teamIdBySlug.get(slugify(game.home_team))
        const awayTeamId = teamIdBySlug.get(slugify(game.away_team))
        if (!homeTeamId || !awayTeamId) {
          throw new Error(`unresolved team ID for "${game.home_team}" or "${game.away_team}"`)
        }

        const commence = new Date(game.commence_time)
        const gameDate = commence.toISOString().slice(0, 10)
        const season   = commence.getUTCFullYear()

        // Upsert stub game row. onConflict matches the score cron's key, so if
        // the score cron already ran this row is updated harmlessly; if not,
        // a 'scheduled' stub is created for the line FK to reference.
        // We do NOT write status/scores here on conflict — only ensure the row
        // exists. A fresh insert gets status 'scheduled'.
        const { data: gameRow, error: gameErr } = await supabaseAdmin
          .from('games')
          .upsert(
            {
              league_id:    leagueId,
              external_id:  game.id,
              home_team_id: homeTeamId,
              away_team_id: awayTeamId,
              game_date:    gameDate,
              game_time:    game.commence_time,
              season,
              status:       'scheduled',
            },
            { onConflict: 'league_id,external_id', ignoreDuplicates: false },
          )
          .select('id')
          .single()
        if (gameErr) throw new Error(`game stub upsert: ${gameErr.message}`)
        const gameId: string = gameRow.id
        gamesStubbed++

        // Extract and upsert the line
        const line = extractLine(game)
        const { error: lineErr } = await supabaseAdmin
          .from('lines')
          .upsert(
            {
              game_id:      gameId,
              ml_home:      line.ml_home,
              ml_away:      line.ml_away,
              spread_home:  line.spread_home,
              spread_away:  line.spread_away,
              spread_juice: line.spread_juice,
              total:        line.total,
              over_juice:   line.over_juice,
              under_juice:  line.under_juice,
              bookmaker:    line.bookmaker,
              captured_at:  new Date().toISOString(),
            },
            { onConflict: 'game_id' },
          )
        if (lineErr) throw new Error(`line upsert: ${lineErr.message}`)
        linesUpserted++

      } catch (gameErr) {
        gamesFailed++
        console.error(
          `${tag} failed game ${game.id} (${game.home_team} vs ${game.away_team}):`,
          gameErr instanceof Error ? gameErr.message : gameErr,
        )
      }
    }

    console.log(`${tag} complete — stubbed:${gamesStubbed} lines:${linesUpserted} failed:${gamesFailed}`)

    if (runId) {
      await supabaseAdmin
        .from('ingestion_runs')
        .update({
          status:         'success',
          completed_at:   new Date().toISOString(),
          games_inserted: gamesStubbed,
          api_calls_used: 3,
        })
        .eq('id', runId)
    }

    return {
      league_slug: league.slug, status: 'success',
      games_stubbed: gamesStubbed, lines_upserted: linesUpserted,
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`${tag} unhandled error:`, msg)
    if (runId) {
      try {
        await supabaseAdmin
          .from('ingestion_runs')
          .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: msg })
          .eq('id', runId)
      } catch { /* already in error path */ }
    }
    return {
      league_slug: league.slug, status: 'failed',
      games_stubbed: 0, lines_upserted: 0, error: msg,
    }
  }
}