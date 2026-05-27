export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const token    = new URL(req.url).searchParams.get('token')
  const expected = process.env.INGESTION_ADMIN_TOKEN
  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  // ── 1. Resolve mlb league_id ──────────────────────────────────────────────
  const { data: league } = await supabaseAdmin
    .from('leagues').select('id').eq('slug', 'mlb').single()
  const mlbId = league?.id as string | undefined
  if (!mlbId) return NextResponse.json({ error: 'MLB league not found' }, { status: 500 })

  // ── 2. Run the UPDATE migration ───────────────────────────────────────────
  // game_time is timestamptz — convert directly to Eastern calendar date
  const { data: wrongRows, error: selectErr } = await supabaseAdmin
    .from('games')
    .select('id, game_date, game_time')
    .eq('league_id', mlbId)
    .gte('game_date', '2026-04-01')
    .not('game_time', 'is', null)

  if (selectErr) return NextResponse.json({ error: selectErr.message }, { status: 500 })

  type G = { id: string; game_date: string; game_time: string }
  const toFix = ((wrongRows ?? []) as G[]).filter(g => {
    const eastern = new Date(g.game_time).toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    })
    return eastern !== g.game_date
  })

  results.migration_candidates = toFix.length

  // Apply fixes one by one (Supabase JS client has no bulk UPDATE with per-row values)
  let fixed = 0
  const fixErrors: string[] = []
  for (const g of toFix) {
    const corrected = new Date(g.game_time).toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    })
    const { error } = await supabaseAdmin
      .from('games')
      .update({ game_date: corrected })
      .eq('id', g.id)
    if (error) fixErrors.push(`${g.id}: ${error.message}`)
    else fixed++
  }

  results.migration = { rows_fixed: fixed, errors: fixErrors }

  // ── 3. Verification — still_broken count ─────────────────────────────────
  const { data: allRows } = await supabaseAdmin
    .from('games')
    .select('id, game_date, game_time')
    .eq('league_id', mlbId)
    .gte('game_date', '2026-04-01')
    .not('game_time', 'is', null)

  const stillBroken = ((allRows ?? []) as G[]).filter(g => {
    const eastern = new Date(g.game_time).toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    })
    return eastern !== g.game_date
  })
  results.still_broken_count = stillBroken.length

  // ── 4. Athletics 5/25 game verification ──────────────────────────────────
  // Find teams that might be the Athletics
  const { data: atkTeam } = await supabaseAdmin
    .from('teams')
    .select('id, name, slug')
    .eq('league_id', mlbId)
    .or('name.ilike.%Athletics%,slug.ilike.%athletics%')
    .limit(5)

  results.athletics_teams = atkTeam ?? []

  if (atkTeam && atkTeam.length > 0) {
    const atkIds = atkTeam.map((t: { id: string }) => t.id)
    const { data: atkGames } = await supabaseAdmin
      .from('games')
      .select('id, game_date, game_time, home_team_id, away_team_id, external_id')
      .eq('league_id', mlbId)
      .or(`home_team_id.in.(${atkIds.join(',')}),away_team_id.in.(${atkIds.join(',')})`)
      .gte('game_date', '2026-05-23')
      .lte('game_date', '2026-05-28')
      .order('game_date', { ascending: true })
    results.athletics_recent_games = atkGames ?? []
  }

  // ── 5. team_game_outcomes column audit ───────────────────────────────────
  const { data: sampleOutcome } = await supabaseAdmin
    .from('team_game_outcomes')
    .select('*')
    .limit(1)
  results.team_game_outcomes_sample_keys = sampleOutcome?.[0]
    ? Object.keys(sampleOutcome[0])
    : []

  return NextResponse.json(results)
}
