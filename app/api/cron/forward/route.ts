export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

// ─── Stage 4: Daily forward ingestion cron ────────────────────────────────────
//
// Runs daily via Vercel Cron. For each active league, fetches the last 3 days
// of scores from the Odds API /scores endpoint (daysFrom=3, 2 quota units per
// league) and upserts games + team_game_outcomes.
//
// 3-day rolling window: late-finishing games may not be final when the cron
// runs, and if a day's run fails entirely the next run still backfills it.
// All writes are idempotent upserts, so re-processing a game is harmless.
//
// Odds-API-only — no MLB Stats API — so it works identically for every sport.
// Adding a league = one entry in ACTIVE_LEAGUES below.
//
// COST: 2 Odds API quota units per league per day.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchScores, type GameScore } from '@/lib/odds-api'
import { slugify, computeOutcomes } from '@/lib/ingestion'

// ─── Active leagues ───────────────────────────────────────────────────────────
// slug       = matches leagues.slug in the DB
// oddsApiKey = The Odds API sport key
// Add NBA/NHL/etc. here once their league row + teams exist.
const ACTIVE_LEAGUES: { slug: string; oddsApiKey: string }[] = [
  { slug: 'mlb', oddsApiKey: 'baseball_mlb' },
]

type LeagueResult = {
  league_slug:    string
  status:         'success' | 'failed'
  games_inserted: number
  games_updated:  number
  games_failed:   number
  error?:         string
}

export async function GET(req: NextRequest) {
  // ── Auth — accept Vercel Cron's Authorization header OR a ?token= param ─────
  const authHeader = req.headers.get('authorization')
  const tokenParam = new URL(req.url).searchParams.get('token')
  const cronSecret = process.env.CRON_SECRET
  const adminToken = process.env.INGESTION_ADMIN_TOKEN

  const viaCron  = cronSecret && authHeader === `Bearer ${cronSecret}`
  const viaToken = adminToken && tokenParam === adminToken

  if (!viaCron && !viaToken) {
    console.warn('[forward-cron] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const results: LeagueResult[] = []

  // Each league is independent — one failing does not abort the others
  for (const league of ACTIVE_LEAGUES) {
    results.push(await ingestLeague(league))
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

// ─── Per-league ingestion ─────────────────────────────────────────────────────
async function ingestLeague(
  league: { slug: string; oddsApiKey: string },
): Promise<LeagueResult> {
  const tag = `[forward-cron:${league.slug}]`

  // Open an ingestion_runs row for this league
  let runId: string | null = null
  try {
    const { data: run, error } = await supabaseAdmin
      .from('ingestion_runs')
      .insert({ run_type: 'forward', league_slug: league.slug, status: 'running' })
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

    // Fetch last 3 days of scores from the Odds API
    console.log(`${tag} Odds API: fetching daysFrom=3...`)
    const scoresResp = await fetchScores(league.oddsApiKey, 3)
    console.log(`${tag} Odds API: ${scoresResp.data.length} games | quota remaining: ${scoresResp.remainingRequests}`)

    type CompletedGame = GameScore & { scores: NonNullable<GameScore['scores']> }
    const completedGames = scoresResp.data.filter(
      (g): g is CompletedGame =>
        g.completed === true &&
        Array.isArray(g.scores) &&
        g.scores.length >= 2,
    )
    console.log(`${tag} completed games with scores: ${completedGames.length}`)

    if (!completedGames.length) {
      // Not an error — just nothing final in the window yet
      if (runId) {
        await supabaseAdmin
          .from('ingestion_runs')
          .update({
            status:         'success',
            completed_at:   new Date().toISOString(),
            games_inserted: 0,
            api_calls_used: 2,
          })
          .eq('id', runId)
      }
      console.log(`${tag} no completed games in window — nothing to do`)
      return {
        league_slug: league.slug, status: 'success',
        games_inserted: 0, games_updated: 0, games_failed: 0,
      }
    }

    // Batch upsert teams
    const teamNameSet = new Set<string>()
    for (const g of completedGames) {
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

    // Pre-fetch existing game external_ids for accurate insert/update counts
    const externalIds = completedGames.map(g => g.id)
    const { data: existingGames } = await supabaseAdmin
      .from('games')
      .select('external_id')
      .in('external_id', externalIds)
      .eq('league_id', leagueId)
    const existingExternalIds = new Set((existingGames ?? []).map(g => g.external_id as string))

    // Process each game
    let gamesInserted = 0
    let gamesUpdated  = 0
    let gamesFailed   = 0

    for (const game of completedGames) {
      try {
        const homeSlug   = slugify(game.home_team)
        const awaySlug   = slugify(game.away_team)
        const homeTeamId = teamIdBySlug.get(homeSlug)
        const awayTeamId = teamIdBySlug.get(awaySlug)
        if (!homeTeamId || !awayTeamId) {
          throw new Error(`unresolved team ID for "${game.home_team}" or "${game.away_team}"`)
        }

        const homeEntry = game.scores.find(s => s.name === game.home_team)
        const awayEntry = game.scores.find(s => s.name === game.away_team)
        if (!homeEntry || !awayEntry) {
          throw new Error(`missing score entry in game ${game.id}`)
        }

        const homeScore = parseInt(homeEntry.score, 10)
        const awayScore = parseInt(awayEntry.score, 10)
        const commence  = new Date(game.commence_time)
        const gameDate  = commence.toISOString().slice(0, 10)
        const season    = commence.getUTCFullYear()

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
              status:       'final',
              home_score:   homeScore,
              away_score:   awayScore,
              venue:        null,
            },
            { onConflict: 'league_id,external_id' },
          )
          .select('id')
          .single()
        if (gameErr) throw new Error(`game upsert: ${gameErr.message}`)
        const gameId: string = gameRow.id

        if (existingExternalIds.has(game.id)) gamesUpdated++
        else gamesInserted++

        const outcomes = computeOutcomes(
          {
            home_team:  game.home_team,
            away_team:  game.away_team,
            home_score: homeScore,
            away_score: awayScore,
          },
          null,
        )

        const outcomeRows = outcomes.map(o => ({
          game_id:             gameId,
          team_id:             o.team_name === game.home_team ? homeTeamId : awayTeamId,
          was_home:            o.was_home,
          was_ml_favorite:     o.was_ml_favorite,
          was_spread_favorite: o.was_spread_favorite,
          own_score:           o.own_score,
          opponent_score:      o.opponent_score,
          moneyline_result:    o.moneyline_result,
          spread_result:       o.spread_result,
          over_under_result:   o.over_under_result,
        }))

        const { error: outcomeErr } = await supabaseAdmin
          .from('team_game_outcomes')
          .upsert(outcomeRows, { onConflict: 'game_id,team_id' })
        if (outcomeErr) throw new Error(`outcomes upsert: ${outcomeErr.message}`)

      } catch (gameErr) {
        gamesFailed++
        console.error(
          `${tag} failed game ${game.id} (${game.home_team} vs ${game.away_team}):`,
          gameErr instanceof Error ? gameErr.message : gameErr,
        )
      }
    }

    console.log(`${tag} complete — inserted:${gamesInserted} updated:${gamesUpdated} failed:${gamesFailed}`)

    if (runId) {
      await supabaseAdmin
        .from('ingestion_runs')
        .update({
          status:         'success',
          completed_at:   new Date().toISOString(),
          games_inserted: gamesInserted,
          api_calls_used: 2,
        })
        .eq('id', runId)
    }

    return {
      league_slug: league.slug, status: 'success',
      games_inserted: gamesInserted, games_updated: gamesUpdated, games_failed: gamesFailed,
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
      games_inserted: 0, games_updated: 0, games_failed: 0,
      error: msg,
    }
  }
}