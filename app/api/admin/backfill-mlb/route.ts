export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const maxDuration = 60   // Vercel Hobby max; upgrade plan for longer

// ─── Stage 3: MLB score backfill — 14 days ────────────────────────────────────
//
// Two-source strategy (verified against live docs):
//
//   Source A — Odds API /scores (days 1–3):
//     daysFrom accepts 1 | 2 | 3 ONLY. No date-offset exists. One call with
//     daysFrom=3 covers the last 3 days and costs 2 quota units.
//
//   Source B — MLB Stats API /schedule (days 4–14):
//     statsapi.mlb.com accepts any date range, returns final scores, free,
//     no API key required. /v4/historical/sports/{sport}/scores does NOT exist
//     on The Odds API — MLB Stats API is the correct solution for history.
//
//   The two windows do not overlap (Odds API: days 1–3, MLB Stats: days 4–14),
//   so external_ids are always unique per row. external_id for Odds API games
//   is the Odds API UUID; for MLB Stats games it is gamePk.toString().
//
//   TOTAL COST: 2 Odds API quota units + 1 free MLB Stats API call.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchScores, fetchMLBStatsScores, type GameScore } from '@/lib/odds-api'
import { slugify, computeOutcomes, mlbGameDate } from '@/lib/ingestion'

export async function GET(req: NextRequest) {
  // ── 1. Token auth ──────────────────────────────────────────────────────────
  const token    = new URL(req.url).searchParams.get('token')
  const expected = process.env.INGESTION_ADMIN_TOKEN
  if (!expected || !token || token !== expected) {
    console.warn('[backfill-mlb] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  // ── 2. Open ingestion run ──────────────────────────────────────────────────
  let runId: string | null = null
  try {
    const { data: run, error } = await supabaseAdmin
      .from('ingestion_runs')
      .insert({ run_type: 'backfill', league_slug: 'mlb', status: 'running' })
      .select('id')
      .single()
    if (error) throw error
    runId = run.id
    console.log('[backfill-mlb] run_id:', runId)
  } catch (e) {
    console.error('[backfill-mlb] could not open ingestion_runs row (non-fatal):', e)
  }

  try {
    // ── 3. Resolve MLB league_id ──────────────────────────────────────────────
    const { data: league, error: leagueErr } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('slug', 'mlb')
      .single()
    if (leagueErr || !league) throw new Error('MLB league row not found — run the leagues seed first')
    const leagueId: string = league.id
    console.log('[backfill-mlb] league_id:', leagueId)

    // ── 4. Fetch scores from two sources and combine ──────────────────────────

    // Source A: Odds API /scores (days 1–3, 2 quota units)
    console.log('[backfill-mlb] [A] Odds API: fetching daysFrom=3...')
    const scoresResp = await fetchScores('baseball_mlb', 3)
    const oddsApiRemaining = scoresResp.remainingRequests
    console.log(`[backfill-mlb] [A] Odds API: ${scoresResp.data.length} games | quota remaining: ${oddsApiRemaining}`)

    // Source B: MLB Stats API (days 4–14, free)
    // Window: today-14 → today-4  (does not overlap with Odds API's days 1–3)
    const toDateStr = (d: Date): string =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    const now       = new Date()
    const histStart = new Date(now); histStart.setUTCDate(histStart.getUTCDate() - 14)
    const histEnd   = new Date(now); histEnd.setUTCDate(histEnd.getUTCDate() - 4)
    const histStartStr = toDateStr(histStart)
    const histEndStr   = toDateStr(histEnd)

    console.log(`[backfill-mlb] [B] MLB Stats API: fetching ${histStartStr} → ${histEndStr}...`)
    const mlbStatsGames = await fetchMLBStatsScores(histStartStr, histEndStr)
    console.log(`[backfill-mlb] [B] MLB Stats API: ${mlbStatsGames.length} final games`)

    // Combine and dedupe by external_id
    const seenIds = new Set<string>()
    const allGames: GameScore[] = []
    for (const g of [...scoresResp.data, ...mlbStatsGames]) {
      if (!seenIds.has(g.id)) { seenIds.add(g.id); allGames.push(g) }
    }
    console.log(`[backfill-mlb] combined: ${allGames.length} unique games across both sources`)

    type CompletedGame = GameScore & { scores: NonNullable<GameScore['scores']> }
    const completedGames = allGames.filter(
      (g): g is CompletedGame =>
        g.completed === true &&
        Array.isArray(g.scores) &&
        g.scores.length >= 2,
    )
    console.log(`[backfill-mlb] completed games with scores: ${completedGames.length}`)

    if (!completedGames.length) {
      const msg = 'No completed MLB games found in the last 14 days'
      if (runId) {
        await supabaseAdmin
          .from('ingestion_runs')
          .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: msg })
          .eq('id', runId)
      }
      return NextResponse.json({ success: false, error: msg, run_id: runId }, { status: 404 })
    }

    // ── 5. Batch upsert all unique teams (one round-trip) ─────────────────────
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
    console.log(`[backfill-mlb] upserting ${teamPayloads.length} unique teams...`)

    const { error: teamsErr } = await supabaseAdmin
      .from('teams')
      .upsert(teamPayloads, { onConflict: 'league_id,external_id', ignoreDuplicates: true })
    if (teamsErr) throw new Error(`teams batch upsert failed: ${teamsErr.message}`)

    // Fetch all team IDs in one query (ignoreDuplicates means existing rows
    // aren't returned by the upsert itself)
    const { data: teamRows, error: teamFetchErr } = await supabaseAdmin
      .from('teams')
      .select('id, slug')
      .in('slug', teamPayloads.map(t => t.slug))
      .eq('league_id', leagueId)
    if (teamFetchErr) throw new Error(`team ID fetch failed: ${teamFetchErr.message}`)

    const teamIdBySlug = new Map<string, string>(
      (teamRows ?? []).map(t => [t.slug as string, t.id as string]),
    )
    console.log(`[backfill-mlb] resolved ${teamIdBySlug.size} team IDs`)

    // ── 6. Pre-fetch existing game external_ids for accurate insert/update count
    const externalIds = completedGames.map(g => g.id)
    const { data: existingGames } = await supabaseAdmin
      .from('games')
      .select('external_id')
      .in('external_id', externalIds)
      .eq('league_id', leagueId)
    const existingExternalIds = new Set((existingGames ?? []).map(g => g.external_id as string))
    console.log(`[backfill-mlb] pre-existing games in DB: ${existingExternalIds.size}`)

    // ── 7. Process each game ──────────────────────────────────────────────────
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
        const gameDate  = mlbGameDate(game.commence_time)
        const season    = commence.getUTCFullYear()

        // Upsert game — update scores/status if already exists
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

        if (existingExternalIds.has(game.id)) {
          gamesUpdated++
        } else {
          gamesInserted++
        }

        // Compute outcomes — line is null so spread/OU remain null;
        // only moneyline_result is populated from scores
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
          `[backfill-mlb] failed game ${game.id} (${game.home_team} vs ${game.away_team}):`,
          gameErr instanceof Error ? gameErr.message : gameErr,
        )
      }
    }

    console.log(
      `[backfill-mlb] complete — inserted:${gamesInserted} updated:${gamesUpdated} failed:${gamesFailed}`,
    )

    // ── 8. Mark run success ───────────────────────────────────────────────────
    if (runId) {
      await supabaseAdmin
        .from('ingestion_runs')
        .update({
          status:         'success',
          completed_at:   new Date().toISOString(),
          games_inserted: gamesInserted,
          api_calls_used: 2,   // 1 Odds API + 1 MLB Stats
        })
        .eq('id', runId)
    }

    return NextResponse.json({
      success: true,
      run_id:  runId,
      summary: {
        odds_api_calls:       1,
        odds_api_quota_used:  2,
        odds_api_remaining:   oddsApiRemaining,
        mlb_stats_api_calls:  1,
        mlb_stats_cost:       'free',
        games_inserted:       gamesInserted,
        games_updated:        gamesUpdated,
        games_failed:         gamesFailed,
        teams_total:          teamIdBySlug.size,
        duration_seconds:     parseFloat(((Date.now() - startedAt) / 1000).toFixed(1)),
      },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[backfill-mlb] unhandled error:', msg)

    const updateRun = async () => {
      if (!runId) return
      try {
        await supabaseAdmin
          .from('ingestion_runs')
          .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: msg })
          .eq('id', runId)
      } catch { /* already in error path */ }
    }

    if (msg.includes('rate limited') || msg.includes('429')) {
      await updateRun()
      return NextResponse.json(
        { success: false, error: 'Odds API quota exhausted — check x-requests-remaining and retry tomorrow', run_id: runId },
        { status: 429 },
      )
    }
    if (msg.includes('invalid API key') || msg.includes('401')) {
      await updateRun()
      return NextResponse.json(
        { success: false, error: 'Odds API auth failed — verify THE_ODDS_API_KEY in Vercel env vars', run_id: runId },
        { status: 401 },
      )
    }

    await updateRun()
    return NextResponse.json({ success: false, error: msg, run_id: runId }, { status: 500 })
  }
}
