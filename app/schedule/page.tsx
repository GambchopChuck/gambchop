// Odds API response cached for 1 hour — first load generates Claude blurbs,
// subsequent loads within the hour are instant.
export const revalidate = 3600

import Anthropic               from '@anthropic-ai/sdk'
import { supabaseAdmin }       from '@/lib/supabase-admin'
import { extractLine }         from '@/lib/ingestion'
import type { GameOdds }       from '@/lib/odds-api'
import ScheduleClient          from '@/components/schedule/ScheduleClient'
import { rowToTopMatchup }     from '@/lib/topMatchups'
import type { TopMatchupData } from '@/lib/topMatchups'

export const metadata = {
  title: 'Schedule | Gambchop',
  description: 'Upcoming MLB matchups with side-by-side team chart comparisons.',
}

// ─── Types (re-exported so ScheduleClient can import them) ────────────────────

export type OutcomeRow  = { result: string; date: string }
export type TeamChart   = { moneyline: OutcomeRow[]; spread: OutcomeRow[]; over_under: OutcomeRow[] }
export type GameLines   = {
  mlHome:      number | null
  mlAway:      number | null
  spreadHome:  number | null
  spreadAway:  number | null
  spreadJuice: number | null
  total:       number | null
  overJuice:   number | null
  underJuice:  number | null
}
export type ScheduleGame = {
  id:           string
  homeTeam:     string
  awayTeam:     string
  commenceTime: string   // UTC ISO
  lines:        GameLines
  homeChart:    TeamChart
  awayChart:    TeamChart
  blurb:        string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDate(row: any): string {
  const g = row.games
  return (Array.isArray(g) ? g[0]?.game_date : g?.game_date) ?? ''
}

function buildChart(rows: any[]): TeamChart {
  function cells(col: string): OutcomeRow[] {
    return rows
      .filter(r => r[col] != null)
      .map(r => ({ result: r[col] as string, date: getDate(r) }))
      .slice(0, 10)
  }
  return {
    moneyline:  cells('moneyline_result'),
    spread:     cells('spread_result'),
    over_under: cells('over_under_result'),
  }
}

async function generateBlurb(
  anthropic: Anthropic,
  awayTeam:  string,
  homeTeam:  string,
  awayRows:  any[],
  homeRows:  any[],
): Promise<string> {
  try {
    const fmt = (rows: any[]) =>
      rows.slice(0, 10).map((r, i) =>
        `${i + 1}. ML:${r.moneyline_result ?? '-'} SP:${r.spread_result ?? '-'} OU:${r.over_under_result ?? '-'} (${getDate(r) || '?'})`
      ).join('\n') || 'No data available'

    const resp = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 128,
      messages: [{
        role:    'user',
        content: `Write exactly 2 sentences comparing these teams for Gambchop, a sports betting data site.
${awayTeam} (away) recent chart:
${fmt(awayRows)}

${homeTeam} (home) recent chart:
${fmt(homeRows)}

Rules: factual observations from the data only, no predictions, no betting advice, no "should" or "likely". Direct tone.`,
      }],
    })
    return resp.content[0].type === 'text' ? resp.content[0].text.trim() : ''
  } catch {
    return ''
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SchedulePage() {
  const apiKey = process.env.THE_ODDS_API_KEY
  if (!apiKey) {
    return <ScheduleClient games={[]} error="THE_ODDS_API_KEY is not configured." />
  }

  // ── 1. Fetch upcoming MLB odds (1-hour cached) ──────────────────────────────
  let rawGames: GameOdds[] = []
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds` +
      `?regions=us&markets=h2h,spreads,totals&oddsFormat=american&eventStatus=upcoming&apiKey=${apiKey}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) throw new Error(`Odds API HTTP ${res.status}`)
    rawGames = await res.json() as GameOdds[]
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return <ScheduleClient games={[]} error={`Could not load schedule: ${msg}`} />
  }

  // Filter to next 7 days
  const now      = Date.now()
  const cutoff   = now + 7 * 24 * 60 * 60 * 1000
  const upcoming = rawGames.filter(g => {
    const t = new Date(g.commence_time).getTime()
    return t >= now && t <= cutoff
  })

  if (!upcoming.length) {
    return <ScheduleClient games={[]} />
  }

  // ── 2. Look up team IDs in Supabase ────────────────────────────────────────
  const teamNames = [...new Set(upcoming.flatMap(g => [g.home_team, g.away_team]))]
  const { data: teamRows } = await supabaseAdmin
    .from('teams')
    .select('id, name')
    .in('name', teamNames)

  const teamIdByName = new Map<string, string>(
    (teamRows ?? []).map((t: any) => [t.name as string, t.id as string])
  )
  const teamIds = (teamRows ?? []).map((t: any) => t.id as string)

  // ── 3. Fetch all recent outcomes for involved teams ─────────────────────────
  let allRows: any[] = []
  if (teamIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('team_game_outcomes')
      .select(
        'team_id, moneyline_result, spread_result, over_under_result, games!inner(game_date)'
      )
      .in('team_id', teamIds)
      .order('team_id',   { ascending: true })
      .order('game_date', { ascending: false, foreignTable: 'games' })

    // Explicit per-team date-desc sort (PostgREST ordering on foreign tables is not guaranteed)
    const byTeam = new Map<string, any[]>()
    for (const row of (data ?? [])) {
      const list = byTeam.get(row.team_id) ?? []
      list.push(row)
      byTeam.set(row.team_id, list)
    }
    for (const [, rows] of byTeam) {
      rows.sort((a, b) => {
        const da = getDate(a), db = getDate(b)
        return da < db ? 1 : da > db ? -1 : 0
      })
    }
    for (const [, rows] of byTeam) allRows.push(...rows)
  }

  const rowsByTeam = new Map<string, any[]>()
  for (const row of allRows) {
    const list = rowsByTeam.get(row.team_id) ?? []
    list.push(row)
    rowsByTeam.set(row.team_id, list)
  }

  // ── 4. Generate blurbs concurrently ────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const scheduleGames: ScheduleGame[] = await Promise.all(
    upcoming.map(async (game) => {
      const line    = extractLine(game)
      const homeId  = teamIdByName.get(game.home_team) ?? ''
      const awayId  = teamIdByName.get(game.away_team) ?? ''
      const homeRows = homeId ? (rowsByTeam.get(homeId) ?? []) : []
      const awayRows = awayId ? (rowsByTeam.get(awayId) ?? []) : []

      const blurb = (homeId && awayId)
        ? await generateBlurb(anthropic, game.away_team, game.home_team, awayRows, homeRows)
        : ''

      return {
        id:           game.id,
        homeTeam:     game.home_team,
        awayTeam:     game.away_team,
        commenceTime: game.commence_time,
        lines: {
          mlHome:      line.ml_home,
          mlAway:      line.ml_away,
          spreadHome:  line.spread_home,
          spreadAway:  line.spread_away,
          spreadJuice: line.spread_juice,
          total:       line.total,
          overJuice:   line.over_juice,
          underJuice:  line.under_juice,
        },
        homeChart: buildChart(homeRows),
        awayChart: buildChart(awayRows),
        blurb,
      }
    })
  )

  // ── 5. Read today's top matchups from Supabase (written by cron) ────────────
  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  let topMatchups: TopMatchupData[] = []
  try {
    const { data: tmRows } = await supabaseAdmin
      .from('top_matchups')
      .select('*')
      .eq('game_date', todayET)
    topMatchups = (tmRows ?? []).map(rowToTopMatchup).filter(Boolean) as TopMatchupData[]
  } catch {
    // Table may not exist yet — degrade gracefully
  }

  return <ScheduleClient games={scheduleGames} topMatchups={topMatchups} />
}
