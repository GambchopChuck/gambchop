export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchScores, fetchOdds, type Bookmaker } from '@/lib/odds-api'
import { slugify, computeOutcomes } from '@/lib/ingestion'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Pick a preferred bookmaker from a list (falls back to first available)
const PREFERRED_BOOKS = ['draftkings', 'fanduel', 'betmgm', 'pointsbet']

function pickBookmaker(bookmakers: Bookmaker[]) {
  return (
    PREFERRED_BOOKS.map(k => bookmakers.find(b => b.key === k)).find(Boolean) ??
    bookmakers[0]
  )
}

// ─── GET /api/admin/ingest-test?token=... ─────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── 1. Token auth ──────────────────────────────────────────────────────────
  const token = new URL(req.url).searchParams.get('token')
  const expected = process.env.INGESTION_ADMIN_TOKEN
  if (!expected || !token || token !== expected) {
    console.warn('[ingest-test] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Open ingestion run ──────────────────────────────────────────────────
  let runId: string | null = null
  try {
    const { data: run, error: runErr } = await supabaseAdmin
      .from('ingestion_runs')
      .insert({ run_type: 'manual', league_slug: 'mlb', status: 'running' })
      .select('id')
      .single()
    if (runErr) throw runErr
    runId = run.id
    console.log('[ingest-test] run_id:', runId)
  } catch (e) {
    console.error('[ingest-test] failed to open ingestion_runs row:', e)
    // Non-fatal — continue without a run log
  }

  try {
    // ── 3. Resolve MLB league_id ─────────────────────────────────────────────
    const { data: league, error: leagueErr } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('slug', 'mlb')
      .single()
    if (leagueErr || !league) throw new Error('MLB league row not found — run the leagues seed first')
    const leagueId: string = league.id
    console.log('[ingest-test] league_id:', leagueId)

    // ── 4. Fetch recent scores ────────────────────────────────────────────────
    console.log('[ingest-test] fetching scores (daysFrom=3)...')
    const scoresResp = await fetchScores('baseball_mlb', 3)
    const completedGames = scoresResp.data.filter(
      g => g.completed && Array.isArray(g.scores) && g.scores.length >= 2,
    )
    console.log(`[ingest-test] total games in window: ${scoresResp.data.length}, completed: ${completedGames.length}`)
    if (!completedGames.length) {
      throw new Error('No completed MLB games found in the last 3 days — try increasing daysFrom or wait for games to finish')
    }

    const game = completedGames[0]
    console.log(`[ingest-test] selected game: ${game.id} | ${game.home_team} vs ${game.away_team} | ${game.commence_time}`)

    const homeScoreEntry = game.scores!.find(s => s.name === game.home_team)
    const awayScoreEntry = game.scores!.find(s => s.name === game.away_team)
    if (!homeScoreEntry || !awayScoreEntry) throw new Error(`Could not parse scores for game ${game.id}`)
    const homeScore = parseInt(homeScoreEntry.score, 10)
    const awayScore = parseInt(awayScoreEntry.score, 10)
    console.log(`[ingest-test] scores: ${game.home_team} ${homeScore} — ${game.away_team} ${awayScore}`)

    // ── 5. Fetch odds and try to find matching line ────────────────────────────
    console.log('[ingest-test] fetching odds...')
    const oddsResp = await fetchOdds('baseball_mlb')
    const matchingOdds = oddsResp.data.find(g => g.id === game.id)
    const apiRemaining = oddsResp.remainingRequests

    let lineData: {
      ml_home:     number | null
      ml_away:     number | null
      spread_home: number | null
      spread_away: number | null
      total:       number | null
      bookmaker:   string
    } | null = null

    if (!matchingOdds || !matchingOdds.bookmakers.length) {
      console.log('[ingest-test] no live odds available for this game (already completed) — skipping lines row')
    } else {
      const bm = pickBookmaker(matchingOdds.bookmakers)!
      console.log(`[ingest-test] using bookmaker: ${bm.key}`)

      const h2h     = bm.markets.find(m => m.key === 'h2h')
      const spreads = bm.markets.find(m => m.key === 'spreads')
      const totals  = bm.markets.find(m => m.key === 'totals')

      lineData = {
        ml_home:     h2h?.outcomes.find(o => o.name === game.home_team)?.price ?? null,
        ml_away:     h2h?.outcomes.find(o => o.name === game.away_team)?.price ?? null,
        spread_home: spreads?.outcomes.find(o => o.name === game.home_team)?.point ?? null,
        spread_away: spreads?.outcomes.find(o => o.name === game.away_team)?.point ?? null,
        total:       totals?.outcomes.find(o => o.name === 'Over')?.point ?? null,
        bookmaker:   bm.key,
      }
      console.log('[ingest-test] line:', JSON.stringify(lineData))
    }

    // ── 6. Upsert teams ───────────────────────────────────────────────────────
    const homeSlug = slugify(game.home_team)
    const awaySlug = slugify(game.away_team)

    const { error: teamsErr } = await supabaseAdmin
      .from('teams')
      .upsert(
        [
          { league_id: leagueId, external_id: homeSlug, name: game.home_team, slug: homeSlug },
          { league_id: leagueId, external_id: awaySlug, name: game.away_team, slug: awaySlug },
        ],
        { onConflict: 'league_id,external_id', ignoreDuplicates: true },
      )
    if (teamsErr) throw new Error(`teams upsert failed: ${teamsErr.message}`)

    // Fetch the team rows (ignoreDuplicates means existing rows aren't returned by upsert)
    const { data: teamRows, error: teamFetchErr } = await supabaseAdmin
      .from('teams')
      .select('id, name, slug')
      .in('slug', [homeSlug, awaySlug])
      .eq('league_id', leagueId)
    if (teamFetchErr) throw new Error(`team fetch failed: ${teamFetchErr.message}`)

    const homeTeam = teamRows?.find(t => t.slug === homeSlug)
    const awayTeam = teamRows?.find(t => t.slug === awaySlug)
    if (!homeTeam || !awayTeam) throw new Error('Team IDs could not be resolved after upsert')
    console.log(`[ingest-test] home team id: ${homeTeam.id} | away team id: ${awayTeam.id}`)

    // ── 7. Parse game date / time / season ────────────────────────────────────
    const commence  = new Date(game.commence_time)
    const gameDate  = commence.toISOString().slice(0, 10)           // YYYY-MM-DD
    const gameTime  = game.commence_time                            // full ISO 8601 timestamptz
    const season    = commence.getUTCFullYear()

    // ── 8. Upsert game ────────────────────────────────────────────────────────
    const { data: gameRow, error: gameErr } = await supabaseAdmin
      .from('games')
      .upsert(
        {
          league_id:    leagueId,
          external_id:  game.id,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          game_date:    gameDate,
          game_time:    gameTime,
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
    if (gameErr) throw new Error(`game upsert failed: ${gameErr.message}`)
    const gameId: string = gameRow.id
    console.log('[ingest-test] game_id:', gameId)

    // ── 9. Insert line if available ───────────────────────────────────────────
    if (lineData) {
      const { error: lineErr } = await supabaseAdmin
        .from('lines')
        .upsert(
          {
            game_id:     gameId,
            ml_home:     lineData.ml_home,
            ml_away:     lineData.ml_away,
            spread_home: lineData.spread_home,
            spread_away: lineData.spread_away,
            total:       lineData.total,
            bookmaker:   lineData.bookmaker,
            captured_at: new Date().toISOString(),
          },
          { onConflict: 'game_id' },
        )
      if (lineErr) throw new Error(`line upsert failed: ${lineErr.message}`)
      console.log('[ingest-test] line upserted')
    }

    // ── 10. Compute and upsert outcomes ───────────────────────────────────────
    const outcomes = computeOutcomes(
      { home_team: game.home_team, away_team: game.away_team, home_score: homeScore, away_score: awayScore },
      lineData,
    )

    const outcomeRows = outcomes.map(o => ({
      game_id:             gameId,
      team_id:             o.team_name === game.home_team ? homeTeam.id : awayTeam.id,
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
    if (outcomeErr) throw new Error(`outcomes upsert failed: ${outcomeErr.message}`)
    console.log('[ingest-test] outcomes upserted')

    // ── 11. Mark run success ──────────────────────────────────────────────────
    if (runId) {
      await supabaseAdmin
        .from('ingestion_runs')
        .update({ status: 'success', completed_at: new Date().toISOString(), games_inserted: 1, api_calls_used: 2 })
        .eq('id', runId)
    }

    console.log('[ingest-test] SUCCESS')
    return NextResponse.json({
      success:       true,
      run_id:        runId,
      api_remaining: apiRemaining,
      game: {
        id:          gameId,
        external_id: game.id,
        date:        gameDate,
        home_team:   game.home_team,
        away_team:   game.away_team,
        home_score:  homeScore,
        away_score:  awayScore,
      },
      teams_inserted: [
        { id: homeTeam.id, name: homeTeam.name, slug: homeSlug },
        { id: awayTeam.id, name: awayTeam.name, slug: awaySlug },
      ],
      line:     lineData,
      outcomes: outcomeRows,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ingest-test] ERROR:', msg)
    if (runId) {
      try {
        await supabaseAdmin
          .from('ingestion_runs')
          .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: msg })
          .eq('id', runId)
      } catch (e) {
        console.error('[ingest-test] failed to update run to failed:', e)
      }
    }
    return NextResponse.json({ success: false, error: msg, run_id: runId }, { status: 500 })
  }
}
