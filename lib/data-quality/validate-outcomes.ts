import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlagType =
  | 'score_missing'      // home_score + away_score is zero or null
  | 'line_missing'       // no lines row, or lines.total is null
  | 'total_suspicious'   // lines.total > 13 — likely a live line was captured
  | 'ou_mismatch'        // stored over_under_result disagrees with score vs total
  | 'ml_mismatch'        // stored moneyline_result disagrees with who scored more

export interface ValidationSummary {
  checked: number
  flagged: number
  flags:   FlagType[]
}

// ─── Rolling window ───────────────────────────────────────────────────────────

const WINDOW_DAYS = 7

function windowStart(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - WINDOW_DAYS)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

// ─── Expected O/U result ──────────────────────────────────────────────────────

function expectedOU(
  combined: number,
  total: number,
): 'over' | 'under' | 'push' {
  if (combined > total) return 'over'
  if (combined < total) return 'under'
  return 'push'
}

// ─── Upsert a flag (skips if an unresolved flag of same game+type exists) ─────

async function upsertFlag(params: {
  gameId:   string
  flagType: FlagType
  notes:    string
}): Promise<boolean> {
  // Check for an existing unresolved flag of the same game_id + flag_type
  const { data: existing } = await supabaseAdmin
    .from('data_quality_flags')
    .select('id')
    .eq('game_id', params.gameId)
    .eq('flag_type', params.flagType)
    .is('resolved_at', null)
    .maybeSingle()

  if (existing) return false  // already flagged, skip

  const { error } = await supabaseAdmin
    .from('data_quality_flags')
    .insert({
      game_id:   params.gameId,
      flag_type: params.flagType,
      notes:     params.notes,
    })

  if (error) {
    console.error('[validate-outcomes] flag insert error:', error.message)
    return false
  }
  return true
}

// ─── Main validation function ─────────────────────────────────────────────────

export async function validateOutcomes(): Promise<ValidationSummary> {
  const since = windowStart()

  // ── Fetch all final games in the rolling window ──────────────────────────
  const { data: games, error: gamesError } = await supabaseAdmin
    .from('games')
    .select('id, home_score, away_score, home_team_id, away_team_id, game_date')
    .eq('status', 'final')
    .gte('game_date', since.slice(0, 10))  // game_date is a date column (YYYY-MM-DD)

  if (gamesError) {
    console.error('[validate-outcomes] failed to fetch games:', gamesError.message)
    return { checked: 0, flagged: 0, flags: [] }
  }

  if (!games?.length) {
    console.log('[validate-outcomes] no final games in window')
    return { checked: 0, flagged: 0, flags: [] }
  }

  const gameIds = games.map(g => g.id as string)

  // ── Batch fetch lines for all games ─────────────────────────────────────
  const { data: linesRows } = await supabaseAdmin
    .from('lines')
    .select('game_id, total')
    .in('game_id', gameIds)

  const lineByGame = new Map<string, { total: number | null }>(
    (linesRows ?? []).map(l => [l.game_id as string, { total: l.total as number | null }]),
  )

  // ── Batch fetch home team outcome rows (for O/U and ML checks) ───────────
  const { data: outcomes } = await supabaseAdmin
    .from('team_game_outcomes')
    .select('game_id, team_id, was_home, over_under_result, moneyline_result')
    .in('game_id', gameIds)
    .eq('was_home', true)

  const outcomeByGame = new Map<string, {
    team_id:           string
    over_under_result: string | null
    moneyline_result:  string | null
  }>(
    (outcomes ?? []).map(o => [
      o.game_id as string,
      {
        team_id:           o.team_id as string,
        over_under_result: o.over_under_result as string | null,
        moneyline_result:  o.moneyline_result  as string | null,
      },
    ]),
  )

  // ── Check each game ──────────────────────────────────────────────────────
  let flagged = 0
  const flagTypes = new Set<FlagType>()

  async function flag(gameId: string, type: FlagType, notes: string) {
    const inserted = await upsertFlag({ gameId, flagType: type, notes })
    if (inserted) {
      flagged++
      flagTypes.add(type)
    }
  }

  for (const game of games) {
    const gameId     = game.id as string
    const homeScore  = game.home_score  as number | null
    const awayScore  = game.away_score  as number | null
    const line       = lineByGame.get(gameId)
    const outcome    = outcomeByGame.get(gameId)

    // ── score_missing ──────────────────────────────────────────────────────
    if (homeScore == null || awayScore == null || (homeScore + awayScore) === 0) {
      await flag(
        gameId,
        'score_missing',
        `home_score=${homeScore ?? 'null'} away_score=${awayScore ?? 'null'} on game_date=${game.game_date}`,
      )
      continue  // remaining checks need valid scores
    }

    const combined = homeScore + awayScore

    // ── line_missing ───────────────────────────────────────────────────────
    if (!line || line.total == null) {
      await flag(
        gameId,
        'line_missing',
        `no lines row or total is null — over_under_result cannot be verified (combined score: ${combined})`,
      )
      // continue checking ML below
    } else {
      const total = line.total as number

      // ── total_suspicious ────────────────────────────────────────────────
      if (total > 13) {
        await flag(
          gameId,
          'total_suspicious',
          `lines.total=${total} exceeds 13 — likely a live line captured during the game (combined score: ${combined})`,
        )
      }

      // ── ou_mismatch ──────────────────────────────────────────────────────
      if (outcome?.over_under_result != null) {
        const expected = expectedOU(combined, total)
        if (outcome.over_under_result !== expected) {
          await flag(
            gameId,
            'ou_mismatch',
            `stored over_under_result="${outcome.over_under_result}" but combined ${combined} vs total ${total} → expected "${expected}"`,
          )
        }
      }
    }

    // ── ml_mismatch ────────────────────────────────────────────────────────
    if (outcome?.moneyline_result != null) {
      const homeWon    = homeScore > awayScore
      const storedWin  = outcome.moneyline_result === 'win'
      if (homeWon !== storedWin) {
        await flag(
          gameId,
          'ml_mismatch',
          `stored home moneyline_result="${outcome.moneyline_result}" but home_score=${homeScore} away_score=${awayScore} — expected home to ${homeWon ? 'win' : 'lose'}`,
        )
      }
    }
  }

  return {
    checked: games.length,
    flagged,
    flags:   Array.from(flagTypes),
  }
}
