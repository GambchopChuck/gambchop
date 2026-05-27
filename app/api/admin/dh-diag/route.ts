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

  const { data: league } = await supabaseAdmin
    .from('leagues').select('id').eq('slug', 'mlb').single()
  const mlbId = league?.id as string
  if (!mlbId) return NextResponse.json({ error: 'MLB not found' }, { status: 500 })

  // ── 1. Find all dates with more than 15 game rows (guaranteed doubleheader) ─
  const { data: allGames } = await supabaseAdmin
    .from('games')
    .select('id, game_date, game_time, external_id, home_team_id, away_team_id, status')
    .eq('league_id', mlbId)
    .eq('status', 'final')
    .gte('game_date', '2026-04-01')
    .order('game_date', { ascending: false })

  type G = { id: string; game_date: string; game_time: string; external_id: string; home_team_id: string; away_team_id: string }
  const rows = (allGames ?? []) as G[]

  // Group by game_date, find dates with >15 games
  const byDate = new Map<string, G[]>()
  for (const g of rows) {
    if (!byDate.has(g.game_date)) byDate.set(g.game_date, [])
    byDate.get(g.game_date)!.push(g)
  }
  const dhDates = Array.from(byDate.entries())
    .filter(([, gs]) => gs.length > 15)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5)
    .map(([date, gs]) => ({ date, count: gs.length }))

  // ── 2. Find specific team-level doubleheaders (same team_id, same game_date) ─
  // Build team → [game_ids per date] map
  const teamDateMap = new Map<string, Map<string, G[]>>() // team_id → date → games
  for (const g of rows) {
    for (const tid of [g.home_team_id, g.away_team_id]) {
      if (!teamDateMap.has(tid)) teamDateMap.set(tid, new Map())
      const dateMap = teamDateMap.get(tid)!
      if (!dateMap.has(g.game_date)) dateMap.set(g.game_date, [])
      dateMap.get(g.game_date)!.push(g)
    }
  }

  // Find team+date combos with 2 games
  const doubleheaders: Array<{
    team_id: string; date: string
    g1: { id: string; game_time: string; external_id: string }
    g2: { id: string; game_time: string; external_id: string }
  }> = []
  for (const [tid, dateMap] of teamDateMap) {
    for (const [date, games] of dateMap) {
      if (games.length >= 2) {
        const sorted = games.sort((a, b) => a.game_time.localeCompare(b.game_time))
        doubleheaders.push({
          team_id: tid,
          date,
          g1: { id: sorted[0].id, game_time: sorted[0].game_time, external_id: sorted[0].external_id },
          g2: { id: sorted[1].id, game_time: sorted[1].game_time, external_id: sorted[1].external_id },
        })
      }
    }
  }
  doubleheaders.sort((a, b) => b.date.localeCompare(a.date))
  const recentDH = doubleheaders.slice(0, 10)

  // ── 3. For the most recent doubleheader — verify team_game_outcomes ─────────
  let outcomeCheck = null
  if (recentDH.length > 0) {
    const dh = recentDH[0]
    const { data: outcomesG1 } = await supabaseAdmin
      .from('team_game_outcomes')
      .select('id, game_id, team_id, moneyline_result')
      .eq('game_id', dh.g1.id)
      .eq('team_id', dh.team_id)
    const { data: outcomesG2 } = await supabaseAdmin
      .from('team_game_outcomes')
      .select('id, game_id, team_id, moneyline_result')
      .eq('game_id', dh.g2.id)
      .eq('team_id', dh.team_id)

    // Get team name
    const { data: teamRow } = await supabaseAdmin
      .from('teams').select('name, slug').eq('id', dh.team_id).single()

    outcomeCheck = {
      team: teamRow,
      date: dh.date,
      game1: { ...dh.g1, outcomes: outcomesG1 ?? [] },
      game2: { ...dh.g2, outcomes: outcomesG2 ?? [] },
    }
  }

  // ── 4. Baltimore Orioles full May 2026 moneyline history, ordered by (game_date, game_time) ─
  const { data: oriolesTeamRow } = await supabaseAdmin
    .from('teams').select('id, name').eq('slug', 'baltimore-orioles').single()
  let oriolesHistory = null
  if (oriolesTeamRow) {
    const { data: oriolesGames } = await supabaseAdmin
      .from('games')
      .select('id, game_date, game_time, external_id')
      .eq('league_id', mlbId)
      .eq('status', 'final')
      .gte('game_date', '2026-05-01')
      .lte('game_date', '2026-05-31')
      .or(`home_team_id.eq.${oriolesTeamRow.id},away_team_id.eq.${oriolesTeamRow.id}`)
      .order('game_date', { ascending: true })
      .order('game_time', { ascending: true })
    if (oriolesGames) {
      const gameIds = oriolesGames.map(g => g.id)
      const { data: oriolesOutcomes } = await supabaseAdmin
        .from('team_game_outcomes')
        .select('game_id, moneyline_result, was_home, own_score, opponent_score')
        .eq('team_id', oriolesTeamRow.id)
        .in('game_id', gameIds)
      const outcomeMap = new Map((oriolesOutcomes ?? []).map(o => [o.game_id, o]))
      oriolesHistory = oriolesGames.map(g => ({
        game_date:        g.game_date,
        game_time:        g.game_time,
        moneyline_result: outcomeMap.get(g.id)?.moneyline_result ?? null,
        was_home:         outcomeMap.get(g.id)?.was_home ?? null,
        own_score:        outcomeMap.get(g.id)?.own_score ?? null,
        opponent_score:   outcomeMap.get(g.id)?.opponent_score ?? null,
      }))
    }
  }

  return NextResponse.json({
    dates_with_doubleheaders: dhDates,
    team_doubleheaders_count: doubleheaders.length,
    recent_doubleheaders: recentDH,
    outcome_verification: outcomeCheck,
    orioles_may_history: oriolesHistory,
  })
}
