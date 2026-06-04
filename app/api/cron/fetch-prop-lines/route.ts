export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

// ─── Stage: Daily player prop lines ingestion ─────────────────────────────────
//
// Runs daily at 10am UTC via Vercel Cron.
// Fetches player prop lines from The Odds API for today's MLB games.
// Markets: batter_hits, batter_home_runs, batter_rbis, pitcher_strikeouts.
// Upserts into player_prop_lines — idempotent on (player_name, game_date, prop_type).
//
// COST: Odds API quota varies by number of events × bookmakers × markets.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { mlbGameDate } from '@/lib/ingestion'

const BOOKMAKER_PREFERENCE = ['draftkings', 'fanduel', 'betmgm']

const PROP_TYPE_MAP: Record<string, string> = {
  batter_hits:        'hits',
  batter_home_runs:   'home_runs',
  batter_rbis:        'rbis',
  pitcher_strikeouts: 'strikeouts',
}

// ─── Odds API response types ──────────────────────────────────────────────────

type PropOutcome = {
  name:         string    // 'Over' | 'Under'
  description?: string    // player name for prop markets
  price:        number
  point?:       number
}

type PropMarket = {
  key:      string
  outcomes: PropOutcome[]
}

type PropBookmaker = {
  key:      string
  markets:  PropMarket[]
}

type OddsGame = {
  id:            string
  home_team:     string
  away_team:     string
  commence_time: string
  bookmakers:    PropBookmaker[]
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const tokenParam = new URL(req.url).searchParams.get('token')
  const cronSecret = process.env.CRON_SECRET
  const adminToken = process.env.INGESTION_ADMIN_TOKEN

  const viaCron  = cronSecret && authHeader === `Bearer ${cronSecret}`
  const viaToken = adminToken && tokenParam === adminToken

  if (!viaCron && !viaToken) {
    console.warn('[fetch-prop-lines] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.THE_ODDS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'THE_ODDS_API_KEY not configured' }, { status: 500 })
  }

  const startedAt = Date.now()

  try {
    // Fetch player prop lines from Odds API
    const url = new URL('https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/')
    url.searchParams.set('apiKey',      apiKey)
    url.searchParams.set('regions',     'us')
    url.searchParams.set('markets',     'batter_hits,batter_home_runs,batter_rbis,pitcher_strikeouts')
    url.searchParams.set('oddsFormat',  'american')

    console.log('[fetch-prop-lines] calling Odds API...')
    const res = await fetch(url.toString(), { cache: 'no-store' })

    const remaining = res.headers.get('x-requests-remaining') ?? 'unknown'
    const used      = res.headers.get('x-requests-used')      ?? 'unknown'
    console.log(`[fetch-prop-lines] quota: remaining=${remaining} used=${used}`)

    if (res.status === 429) throw new Error('Odds API quota exhausted (429)')
    if (!res.ok)            throw new Error(`Odds API HTTP ${res.status}`)

    const games = await res.json() as OddsGame[]
    console.log(`[fetch-prop-lines] received ${games.length} games`)

    let upserted = 0
    let skipped  = 0

    for (const game of games) {
      const gameDate = mlbGameDate(game.commence_time)

      // Pick bookmaker by preference, else first available
      let book: PropBookmaker | null = null
      for (const pref of BOOKMAKER_PREFERENCE) {
        const found = game.bookmakers.find(b => b.key === pref)
        if (found) { book = found; break }
      }
      if (!book) book = game.bookmakers[0] ?? null
      if (!book) { skipped++; continue }

      for (const market of book.markets) {
        const propType = PROP_TYPE_MAP[market.key]
        if (!propType) continue

        // Group outcomes by player name (description field)
        const playerMap = new Map<string, { over?: PropOutcome; under?: PropOutcome }>()
        for (const outcome of market.outcomes) {
          const playerName = outcome.description
          if (!playerName) continue
          if (!playerMap.has(playerName)) playerMap.set(playerName, {})
          const entry = playerMap.get(playerName)!
          if (outcome.name === 'Over')  entry.over  = outcome
          if (outcome.name === 'Under') entry.under = outcome
        }

        for (const [playerName, { over, under }] of playerMap) {
          const line = over?.point ?? under?.point
          if (line == null) continue

          const row = {
            player_name: playerName,
            team_name:   `${game.home_team} @ ${game.away_team}`,
            game_date:   gameDate,
            game_id:     game.id,
            prop_type:   propType,
            line,
            over_odds:   over?.price  ?? null,
            under_odds:  under?.price ?? null,
            source:      'odds_api',
          }

          const { error } = await supabaseAdmin
            .from('player_prop_lines')
            .upsert(row, { onConflict: 'player_name,game_date,prop_type', ignoreDuplicates: false })

          if (error) {
            console.error(`[fetch-prop-lines] upsert error for ${playerName}:`, error.message)
            skipped++
          } else {
            upserted++
          }
        }
      }
    }

    const duration = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(`[fetch-prop-lines] done — upserted:${upserted} skipped:${skipped} duration:${duration}s`)

    return NextResponse.json({
      success: true,
      games_processed: games.length,
      props_upserted:  upserted,
      props_skipped:   skipped,
      duration_seconds: parseFloat(duration),
      quota_remaining: remaining,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[fetch-prop-lines] error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
