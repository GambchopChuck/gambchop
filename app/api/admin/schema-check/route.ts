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

  // ── Step 1: column names + types for games table ──────────────────────────
  const { data: cols, error: colsErr } = await supabaseAdmin
    .schema('information_schema' as never)
    .from('columns' as never)
    .select('column_name, data_type, udt_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'games')
    .order('ordinal_position' as never)

  // ── Step 2: dry-run — find games where Eastern date differs from stored date
  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceStr = since.toISOString().slice(0, 10)

  const { data: games, error: gamesErr } = await supabaseAdmin
    .from('games')
    .select('id, game_date, game_time, home_team_id, away_team_id, external_id')
    .gte('game_date', sinceStr)
    .not('game_time', 'is', null)
    .eq('league_id', (await supabaseAdmin.from('leagues').select('id').eq('slug', 'mlb').single()).data?.id ?? '')
    .order('game_date', { ascending: false })
    .limit(200)

  type GameRow = { id: string; game_date: string; game_time: string; external_id: string }
  const dryRun = ((games ?? []) as GameRow[]).map(g => {
    // game_time is timestamptz — parse it directly, no reconstruction needed
    const eastern = new Date(g.game_time).toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    })
    return {
      id:           g.id,
      external_id:  g.external_id,
      stored_date:  g.game_date,
      game_time:    g.game_time,
      eastern_date: eastern,
      needs_fix:    eastern !== g.game_date,
    }
  })

  const mismatches = dryRun.filter(r => r.needs_fix)

  return NextResponse.json({
    step1_schema:   colsErr ? { error: colsErr.message } : cols,
    step2_dry_run: {
      total_rows_checked: dryRun.length,
      mismatch_count:     mismatches.length,
      mismatches,
      error: gamesErr?.message ?? null,
    },
  })
}
