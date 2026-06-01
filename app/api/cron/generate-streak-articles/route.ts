export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

// Queries team_game_outcomes for active streaks of 6+ consecutive same-direction
// outcomes per team per bet type, selects top streaks by league distribution,
// generates headlines + bodies via Claude, and upserts into streak_articles.
// Runs daily at 7am UTC via Vercel cron.
// Protected by CRON_SECRET (Vercel-managed) or INGESTION_ADMIN_TOKEN (local dev).

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MIN_STREAK = 6

// How many streak articles to pick per league; gaps are filled from the
// league with the most qualifying extras.
const LEAGUE_TARGETS: Record<string, number> = {
  MLB:  3,
  NBA:  2,
  NFL:  3,
  NHL:  2,
  WNBA: 3,
}

type OutcomeCell = { result: string; date: string }

type StreakCandidate = {
  teamId:          string
  teamName:        string
  league:          string
  betType:         string
  streakLength:    number
  streakDirection: string
  recentOutcomes:  OutcomeCell[]
}

type BetConfig = {
  column:      'moneyline_result' | 'spread_result' | 'over_under_result'
  betType:     string
  excludeNull: boolean
}

const BET_CONFIGS: BetConfig[] = [
  { column: 'moneyline_result',  betType: 'moneyline',   excludeNull: false },
  { column: 'spread_result',     betType: 'spread',      excludeNull: true  },
  { column: 'over_under_result', betType: 'over_under',  excludeNull: true  },
]

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader  = req.headers.get('authorization')
  const cronSecret  = process.env.CRON_SECRET
  const adminToken  = process.env.INGESTION_ADMIN_TOKEN
  const tokenParam  = new URL(req.url).searchParams.get('token')

  const viaCron  = cronSecret  && authHeader === `Bearer ${cronSecret}`
  const viaToken = adminToken  && tokenParam === adminToken

  if (!viaCron && !viaToken) {
    console.warn('[streak-articles] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt     = Date.now()
  const allCandidates: StreakCandidate[] = []

  // ── 1. Fetch outcomes for each bet type and compute active streaks ──────────
  for (const cfg of BET_CONFIGS) {
    let query = supabaseAdmin
      .from('team_game_outcomes')
      .select(
        `team_id, ${cfg.column}, games!inner(game_date), teams!inner(name, leagues!inner(name))`
      )
      .order('team_id', { ascending: true })
      .order('game_date', { ascending: false, foreignTable: 'games' })

    if (cfg.excludeNull) {
      query = (query as any).not(cfg.column, 'is', null)
    }

    const { data, error } = await query
    if (error) {
      console.error(`[streak-articles] query error for ${cfg.betType}:`, error.message)
      continue
    }

    const candidates = computeStreaks(data ?? [], cfg.column, cfg.betType)
    console.log(`[streak-articles] ${cfg.betType}: ${candidates.length} qualifying streaks`)
    allCandidates.push(...candidates)
  }

  // ── 2. Apply league distribution ────────────────────────────────────────────
  const byLeague: Record<string, StreakCandidate[]> = {}
  for (const c of allCandidates) {
    if (!byLeague[c.league]) byLeague[c.league] = []
    byLeague[c.league].push(c)
  }
  for (const key of Object.keys(byLeague)) {
    byLeague[key].sort((a, b) => b.streakLength - a.streakLength)
  }

  const selected:  StreakCandidate[] = []
  const overflow:  StreakCandidate[] = []

  for (const [league, target] of Object.entries(LEAGUE_TARGETS)) {
    const pool = byLeague[league] ?? []
    selected.push(...pool.slice(0, target))
    overflow.push(...pool.slice(target))
  }

  const totalTarget = Object.values(LEAGUE_TARGETS).reduce((a, b) => a + b, 0)
  if (selected.length < totalTarget) {
    overflow.sort((a, b) => b.streakLength - a.streakLength)
    selected.push(...overflow.slice(0, totalTarget - selected.length))
  }

  console.log(`[streak-articles] selected ${selected.length} / ${allCandidates.length} candidates`)

  // ── 3. Generate article for each selected streak ────────────────────────────
  const rows: object[] = []
  let generated = 0

  for (const candidate of selected) {
    try {
      const { headline, body } = await generateArticle(candidate)
      rows.push({
        team_name:        candidate.teamName,
        league:           candidate.league,
        bet_type:         candidate.betType,
        streak_length:    candidate.streakLength,
        streak_direction: candidate.streakDirection,
        headline,
        body,
        outcome_cells:    candidate.recentOutcomes,
        generated_at:     new Date().toISOString(),
      })
      generated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[streak-articles] Claude error for ${candidate.teamName}/${candidate.betType}: ${msg}`)
    }
  }

  // ── 4. Upsert (replaces existing article for same team+bet_type) ────────────
  if (rows.length > 0) {
    const { error } = await supabaseAdmin
      .from('streak_articles')
      .upsert(rows, { onConflict: 'team_name,bet_type', ignoreDuplicates: false })

    if (error) {
      console.error('[streak-articles] upsert error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const duration = parseFloat(((Date.now() - startedAt) / 1000).toFixed(1))
  console.log(`[streak-articles] done — generated:${generated} duration:${duration}s`)

  return NextResponse.json({ success: true, generated, duration_seconds: duration })
}

// ─── Streak computation ───────────────────────────────────────────────────────

function computeStreaks(
  rows:         any[],
  resultColumn: string,
  betType:      string,
): StreakCandidate[] {
  const byTeam = new Map<string, any[]>()
  for (const row of rows) {
    const list = byTeam.get(row.team_id) ?? []
    list.push(row)
    byTeam.set(row.team_id, list)
  }

  const candidates: StreakCandidate[] = []

  for (const [teamId, teamRows] of byTeam) {
    if (teamRows.length === 0) continue

    const mostRecent  = teamRows[0]
    const direction   = mostRecent[resultColumn] as string | null
    if (!direction || direction === 'push') continue

    let streakLength = 1
    for (let i = 1; i < teamRows.length; i++) {
      if (teamRows[i][resultColumn] === direction) streakLength++
      else break
    }
    if (streakLength < MIN_STREAK) continue

    // Extract team name and league name from the nested join
    const teamObj   = mostRecent.teams
    const teamName  = Array.isArray(teamObj) ? teamObj[0]?.name : teamObj?.name ?? 'Unknown'
    const leagueRaw = Array.isArray(teamObj) ? teamObj[0]?.leagues : teamObj?.leagues
    const league    = Array.isArray(leagueRaw) ? leagueRaw[0]?.name : leagueRaw?.name ?? 'Unknown'

    const recentOutcomes: OutcomeCell[] = teamRows.slice(0, 10).map((r: any) => {
      const g    = r.games
      const date = Array.isArray(g) ? g[0]?.game_date ?? '' : g?.game_date ?? ''
      return { result: r[resultColumn] as string, date }
    })

    candidates.push({ teamId, teamName, league, betType, streakLength, streakDirection: direction, recentOutcomes })
  }

  return candidates
}

// ─── Claude article generation ────────────────────────────────────────────────

async function generateArticle(c: StreakCandidate): Promise<{ headline: string; body: string }> {
  const betLabel =
    c.betType === 'moneyline'   ? 'moneyline (straight-up win/loss)'
    : c.betType === 'spread'    ? 'against the spread (cover/no-cover)'
    : 'over/under total'

  const dirLabel = c.streakDirection === 'win'  ? 'wins'
    : c.streakDirection === 'loss'               ? 'losses'
    : c.streakDirection === 'over'               ? 'overs'
    : 'unders'

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{
      role:    'user',
      content: `You write short data-driven blurbs for Gambchop, a sports betting data visualization site.

Streak data:
- Team: ${c.teamName}
- League: ${c.league}
- Bet type: ${betLabel}
- Streak: ${c.streakLength} consecutive ${dirLabel}

Write a headline (max 10 words) and a 2-3 sentence body. Rules:
- Factual and observational only — describe what the data shows
- No predictions, no betting advice, no recommendations
- Gambchop voice: direct, data-first, no hype

Respond with valid JSON only, no markdown: {"headline":"...","body":"..."}`,
    }],
  })

  const raw    = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
  const clean  = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(clean)

  return {
    headline: String(parsed.headline ?? ''),
    body:     String(parsed.body     ?? ''),
  }
}
