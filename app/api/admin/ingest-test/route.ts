export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchScores, fetchOdds, fetchMLBStatsScores, type Bookmaker } from '@/lib/odds-api'
import { slugify, computeOutcomes } from '@/lib/ingestion'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PREFERRED_BOOKS = ['draftkings', 'fanduel', 'betmgm', 'pointsbet']

function pickBookmaker(bookmakers: Bookmaker[]) {
  return (
    PREFERRED_BOOKS.map(k => bookmakers.find(b => b.key === k)).find(Boolean) ??
    bookmakers[0]
  )
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Match an Odds API team name against a set of MLB Stats team names.
// Strategy 1: normalized exact match.
// Strategy 2: last-word suffix match (handles "Yankees" → "New York Yankees").
// Returns { gamePk, mlbName, strategy } or null if no match.
function resolveTeamName(
  oddsName: string,
  mlbNames: string[],
): { mlbName: string; strategy: 'exact' | 'suffix' } | null {
  const normOdds = normalize(oddsName)

  // Strategy 1: exact normalized match
  const exact = mlbNames.find(n => normalize(n) === normOdds)
  if (exact) return { mlbName: exact, strategy: 'exact' }

  // Strategy 2: last-word suffix (e.g. Odds API "Yankees" matches "New York Yankees")
  const lastWord = normOdds.split(' ').pop() ?? ''
  if (lastWord.length >= 3) {
    const suffix = mlbNames.find(n => normalize(n).endsWith(lastWord))
    if (suffix) return { mlbName: suffix, strategy: 'suffix' }
  }

  return null
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

    // ── 4. Fetch recent scores via Odds API ───────────────────────────────────
    console.log('[ingest-test] fetching scores (daysFrom=3)...')
    const scoresResp = await fetchScores('baseball_mlb', 3)
    const completedGames = scoresResp.data.filter(
      g => g.completed && Array.isArray(g.scores) && g.scores.length >= 2,
    )
    console.log(`[ingest-test] total games in window: ${scoresResp.data.length}, completed: ${completedGames.length}`)
    if (!completedGames.length) {
      throw new Error('No completed MLB games found in the last 3 days')
    }

    const game = completedGames[0]
    const oddsApiId = game.id
    console.log(`[ingest-test] selected game: ${oddsApiId} | ${game.home_team} vs ${game.away_team} | ${game.commence_time}`)

    const homeScoreEntry = game.scores!.find(s => s.name === game.home_team)
    const awayScoreEntry = game.scores!.find(s => s.name === game.away_team)
    if (!homeScoreEntry || !awayScoreEntry) throw new Error(`Could not parse scores for game ${oddsApiId}`)
    const homeScore = parseInt(homeScoreEntry.score, 10)
    const awayScore = parseInt(awayScoreEntry.score, 10)
    console.log(`[ingest-test] scores: ${game.home_team} ${homeScore} — ${game.away_team} ${awayScore}`)

    // ── 5. Resolve gamePk from MLB Stats API ──────────────────────────────────
    // Use the game date as both start and end to fetch only that day's games.
    const gameDate = new Date(game.commence_time).toISOString().slice(0, 10)
    console.log(`[ingest-test] resolving gamePk via MLB Stats API for date: ${gameDate}...`)
    const mlbStatsGames = await fetchMLBStatsScores(gameDate, gameDate)

    const mlbHomeNames = mlbStatsGames.map(g => g.home_team)
    const mlbAwayNames = mlbStatsGames.map(g => g.away_team)
    const allMlbNames  = [...new Set([...mlbHomeNames, ...mlbAwayNames])]
    console.log(`[ingest-test] MLB Stats returned ${mlbStatsGames.length} games on ${gameDate}`)
    console.log(`[ingest-test] MLB Stats team names: ${allMlbNames.join(', ')}`)

    const homeMatch = resolveTeamName(game.home_team, allMlbNames)
    const awayMatch = resolveTeamName(game.away_team, allMlbNames)

    if (!homeMatch) {
      throw new Error(
        `Could not resolve gamePk: home team "${game.home_team}" had no match among MLB Stats teams on ${gameDate}. ` +
        `Available: ${allMlbNames.join(', ')}`
      )
    }
    if (!awayMatch) {
      throw new Error(
        `Could not resolve gamePk: away team "${game.away_team}" had no match among MLB Stats teams on ${gameDate}. ` +
        `Available: ${allMlbNames.join(', ')}`
      )
    }

    console.log(`[ingest-test] home match: "${game.home_team}" → "${homeMatch.mlbName}" (${homeMatch.strategy})`)
    console.log(`[ingest-test] away match: "${game.away_team}" → "${awayMatch.mlbName}" (${awayMatch.strategy})`)

    const matchingMlbGame = mlbStatsGames.find(
      g => normalize(g.home_team) === normalize(homeMatch.mlbName) &&
           normalize(g.away_team) === normalize(awayMatch.mlbName),
    )
    if (!matchingMlbGame) {
      throw new Error(
        `Could not resolve gamePk: found team name matches but no MLB Stats game pairs ` +
        `"${homeMatch.mlbName}" (home) vs "${awayMatch.mlbName}" (away) on ${gameDate}`
      )
    }

    const gamePk = matchingMlbGame.id   // already gamePk.toString() from fetchMLBStatsScores
    console.log(`[ingest-test] resolved gamePk: ${gamePk} (Odds API id: ${oddsApiId})`)

    // ── 6. Fetch odds and try to find matching line ────────────────────────────
    console.log('[ingest-test] fetching odds...')
    const oddsResp = await fetchOdds('baseball_mlb')
    const matchingOdds = oddsResp.data.find(g => g.id === oddsApiId)
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

    // ── 7. Upsert teams ───────────────────────────────────────────────────────
    // Use MLB Stats team names (authoritative) for the slug/name fields.
    const homeOfficialName = homeMatch.mlbName
    const awayOfficialName = awayMatch.mlbName
    const homeSlug = slugify(homeOfficialName)
    const awaySlug = slugify(awayOfficialName)

    const { error: teamsErr } = await supabaseAdmin
      .from('teams')
      .upsert(
        [
          { league_id: leagueId, external_id: homeSlug, name: homeOfficialName, slug: homeSlug },
          { league_id: leagueId, external_id: awaySlug, name: awayOfficialName, slug: awaySlug },
        ],
        { onConflict: 'league_id,external_id', ignoreDuplicates: true },
      )
    if (teamsErr) throw new Error(`teams upsert failed: ${teamsErr.message}`)

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

    // ── 8. Parse game date / time / season ────────────────────────────────────
    const commence = new Date(game.commence_time)
    const season   = commence.getUTCFullYear()

    // ── 9. Upsert game — external_id = gamePk, odds_api_id = Odds API UUID ────
    const { data: gameRow, error: gameErr } = await supabaseAdmin
      .from('games')
      .upsert(
        {
          league_id:    leagueId,
          external_id:  gamePk,
          odds_api_id:  oddsApiId,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
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
    if (gameErr) throw new Error(`game upsert failed: ${gameErr.message}`)
    const gameId: string = gameRow.id
    console.log('[ingest-test] game_id:', gameId)

    // ── 10. Insert line if available ──────────────────────────────────────────
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

    // ── 11. Compute and upsert outcomes ───────────────────────────────────────
    const outcomes = computeOutcomes(
      { home_team: homeOfficialName, away_team: awayOfficialName, home_score: homeScore, away_score: awayScore },
      lineData,
    )

    const outcomeRows = outcomes.map(o => ({
      game_id:             gameId,
      team_id:             o.team_name === homeOfficialName ? homeTeam.id : awayTeam.id,
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

    // ── 12. Mark run success ──────────────────────────────────────────────────
    if (runId) {
      await supabaseAdmin
        .from('ingestion_runs')
        .update({ status: 'success', completed_at: new Date().toISOString(), games_inserted: 1, api_calls_used: 3 })
        .eq('id', runId)
    }

    console.log('[ingest-test] SUCCESS')
    return NextResponse.json({
      success:       true,
      run_id:        runId,
      api_remaining: apiRemaining,
      game: {
        id:          gameId,
        external_id: gamePk,
        odds_api_id: oddsApiId,
        date:        gameDate,
        home_team:   homeOfficialName,
        away_team:   awayOfficialName,
        home_score:  homeScore,
        away_score:  awayScore,
        gamePk_match_strategy: {
          home: homeMatch.strategy,
          away: awayMatch.strategy,
        },
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
