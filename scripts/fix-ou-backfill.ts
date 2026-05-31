// scripts/fix-ou-backfill.ts
//
// Fixes over_under_result (and lines.total for Category B) in two passes:
//
//   Category A — 21 suspicious games from scripts/output/ou-audit.csv
//                Re-computes over_under_result using real scores vs stored total.
//                Does NOT touch lines.total for these games.
//
//   Category B — Cubs/Cardinals 5/30 (game_id hardcoded)
//                Corrects lines.total from 5.5 → 8.0
//                Corrects over_under_result from 'over' → 'under' on both team rows
//
// Dry run by default — pass --confirm to write to the database.
//
// Run:
//   npx tsx --env-file=.env.local scripts/fix-ou-backfill.ts
//   npx tsx --env-file=.env.local scripts/fix-ou-backfill.ts --confirm

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join }         from 'path'

// ── Runtime flags ─────────────────────────────────────────────────────────────

const CONFIRM = process.argv.includes('--confirm')

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Run with: npx tsx --env-file=.env.local scripts/fix-ou-backfill.ts')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Category B constants (hardcoded correction) ───────────────────────────────

const CAT_B_GAME_ID    = 'c9957e53-405f-4907-954d-7f2a78ee7d98'
const CAT_B_NEW_TOTAL  = 8.0
const CAT_B_NEW_RESULT = 'under' as const
const CAT_B_LABEL      = '2026-05-30 St. Louis Cardinals (home) vs Chicago Cubs'

// ── O/U re-computation ────────────────────────────────────────────────────────

function recomputeOU(homeScore: number, awayScore: number, total: number): 'over' | 'under' | 'push' {
  const combined = homeScore + awayScore
  if (combined > total)  return 'over'
  if (combined < total)  return 'under'
  return 'push'
}

// ── CSV parsing ───────────────────────────────────────────────────────────────
// Reads the audit output and returns only the suspicious=true rows.
// Columns: game_date,home_team,away_team,home_score,away_score,combined,
//          stored_total,recorded_result,suspicious

type AuditRow = {
  game_date:       string
  home_team:       string
  away_team:       string
  home_score:      number
  away_score:      number
  combined:        number
  stored_total:    number
  recorded_result: string | null
}

function parseSuspiciousRows(): AuditRow[] {
  const csvPath = join(process.cwd(), 'scripts', 'output', 'ou-audit.csv')
  const raw     = readFileSync(csvPath, 'utf8')
  return raw
    .trim()
    .split('\n')
    .slice(1)                    // drop header
    .map(l => l.trim())
    .filter(l => l.endsWith(',true'))
    .map(line => {
      const c = line.split(',')
      return {
        game_date:       c[0],
        home_team:       c[1],
        away_team:       c[2],
        home_score:      parseInt(c[3],  10),
        away_score:      parseInt(c[4],  10),
        combined:        parseInt(c[5],  10),
        stored_total:    parseFloat(c[6]),
        recorded_result: c[7] || null,
      }
    })
}

// ── DB helpers (read) ─────────────────────────────────────────────────────────

async function fetchTeamIdByName(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('teams').select('id, name')
  if (error) throw new Error(`teams fetch: ${error.message}`)
  return new Map((data ?? []).map(t => [t.name as string, t.id as string]))
}

async function lookupGameId(
  teamByName: Map<string, string>,
  gameDate:   string,
  homeName:   string,
  awayName:   string,
): Promise<string | null> {
  const homeId = teamByName.get(homeName)
  const awayId = teamByName.get(awayName)
  if (!homeId || !awayId) return null

  const { data, error } = await supabase
    .from('games')
    .select('id')
    .eq('game_date',    gameDate)
    .eq('home_team_id', homeId)
    .eq('away_team_id', awayId)
    .single()
  if (error || !data) return null
  return data.id as string
}

async function fetchCurrentOUResult(gameId: string): Promise<string | null> {
  const { data } = await supabase
    .from('team_game_outcomes')
    .select('over_under_result')
    .eq('game_id', gameId)
    .eq('was_home', true)
    .maybeSingle()
  return (data?.over_under_result as string | null) ?? null
}

async function fetchCurrentTotal(gameId: string): Promise<number | null> {
  const { data } = await supabase
    .from('lines')
    .select('total')
    .eq('game_id', gameId)
    .maybeSingle()
  return (data?.total as number | null) ?? null
}

// ── DB helpers (write) ────────────────────────────────────────────────────────
// updateOUResult touches ONLY over_under_result on team_game_outcomes.
// Both home and away rows are updated (same value for the same game).

async function updateOUResult(gameId: string, newResult: string): Promise<void> {
  const { error } = await supabase
    .from('team_game_outcomes')
    .update({ over_under_result: newResult })
    .eq('game_id', gameId)
  if (error) throw new Error(`update team_game_outcomes: ${error.message}`)
}

// updateLinesTotal touches ONLY lines.total — used for Category B only.
async function updateLinesTotal(gameId: string, newTotal: number): Promise<void> {
  const { error } = await supabase
    .from('lines')
    .update({ total: newTotal })
    .eq('game_id', gameId)
  if (error) throw new Error(`update lines: ${error.message}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

type StagedChange = {
  label:           string
  category:        'A' | 'B'
  game_id:         string
  stored_total:    number
  combined:        number
  old_ou_result:   string | null
  new_ou_result:   string | null   // null = no change needed
  new_lines_total: number  | null  // non-null only for Category B
}

async function main() {
  const mode = CONFIRM ? 'LIVE — WRITING TO DB' : 'DRY RUN — no writes'
  console.log(`=== O/U Backfill Fix [${mode}] ===\n`)

  // ── Preload team map ─────────────────────────────────────────────────────────
  const teamByName = await fetchTeamIdByName()

  // ── Category A ───────────────────────────────────────────────────────────────
  const suspiciousRows = parseSuspiciousRows()
  console.log(`Category A — ${suspiciousRows.length} suspicious games\n`)

  const staged: StagedChange[] = []

  for (const row of suspiciousRows) {
    const label  = `${row.game_date} ${row.home_team} vs ${row.away_team}`
    const gameId = await lookupGameId(teamByName, row.game_date, row.home_team, row.away_team)

    if (!gameId) {
      console.log(`  [SKIP]        ${label} — game_id not found in DB`)
      continue
    }

    const correct = recomputeOU(row.home_score, row.away_score, row.stored_total)
    const changed = correct !== row.recorded_result

    if (changed) {
      console.log(
        `  [DRY RUN] CORRECTING [SUSPICIOUS_TOTAL]: ${label}` +
        ` — stored_total=${row.stored_total} combined=${row.combined}` +
        ` old=${row.recorded_result} new=${correct}`,
      )
      staged.push({
        label, category: 'A', game_id: gameId,
        stored_total:    row.stored_total,
        combined:        row.combined,
        old_ou_result:   row.recorded_result,
        new_ou_result:   correct,
        new_lines_total: null,
      })
    } else {
      console.log(
        `  [DRY RUN] NO_CHANGE [SUSPICIOUS_TOTAL]: ${label}` +
        ` — stored_total=${row.stored_total} combined=${row.combined}` +
        ` result=${row.recorded_result} (matches re-computation, no write needed)`,
      )
    }
  }

  // ── Category B ───────────────────────────────────────────────────────────────
  console.log(`\nCategory B — 1 hardcoded correction\n`)

  const catBCurrentTotal  = await fetchCurrentTotal(CAT_B_GAME_ID)
  const catBCurrentResult = await fetchCurrentOUResult(CAT_B_GAME_ID)

  console.log(
    `  [DRY RUN] CORRECTING [HARDCODED_FIX]: ${CAT_B_LABEL}` +
    `\n            lines.total:        ${catBCurrentTotal} → ${CAT_B_NEW_TOTAL}` +
    `\n            over_under_result:  ${catBCurrentResult} → ${CAT_B_NEW_RESULT} (both team rows)`,
  )

  staged.push({
    label:           CAT_B_LABEL,
    category:        'B',
    game_id:         CAT_B_GAME_ID,
    stored_total:    catBCurrentTotal ?? 0,
    combined:        7,   // Cardinals 1 + Cubs 6
    old_ou_result:   catBCurrentResult,
    new_ou_result:   CAT_B_NEW_RESULT,
    new_lines_total: CAT_B_NEW_TOTAL,
  })

  // ── Summary ──────────────────────────────────────────────────────────────────
  const catAChanges = staged.filter(s => s.category === 'A')
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Category A: ${suspiciousRows.length} suspicious games reviewed`)
  console.log(`            ${catAChanges.length} need over_under_result correction`)
  console.log(`Category B: 1 correction (lines.total + over_under_result)`)

  if (!CONFIRM) {
    console.log(`\n  Dry run complete. Re-run with --confirm to write all changes.\n`)
    return
  }

  // ── Apply changes ─────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log('Applying changes...\n')
  let written = 0
  let failed  = 0

  for (const chg of staged) {
    try {
      const needsOUUpdate    = chg.new_ou_result   !== null && chg.new_ou_result   !== chg.old_ou_result
      const needsTotalUpdate = chg.new_lines_total !== null

      if (needsOUUpdate) {
        await updateOUResult(chg.game_id, chg.new_ou_result!)
        console.log(`  [WRITTEN] ${chg.category} over_under_result → ${chg.new_ou_result}  (${chg.label})`)
      }
      if (needsTotalUpdate) {
        await updateLinesTotal(chg.game_id, chg.new_lines_total!)
        console.log(`  [WRITTEN] ${chg.category} lines.total → ${chg.new_lines_total}  (${chg.label})`)
      }
      written++
    } catch (err) {
      failed++
      console.error(`  [ERROR]   ${chg.label}: ${err instanceof Error ? err.message : err}`)
    }
  }

  // ── Verification ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log('Verifying written values...\n')

  for (const chg of staged) {
    const verifiedResult = await fetchCurrentOUResult(chg.game_id)

    if (chg.category === 'B') {
      const verifiedTotal = await fetchCurrentTotal(chg.game_id)
      const totalOk       = verifiedTotal  === chg.new_lines_total
      const resultOk      = verifiedResult === chg.new_ou_result
      const ok            = totalOk && resultOk
      console.log(
        `  [${ok ? 'OK  ' : 'FAIL'}] ${chg.label}` +
        `\n          lines.total=${verifiedTotal} (expected ${chg.new_lines_total}) ${totalOk ? '✓' : '✗'}` +
        `\n          over_under_result=${verifiedResult} (expected ${chg.new_ou_result}) ${resultOk ? '✓' : '✗'}`,
      )
    } else if (chg.new_ou_result !== null && chg.new_ou_result !== chg.old_ou_result) {
      const resultOk = verifiedResult === chg.new_ou_result
      console.log(
        `  [${resultOk ? 'OK  ' : 'FAIL'}] ${chg.label}` +
        `  over_under_result=${verifiedResult} (expected ${chg.new_ou_result}) ${resultOk ? '✓' : '✗'}`,
      )
    }
  }

  console.log(`\nDone. Written: ${written} | Failed: ${failed}\n`)
}

main().catch(err => {
  console.error('\nFatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
