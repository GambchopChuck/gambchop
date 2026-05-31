// scripts/audit-ou-backfill.ts
//
// Read-only audit — flags final games where lines.total looks suspiciously high
// relative to the actual combined score, a signal the odds cron captured a
// live (in-game) line rather than a pre-game line.
//
// Does NOT write anything to the database.
//
// Run:
//   npx tsx --env-file=.env.local scripts/audit-ou-backfill.ts
//
// Output: scripts/output/ou-audit.csv

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// ─── Supabase ──────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  console.error('Run with: npx tsx --env-file=.env.local scripts/audit-ou-backfill.ts')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Suspicious logic ──────────────────────────────────────────────────────────
// A pre-game O/U total should have meaningful distance from the final score.
// If the stored total is within 1 run of the combined score (and > 10), it's
// very likely a live line was written — not a pre-game line.

function isSuspicious(storedTotal: number, combined: number): boolean {
  return storedTotal > 10 && storedTotal >= combined - 1
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function csvEscape(val: string | number | boolean | null | undefined): string {
  if (val == null) return ''
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

// ─── Paginated fetch helper ────────────────────────────────────────────────────

async function fetchAllGames() {
  const all: Array<{
    id: string
    game_date: string
    home_team_id: string
    away_team_id: string
    home_score: number
    away_score: number
  }> = []

  const PAGE = 1000
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('games')
      .select('id, game_date, home_team_id, away_team_id, home_score, away_score')
      .eq('status', 'final')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)
      .order('game_date', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) throw new Error(`games query: ${error.message}`)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  return all
}

// ─── Batched fetch helpers ─────────────────────────────────────────────────────

async function fetchLines(gameIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  for (let i = 0; i < gameIds.length; i += 50) {
    const batch = gameIds.slice(i, i + 50)
    const { data, error } = await supabase
      .from('lines')
      .select('game_id, total')
      .in('game_id', batch)
      .not('total', 'is', null)
    if (error) throw new Error(`lines query: ${error.message}`)
    for (const row of data ?? []) map.set(row.game_id, row.total)
  }
  return map
}

// Fetches the home-team outcome row for each game (was_home = true).
// Both home and away rows carry the same over_under_result; one is enough.
async function fetchOutcomes(gameIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  for (let i = 0; i < gameIds.length; i += 50) {
    const batch = gameIds.slice(i, i + 50)
    const { data, error } = await supabase
      .from('team_game_outcomes')
      .select('game_id, over_under_result')
      .in('game_id', batch)
      .eq('was_home', true)
    if (error) throw new Error(`outcomes query: ${error.message}`)
    for (const row of data ?? []) map.set(row.game_id, row.over_under_result ?? null)
  }
  return map
}

async function fetchTeamNames(teamIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (let i = 0; i < teamIds.length; i += 50) {
    const batch = teamIds.slice(i, i + 50)
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', batch)
    if (error) throw new Error(`teams query: ${error.message}`)
    for (const row of data ?? []) map.set(row.id, row.name)
  }
  return map
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== O/U Backfill Audit (read-only) ===\n')

  console.log('Fetching all final games with scores...')
  const games = await fetchAllGames()
  console.log(`  → ${games.length} final games\n`)

  if (games.length === 0) {
    console.log('Nothing to audit.')
    process.exit(0)
  }

  const gameIds = games.map(g => g.id)

  console.log('Fetching lines...')
  const linesByGameId = await fetchLines(gameIds)
  console.log(`  → ${linesByGameId.size} games have a stored total\n`)

  console.log('Fetching outcomes...')
  const outcomesByGameId = await fetchOutcomes(gameIds)
  console.log(`  → ${outcomesByGameId.size} home-team outcome rows found\n`)

  console.log('Fetching team names...')
  const teamIdSet = new Set<string>()
  for (const g of games) {
    teamIdSet.add(g.home_team_id)
    teamIdSet.add(g.away_team_id)
  }
  const teamNamesById = await fetchTeamNames(Array.from(teamIdSet))
  console.log(`  → ${teamNamesById.size} teams resolved\n`)

  // ── Build CSV ──────────────────────────────────────────────────────────────

  const header = 'game_date,home_team,away_team,home_score,away_score,combined,stored_total,recorded_result,suspicious'
  const csvRows: string[] = [header]
  let suspiciousCount = 0
  let skippedNoLine   = 0

  for (const game of games) {
    const storedTotal = linesByGameId.get(game.id) ?? null
    if (storedTotal == null) {
      skippedNoLine++
      continue  // per spec: only include games with a non-null total
    }

    const homeName       = teamNamesById.get(game.home_team_id) ?? `[${game.home_team_id}]`
    const awayName       = teamNamesById.get(game.away_team_id) ?? `[${game.away_team_id}]`
    const combined       = game.home_score + game.away_score
    const recordedResult = outcomesByGameId.get(game.id) ?? null
    const suspicious     = isSuspicious(storedTotal, combined)

    if (suspicious) suspiciousCount++

    csvRows.push(
      [
        csvEscape(game.game_date),
        csvEscape(homeName),
        csvEscape(awayName),
        csvEscape(game.home_score),
        csvEscape(game.away_score),
        csvEscape(combined),
        csvEscape(storedTotal),
        csvEscape(recordedResult),
        csvEscape(suspicious),
      ].join(','),
    )
  }

  // ── Write output ───────────────────────────────────────────────────────────

  const outDir  = join(process.cwd(), 'scripts', 'output')
  const outPath = join(outDir, 'ou-audit.csv')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(outPath, csvRows.join('\n'), 'utf8')

  console.log('=== Results ===')
  console.log(`  Total final games:         ${games.length}`)
  console.log(`  Skipped (no line stored):  ${skippedNoLine}`)
  console.log(`  Included in CSV:           ${csvRows.length - 1}`)
  console.log(`  Suspicious (live-line):    ${suspiciousCount}`)
  console.log(`\n  Output → ${outPath}`)

  if (suspiciousCount > 0) {
    console.log('\n  Suspicious games:')
    for (const row of csvRows.slice(1)) {
      if (row.endsWith(',true')) {
        const cols = row.split(',')
        // game_date,home,away,hs,as,combined,total,result,suspicious
        console.log(
          `    ${cols[0]}  ${cols[1]} vs ${cols[2]}  ` +
          `score: ${cols[3]}-${cols[4]} (combined ${cols[5]})  ` +
          `stored_total: ${cols[6]}  result: ${cols[7]}`,
        )
      }
    }
  }
}

main().catch(err => {
  console.error('\nFatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
