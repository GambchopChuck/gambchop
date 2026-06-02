import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime    = 'nodejs'
export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL     = 'claude-sonnet-4-6'

// ─── Minimal game shape expected from client ──────────────────────────────────

interface GameRow {
  rawDate:          string
  isHome:           boolean
  isFavorite:       boolean
  isSpreadFavorite: boolean
  moneylineResult:  string | null
  spreadResult:     string | null
  ouResult:         string | null
}

// ─── Compute stats from raw game rows ────────────────────────────────────────

function buildStats(name: string, games: GameRow[]) {
  const g = games.slice(-20)
  const n = g.length
  if (n === 0) return `${name}: no recent game data available.`

  const mlW    = g.filter(r => r.moneylineResult === 'win').length
  const mlL    = g.filter(r => r.moneylineResult === 'loss').length
  const spW    = g.filter(r => r.spreadResult === 'win').length
  const spL    = g.filter(r => r.spreadResult === 'loss').length
  const overs  = g.filter(r => r.ouResult === 'over').length
  const unders = g.filter(r => r.ouResult === 'under').length
  const homeG  = g.filter(r => r.isHome)
  const awayG  = g.filter(r => !r.isHome)
  const homeW  = homeG.filter(r => r.moneylineResult === 'win').length
  const homeL  = homeG.filter(r => r.moneylineResult === 'loss').length
  const awayW  = awayG.filter(r => r.moneylineResult === 'win').length
  const awayL  = awayG.filter(r => r.moneylineResult === 'loss').length
  const favG   = g.filter(r => r.isFavorite)
  const dogG   = g.filter(r => !r.isFavorite)
  const favW   = favG.filter(r => r.moneylineResult === 'win').length
  const favL   = favG.filter(r => r.moneylineResult === 'loss').length
  const dogW   = dogG.filter(r => r.moneylineResult === 'win').length
  const dogL   = dogG.filter(r => r.moneylineResult === 'loss').length

  // Current ML streak
  let streak = ''
  let streakType: string | null = null
  let streakCount = 0
  for (let i = g.length - 1; i >= 0; i--) {
    const r = g[i].moneylineResult
    if (r !== 'win' && r !== 'loss') continue
    if (streakType === null) { streakType = r; streakCount = 1 }
    else if (r === streakType) streakCount++
    else break
  }
  if (streakType && streakCount >= 2) streak = ` (active ${streakType === 'win' ? 'W' : 'L'}${streakCount})`

  return [
    `${name} — last ${n} games:`,
    `  ML: ${mlW}-${mlL}${streak}`,
    `  ATS: ${spW}-${spL}`,
    `  O/U: ${overs}o-${unders}u`,
    `  Home: ${homeW}-${homeL} | Away: ${awayW}-${awayL}`,
    `  As Favorite: ${favW}-${favL} | As Underdog: ${dogW}-${dogL}`,
  ].join('\n')
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_pro')
    .eq('id', user.id)
    .single()

  if (profile?.is_pro !== true) {
    return Response.json({ error: 'Pro required' }, { status: 403 })
  }

  // Parse body
  const { team1Name, team2Name, team1Games, team2Games } = await req.json() as {
    team1Name:  string
    team2Name:  string
    team1Games: GameRow[]
    team2Games: GameRow[]
  }

  if (!team1Name || !team2Name) {
    return Response.json({ error: 'Missing team names' }, { status: 400 })
  }

  const t1Stats = buildStats(team1Name, team1Games ?? [])
  const t2Stats = buildStats(team2Name, team2Games ?? [])

  const prompt = `You are the Gambchop analytical voice — precise, factual, and direct. Write a 4-6 sentence comparison briefing based on recent outcome data. Rules: no predictions, no betting advice, no statements about what will happen. Describe only what the data shows.

Data:
${t1Stats}

${t2Stats}

Structure (one sentence each):
1. ${team1Name}'s moneyline form
2. ${team2Name}'s moneyline form
3. ATS (spread) form for both teams combined in one sentence
4. Over/under tendencies for both teams in one sentence
5. One cross-team observation (e.g., home/away contrast, favorite/underdog contrast, or a diverging trend)

Output: Flowing prose only. No bullets, no headers, no sentence numbering.`

  const response = await anthropic.messages.create({
    model:      MODEL,
    max_tokens: 420,
    messages:   [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  return Response.json({ briefing: text })
}
