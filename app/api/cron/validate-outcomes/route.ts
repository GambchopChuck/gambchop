export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

// ─── Nightly data quality validation cron ─────────────────────────────────────
//
// Runs at 4am UTC — after all ingestion jobs have completed.
// Checks the last 7 days of final games for score errors, bad lines, and
// O/U or ML mismatches, writing flags to data_quality_flags.
//
// Resolve flags manually in Supabase Studio:
//   update data_quality_flags set resolved_at = now() where id = '<id>';
// Or mark auto-resolved after a re-ingestion corrects the bad row.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateOutcomes } from '@/lib/data-quality/validate-outcomes'

export async function GET(req: NextRequest) {
  // ── Auth — Vercel Cron sends Authorization: Bearer <CRON_SECRET> ──────────
  const authHeader = req.headers.get('authorization')
  const tokenParam = new URL(req.url).searchParams.get('token')
  const cronSecret = process.env.CRON_SECRET
  const adminToken = process.env.INGESTION_ADMIN_TOKEN

  const viaCron  = cronSecret && authHeader === `Bearer ${cronSecret}`
  const viaToken = adminToken && tokenParam === adminToken

  if (!viaCron && !viaToken) {
    console.warn('[validate-outcomes] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  // ── Open an ingestion_runs row ───────────────────────────────────────────
  let runId: string | null = null
  try {
    const { data: run, error } = await supabaseAdmin
      .from('ingestion_runs')
      .insert({ run_type: 'validate_outcomes', league_slug: 'mlb', status: 'running' })
      .select('id')
      .single()
    if (error) throw error
    runId = run.id
    console.log('[validate-outcomes] run_id:', runId)
  } catch (e) {
    console.error('[validate-outcomes] could not open ingestion_runs row (non-fatal):', e)
  }

  try {
    // ── Run validation ───────────────────────────────────────────────────
    const summary = await validateOutcomes()

    const durationSeconds = parseFloat(((Date.now() - startedAt) / 1000).toFixed(1))

    console.log(
      `[validate-outcomes] complete — checked:${summary.checked} flagged:${summary.flagged} types:[${summary.flags.join(', ')}] duration:${durationSeconds}s`,
    )

    // ── Alert if any flags were written ─────────────────────────────────
    if (summary.flagged > 0) {
      // TODO: wire to email or Slack alert
      console.error(
        '[validate-outcomes] ⚠️  DATA QUALITY FLAGS WRITTEN',
        JSON.stringify({ flagged: summary.flagged, types: summary.flags }, null, 2),
      )
    }

    // ── Close ingestion_runs row ─────────────────────────────────────────
    if (runId) {
      await supabaseAdmin
        .from('ingestion_runs')
        .update({
          status:         'success',
          completed_at:   new Date().toISOString(),
          games_inserted: summary.flagged,   // reuse games_inserted to store flag count
          api_calls_used: 0,
        })
        .eq('id', runId)
    }

    return NextResponse.json({
      success:          true,
      duration_seconds: durationSeconds,
      ...summary,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[validate-outcomes] unhandled error:', msg)

    if (runId) {
      try {
        await supabaseAdmin
          .from('ingestion_runs')
          .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: msg })
          .eq('id', runId)
      } catch { /* already in error path */ }
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
