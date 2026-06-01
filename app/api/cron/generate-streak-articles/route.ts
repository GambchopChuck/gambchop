export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

// Queries team_game_outcomes for all season outcomes in one pass, then computes
// five priority tiers to guarantee at least TARGET_COUNT articles per day:
//   1. Active streaks of 5+ consecutive same-direction outcomes
//   2. Notable season win-rate records (best/worst by league)
//   3. Recent reversals — 4+ streaks that ended in the last 7 days
//   4. League leaders — top-3 by wins/covers/overs this calendar month
//   5. Performance shifts — teams that flipped form in last 5 vs previous 5
// Each article gets an inline SVG chart strip (last 10 outcome cells).
// Runs daily at 7am UTC via Vercel cron.
// Protected by CRON_SECRET (Vercel-managed) or INGESTION_ADMIN_TOKEN (local dev).

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

const anthropic    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MIN_STREAK   = 5
const TARGET_COUNT = 10

const LEAGUE_TARGETS: Record<string, number> = {
  MLB: 3, NBA: 2, NFL: 3, NHL: 2, WNBA: 3,
}

const BET_LABELS: Record<string, string> = {
  moneyline:  'moneyline (straight-up win/loss)',
  spread:     'against the spread',
  over_under: 'over/under',
}

const CELL_COLORS: Record<string, string> = {
  win:   '#4ade80',
  loss:  '#ef4444',
  over:  '#a855f7',
  under: '#7dd3fc',
  push:  '#fbbf24',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type OutcomeCell  = { result: string; date: string }
type ArticleType  = 'streak' | 'record' | 'reversal' | 'leader'

type ArticleCandidate = {
  teamId:          string
  teamName:        string
  league:          string
  betType:         string
  articleType:     ArticleType
  streakLength:    number
  streakDirection: string
  recentOutcomes:  OutcomeCell[]
  promptContext:   string
}

type BetEntry     = { result: string | null; date: string }
type TeamBetData  = { teamId: string; teamName: string; league: string; entries: BetEntry[] }
type DataMap      = Record<string, Map<string, TeamBetData>>

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const adminToken = process.env.INGESTION_ADMIN_TOKEN
  const tokenParam = new URL(req.url).searchParams.get('token')

  const viaCron  = cronSecret && authHeader === `Bearer ${cronSecret}`
  const viaToken = adminToken && tokenParam === adminToken
  if (!viaCron && !viaToken) {
    console.warn('[streak-articles] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt   = Date.now()
  const currentYear = new Date().getUTCFullYear()
  const seasonStart = `${currentYear}-03-01`

  // ── 1. Single query — all season outcomes sorted team/date desc ─────────────
  const { data: rawRows, error: queryErr } = await supabaseAdmin
    .from('team_game_outcomes')
    .select(
      `team_id, moneyline_result, spread_result, over_under_result,
       games!inner(game_date), teams!inner(name, leagues!inner(name))`
    )
    .gte('games.game_date', seasonStart)
    .order('team_id', { ascending: true })
    .order('game_date', { ascending: false, foreignTable: 'games' })

  if (queryErr) {
    console.error('[streak-articles] query error:', queryErr.message)
    return NextResponse.json({ error: queryErr.message }, { status: 500 })
  }

  const rows = rawRows ?? []
  console.log(`[streak-articles] fetched ${rows.length} outcome rows`)

  // ── 2. Build data map: betType → teamId → entries (date desc) ───────────────
  const dm = buildDataMap(rows)

  // ── 3. Compute candidates for all five priorities ───────────────────────────
  const streaks   = findStreaks(dm, MIN_STREAK)
  const records   = findRecords(dm)
  const reversals = findReversals(dm, 7)
  const leaders   = findLeaders(dm)
  const shifts    = findPerformanceShifts(dm)

  console.log(
    `[streak-articles] candidates: streak=${streaks.length} ` +
    `record=${records.length} reversal=${reversals.length} ` +
    `leader=${leaders.length} shift=${shifts.length}`
  )

  // ── 4. Select using priority order + deduplication ─────────────────────────
  const selected = selectArticles(streaks, records, reversals, leaders, shifts)
  console.log(`[streak-articles] selected ${selected.length} to generate`)

  // ── 5. Generate SVG + Claude article for each ───────────────────────────────
  const dbRows: object[] = []
  let generated = 0

  for (const c of selected) {
    try {
      const { headline, body } = await generateArticle(c)
      dbRows.push({
        team_name:        c.teamName,
        league:           c.league,
        bet_type:         c.betType,
        streak_length:    c.streakLength,
        streak_direction: c.streakDirection,
        headline,
        body,
        outcome_cells:    c.recentOutcomes,
        article_type:     c.articleType,
        chart_svg:        buildSvg(c.recentOutcomes),
        generated_at:     new Date().toISOString(),
      })
      generated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[streak-articles] Claude error for ${c.teamName}/${c.betType}: ${msg}`)
    }
  }

  // ── 6. Upsert — replaces existing article for same team+bet_type ────────────
  if (dbRows.length > 0) {
    const { error: upsertErr } = await supabaseAdmin
      .from('streak_articles')
      .upsert(dbRows, { onConflict: 'team_name,bet_type', ignoreDuplicates: false })

    if (upsertErr) {
      console.error('[streak-articles] upsert error:', upsertErr.message)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }
  }

  const duration = parseFloat(((Date.now() - startedAt) / 1000).toFixed(1))
  console.log(`[streak-articles] done — generated:${generated} duration:${duration}s`)
  return NextResponse.json({ success: true, generated, duration_seconds: duration })
}

// ─── Data map ─────────────────────────────────────────────────────────────────

function buildDataMap(rows: any[]): DataMap {
  const dm: DataMap = {
    moneyline:  new Map(),
    spread:     new Map(),
    over_under: new Map(),
  }
  const COL: Record<string, string> = {
    moneyline: 'moneyline_result', spread: 'spread_result', over_under: 'over_under_result',
  }

  for (const row of rows) {
    const gObj = row.games
    const date = Array.isArray(gObj) ? gObj[0]?.game_date : gObj?.game_date
    if (!date) continue

    const tObj     = row.teams
    const teamName = Array.isArray(tObj) ? tObj[0]?.name : tObj?.name
    const lObj     = Array.isArray(tObj) ? tObj[0]?.leagues : tObj?.leagues
    const league   = Array.isArray(lObj) ? lObj[0]?.name : lObj?.name
    if (!teamName || !league) continue

    const teamId = row.team_id as string

    for (const bt of ['moneyline', 'spread', 'over_under'] as const) {
      const result = row[COL[bt]] as string | null
      const m      = dm[bt]
      if (!m.has(teamId)) m.set(teamId, { teamId, teamName, league, entries: [] })
      m.get(teamId)!.entries.push({ result, date })
    }
  }

  return dm
}

function cells(entries: BetEntry[], n: number): OutcomeCell[] {
  return entries.slice(0, n).map(e => ({ result: e.result ?? 'push', date: e.date }))
}

// ─── Priority 1: Active streaks ───────────────────────────────────────────────

function findStreaks(dm: DataMap, min: number): ArticleCandidate[] {
  const out: ArticleCandidate[] = []

  for (const [betType, teamMap] of Object.entries(dm)) {
    for (const [, d] of teamMap) {
      const valid = d.entries.filter(e => e.result && e.result !== 'push')
      if (!valid.length) continue

      const dir = valid[0].result!
      let len   = 0
      for (const e of valid) { if (e.result === dir) len++; else break }
      if (len < min) continue

      out.push({
        teamId: d.teamId, teamName: d.teamName, league: d.league,
        betType, articleType: 'streak',
        streakLength: len, streakDirection: dir,
        recentOutcomes: cells(d.entries, 10),
        promptContext: `${d.teamName} has ${len} consecutive ${dir}s on ${BET_LABELS[betType] ?? betType} — the streak is still active.`,
      })
    }
  }

  return out.sort((a, b) => b.streakLength - a.streakLength)
}

// ─── Priority 2: Notable season win-rate records ──────────────────────────────

function findRecords(dm: DataMap): ArticleCandidate[] {
  const out: ArticleCandidate[] = []

  for (const [betType, teamMap] of Object.entries(dm)) {
    const positiveResult = betType === 'over_under' ? 'over' : 'win'

    type R = { d: TeamBetData; wins: number; total: number; rate: number }
    const byLeague = new Map<string, R[]>()

    for (const [, d] of teamMap) {
      const valid = d.entries.filter(
        e => e.result && e.result !== 'push' &&
          (betType === 'over_under' ? ['over', 'under'].includes(e.result) : ['win', 'loss'].includes(e.result))
      )
      if (valid.length < 12) continue

      const wins  = valid.filter(e => e.result === positiveResult).length
      const total = valid.length
      const rate  = wins / total

      if (!byLeague.has(d.league)) byLeague.set(d.league, [])
      byLeague.get(d.league)!.push({ d, wins, total, rate })
    }

    for (const [league, entries] of byLeague) {
      entries.sort((a, b) => b.rate - a.rate)
      const best  = entries[0]
      const worst = entries[entries.length - 1]

      if (best && best.rate >= 0.62) {
        const pct = Math.round(best.rate * 100)
        out.push({
          teamId: best.d.teamId, teamName: best.d.teamName, league,
          betType, articleType: 'record',
          streakLength: best.wins, streakDirection: 'high',
          recentOutcomes: cells(best.d.entries, 10),
          promptContext: `${best.d.teamName} is ${best.wins}-for-${best.total} (${pct}%) on ${BET_LABELS[betType] ?? betType} this season — among the best marks in ${league}.`,
        })
      }

      if (worst && worst !== best && worst.rate <= 0.38) {
        const pct = Math.round(worst.rate * 100)
        out.push({
          teamId: worst.d.teamId, teamName: worst.d.teamName, league,
          betType, articleType: 'record',
          streakLength: worst.wins, streakDirection: 'low',
          recentOutcomes: cells(worst.d.entries, 10),
          promptContext: `${worst.d.teamName} is ${worst.wins}-for-${worst.total} (${pct}%) on ${BET_LABELS[betType] ?? betType} this season — one of the worst marks in ${league}.`,
        })
      }
    }
  }

  return out.sort((a, b) => b.streakLength - a.streakLength)
}

// ─── Priority 3: Recent reversals ────────────────────────────────────────────

function findReversals(dm: DataMap, withinDays: number): ArticleCandidate[] {
  const out: ArticleCandidate[] = []
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - withinDays)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  for (const [betType, teamMap] of Object.entries(dm)) {
    for (const [, d] of teamMap) {
      const valid = d.entries.filter(e => e.result && e.result !== 'push')
      if (valid.length < 5) continue

      const mostRecentDate = valid[0].date
      if (mostRecentDate < cutoffStr) continue

      const currentResult = valid[0].result!
      const prevResult    = valid[1]?.result
      if (!prevResult || currentResult === prevResult) continue

      let endedLength = 0
      for (let i = 1; i < valid.length; i++) {
        if (valid[i].result === prevResult) endedLength++
        else break
      }
      if (endedLength < 4) continue

      out.push({
        teamId: d.teamId, teamName: d.teamName, league: d.league,
        betType, articleType: 'reversal',
        streakLength: endedLength, streakDirection: prevResult,
        recentOutcomes: cells(d.entries, 10),
        promptContext: `${d.teamName}'s ${endedLength}-game ${prevResult} streak on ${BET_LABELS[betType] ?? betType} ended recently — the most recent game on ${mostRecentDate} went ${currentResult}.`,
      })
    }
  }

  return out.sort((a, b) => b.streakLength - a.streakLength)
}

// ─── Priority 4: League leaders this month ────────────────────────────────────

function findLeaders(dm: DataMap): ArticleCandidate[] {
  const out: ArticleCandidate[] = []
  const now        = new Date()
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
  const monthName  = now.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })

  for (const [betType, teamMap] of Object.entries(dm)) {
    const positiveResult = betType === 'over_under' ? 'over' : 'win'
    const positiveLabel  = betType === 'over_under' ? 'overs' : betType === 'spread' ? 'covers' : 'wins'

    type R = { d: TeamBetData; wins: number; total: number }
    const byLeague = new Map<string, R[]>()

    for (const [, d] of teamMap) {
      const monthEntries = d.entries.filter(e => e.date >= monthStart && e.result)
      const wins = monthEntries.filter(e => e.result === positiveResult).length
      if (!wins) continue

      if (!byLeague.has(d.league)) byLeague.set(d.league, [])
      byLeague.get(d.league)!.push({ d, wins, total: monthEntries.length })
    }

    for (const [league, entries] of byLeague) {
      entries.sort((a, b) => b.wins - a.wins)
      entries.slice(0, 3).forEach(({ d, wins, total }, idx) => {
        out.push({
          teamId: d.teamId, teamName: d.teamName, league,
          betType, articleType: 'leader',
          streakLength: wins, streakDirection: 'leader',
          recentOutcomes: cells(d.entries, 10),
          promptContext: `Through ${monthName}, ${d.teamName} ranks #${idx + 1} in ${league} for ${BET_LABELS[betType] ?? betType} ${positiveLabel} with ${wins} in ${total} games this month.`,
        })
      })
    }
  }

  return out.sort((a, b) => b.streakLength - a.streakLength)
}

// ─── Priority 5: Performance shifts ──────────────────────────────────────────

function findPerformanceShifts(dm: DataMap): ArticleCandidate[] {
  const out: ArticleCandidate[] = []

  for (const [betType, teamMap] of Object.entries(dm)) {
    const positiveResult = betType === 'over_under' ? 'over' : 'win'

    for (const [, d] of teamMap) {
      const valid = d.entries.filter(e => e.result && e.result !== 'push')
      if (valid.length < 10) continue

      const recent     = valid.slice(0, 5)
      const prev       = valid.slice(5, 10)
      const recentWins = recent.filter(e => e.result === positiveResult).length
      const prevWins   = prev.filter(e => e.result === positiveResult).length

      const goingHot  = recentWins >= 4 && prevWins <= 1
      const goingCold = recentWins <= 1 && prevWins >= 4
      if (!goingHot && !goingCold) continue

      const direction = goingHot ? 'hot' : 'cold'

      out.push({
        teamId: d.teamId, teamName: d.teamName, league: d.league,
        betType, articleType: 'leader',
        streakLength: recentWins, streakDirection: direction,
        recentOutcomes: cells(d.entries, 10),
        promptContext: `${d.teamName} has shifted ${direction} on ${BET_LABELS[betType] ?? betType}: ${recentWins}-for-5 in their last 5 games versus ${prevWins}-for-5 in the prior 5 — a sudden change in form.`,
      })
    }
  }

  return out
}

// ─── Article selection with priority + deduplication ─────────────────────────

function selectArticles(
  streaks:   ArticleCandidate[],
  records:   ArticleCandidate[],
  reversals: ArticleCandidate[],
  leaders:   ArticleCandidate[],
  shifts:    ArticleCandidate[],
): ArticleCandidate[] {
  const selected: ArticleCandidate[] = []
  const usedKeys  = new Set<string>()

  function tryAdd(c: ArticleCandidate): boolean {
    const key = `${c.teamName}|${c.betType}`
    if (usedKeys.has(key)) return false
    selected.push(c)
    usedKeys.add(key)
    return true
  }

  // Priority 1: Streaks — respect league distribution, then overflow
  const byLeague: Record<string, ArticleCandidate[]> = {}
  for (const c of streaks) {
    if (!byLeague[c.league]) byLeague[c.league] = []
    byLeague[c.league].push(c)
  }

  const overflow: ArticleCandidate[] = []
  for (const [league, target] of Object.entries(LEAGUE_TARGETS)) {
    let added = 0
    for (const c of byLeague[league] ?? []) {
      if (added >= target) { overflow.push(c); continue }
      if (tryAdd(c)) added++
    }
  }
  for (const c of overflow) {
    if (selected.length >= TARGET_COUNT) break
    tryAdd(c)
  }

  // Priorities 2–5: fill to TARGET_COUNT
  for (const list of [records, reversals, leaders, shifts]) {
    for (const c of list) {
      if (selected.length >= TARGET_COUNT) break
      tryAdd(c)
    }
    if (selected.length >= TARGET_COUNT) break
  }

  return selected
}

// ─── SVG chart strip ──────────────────────────────────────────────────────────

function buildSvg(cells: OutcomeCell[]): string {
  const W = 12, H = 12, GAP = 2
  const totalW = cells.length * W + Math.max(0, cells.length - 1) * GAP
  const rects  = cells.map((c, i) => {
    const x    = i * (W + GAP)
    const fill = CELL_COLORS[c.result] ?? '#3f3f46'
    return `<rect x="${x}" y="0" width="${W}" height="${H}" rx="2" fill="${fill}"><title>${c.result} · ${c.date}</title></rect>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${H}" aria-hidden="true">${rects}</svg>`
}

// ─── Claude article generation ────────────────────────────────────────────────

const TYPE_GUIDE: Record<ArticleType, string> = {
  streak:
    'Lead with the streak fact. Add a sentence on how long it has been building. Close with what the chart data reflects.',
  record:
    'Lead with the win rate (e.g. "The Cubs are covering spreads at 71% this season"). Add where that ranks in the league. Close with a brief observation.',
  reversal:
    'Lead with the streak ending (e.g. "Chicago\'s 6-game over streak came to an end Wednesday"). Describe what ended it. Close with their current form.',
  leader:
    'Lead with the ranking (e.g. "Through May, the Dodgers lead MLB in moneyline wins with 19"). Add context. Close with a brief observation.',
}

async function generateArticle(c: ArticleCandidate): Promise<{ headline: string; body: string }> {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{
      role:    'user',
      content: `You write data-driven blurbs for Gambchop, a sports betting visualization site.

Article type: ${c.articleType.toUpperCase()}
Data: ${c.promptContext}
Style: ${TYPE_GUIDE[c.articleType]}

Rules: factual and observational only — no predictions, no betting advice, Gambchop voice (direct, data-first, no hype).
Headline: max 10 words.
Body: exactly 2–3 sentences.

Respond with valid JSON only, no markdown fences: {"headline":"...","body":"..."}`,
    }],
  })

  const raw    = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
  const clean  = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(clean)
  return { headline: String(parsed.headline ?? ''), body: String(parsed.body ?? '') }
}
