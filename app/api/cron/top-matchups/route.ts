import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }            from '@/lib/supabase-admin'
import { getTopMatchupByLeague }    from '@/lib/topMatchups'

export const runtime     = 'nodejs'
export const maxDuration = 60

// Active leagues — expand as live odds data is wired up for additional sports
const ACTIVE_LEAGUES = ['mlb']

export async function GET(req: NextRequest) {
  // ── Auth — mirrors the pattern in app/api/cron/odds/route.ts ────────────────
  const authHeader = req.headers.get('authorization')
  const tokenParam = new URL(req.url).searchParams.get('token')
  const cronSecret = process.env.CRON_SECRET
  const adminToken = process.env.INGESTION_ADMIN_TOKEN

  const viaCron  = cronSecret && authHeader === `Bearer ${cronSecret}`
  const viaToken = adminToken && tokenParam === adminToken

  if (!viaCron && !viaToken) {
    console.warn('[top-matchups-cron] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  for (const league of ACTIVE_LEAGUES) {
    try {
      const matchup = await getTopMatchupByLeague(league)

      if (!matchup) {
        results[league] = 'no games today'
        continue
      }

      const { error } = await supabaseAdmin
        .from('top_matchups')
        .upsert(
          {
            league:         matchup.league,
            game_date:      matchup.gameDate,
            home_team:      matchup.homeTeam,
            away_team:      matchup.awayTeam,
            home_score:     matchup.homeScore,
            away_score:     matchup.awayScore,
            combined_score: matchup.combinedScore,
            home_form:      matchup.homeForm,
            away_form:      matchup.awayForm,
            lines:          matchup.lines,
          },
          { onConflict: 'league,game_date' },
        )

      if (error) {
        console.error(`[top-matchups-cron] upsert failed for ${league}:`, error.message)
        results[league] = `error: ${error.message}`
      } else {
        results[league] = `ok: ${matchup.awayTeam} @ ${matchup.homeTeam} (score: ${matchup.combinedScore.toFixed(3)})`
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[top-matchups-cron] exception for ${league}:`, msg)
      results[league] = `error: ${msg}`
    }
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() })
}
