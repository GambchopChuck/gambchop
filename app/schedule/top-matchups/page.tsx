// TODO Phase 2: when NBA, NHL, WNBA, NFL are added, their top matchups will
// appear here automatically as additional cards — no code changes needed as long
// as the cron job upserts rows for each league into top_matchups.

export const revalidate = 3600

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rowToTopMatchup } from '@/lib/topMatchups'
import type { TopMatchupData } from '@/lib/topMatchups'
import { TEAM_ROUTES } from '@/lib/teamRoutes'

export const metadata = {
  title: 'Top Matchups | Gambchop',
  description: "Today's highest-rated matchups by combined team win rate.",
}

// ─── Design tokens ─────────────────────────────────────────────────────────────

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const ACCENT = '#39ff9a'
const MONO   = 'var(--font-geist-mono), monospace'
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'

// ─── League color map ──────────────────────────────────────────────────────────
// TODO Phase 2: add NBA/NHL/NFL/WNBA color entries here as leagues go live
const LEAGUE_COLORS: Record<string, string> = {
  mlb: '#39ff9a',
  // nba:  '#f97316',
  // nhl:  '#38bdf8',
  // nfl:  '#6366f1',
  // wnba: '#f472b6',
}

const LEAGUE_EMOJI: Record<string, string> = {
  mlb: '⚾',
  // nba:  '🏀',
  // nhl:  '🏒',
  // nfl:  '🏈',
  // wnba: '🏀',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtOdds(n: number | null | undefined): string {
  if (n == null) return '--'
  return n >= 0 ? `+${n}` : `${n}`
}

function fmtSpread(point: number | null | undefined, juice: number | null | undefined): string {
  if (point == null) return '--'
  const p = point > 0 ? `+${point}` : `${point}`
  return juice != null ? `${p} (${fmtOdds(juice)})` : p
}

function record(cells: { result: string; date: string }[], label: 'ML' | 'SP'): { w: number; l: number } {
  const col = label === 'ML' ? 'moneyline' : 'spread'
  void col
  const w = cells.filter(c => c.result === 'win').length
  const l = cells.filter(c => c.result === 'loss').length
  return { w, l }
}

function teamSlug(name: string): string {
  const route = TEAM_ROUTES[name]
  if (route) return route.split('/').pop() ?? slugify(name)
  return slugify(name)
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toET(utc: string | null | undefined): string | null {
  if (!utc) return null
  const d = new Date(utc)
  if (isNaN(d.getTime())) return null
  return d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true })
}

// ─── Sub-nav (shared with /schedule) ──────────────────────────────────────────

function SubNav({ active }: { active: 'schedule' | 'top-matchups' }) {
  const tabs = [
    { key: 'schedule',     label: 'SCHEDULE',     href: '/schedule' },
    { key: 'top-matchups', label: 'TOP MATCHUPS ⚡', href: '/schedule/top-matchups' },
  ] as const

  return (
    <div style={{
      position: 'sticky', top: 64, zIndex: 30,
      background: 'rgba(8,8,13,0.97)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{
        maxWidth: 1400, margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 4, height: 48,
      }}>
        {tabs.map(tab => {
          const isActive = tab.key === active
          return (
            <Link key={tab.key} href={tab.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background:    isActive ? ACCENT : 'transparent',
                color:         isActive ? '#000' : '#ffffff',
                border:        isActive ? 'none' : '1px solid transparent',
                borderRadius:  6,
                padding:       '5px 14px',
                fontSize:      11,
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor:        'pointer',
                fontFamily:    MONO,
                boxShadow:     isActive ? `0 0 12px ${ACCENT}55` : 'none',
                transition:    'all 0.15s',
              }}>
                {tab.label}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background:    `${color}12`,
      border:        `1px solid ${color}33`,
      borderRadius:  5,
      padding:       '4px 10px',
      display:       'inline-flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           2,
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: OSWALD, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 8, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: MONO }}>
        {label}
      </span>
    </div>
  )
}

// ─── Matchup card ──────────────────────────────────────────────────────────────

function MatchupCard({ matchup }: { matchup: TopMatchupData }) {
  const color      = LEAGUE_COLORS[matchup.league] ?? ACCENT
  const emoji      = LEAGUE_EMOJI[matchup.league] ?? '🎯'
  const awaySlug   = teamSlug(matchup.awayTeam)
  const homeSlug   = teamSlug(matchup.homeTeam)
  const compareUrl = `/compare?team1=${awaySlug}&team2=${homeSlug}`
  const timeStr    = toET(matchup.lines?.commenceTime)

  const awayML = record(matchup.awayForm.moneyline, 'ML')
  const homeML = record(matchup.homeForm.moneyline, 'ML')
  const awaySP = record(matchup.awayForm.spread,    'SP')
  const homeSP = record(matchup.homeForm.spread,    'SP')

  const awayRoute = TEAM_ROUTES[matchup.awayTeam]
  const homeRoute = TEAM_ROUTES[matchup.homeTeam]

  return (
    <div style={{
      background:    CARD,
      border:        `1px solid ${BORDER}`,
      borderRadius:  12,
      overflow:      'hidden',
      position:      'relative',
    }}>
      {/* Top accent line */}
      <div style={{
        position:   'absolute', top: 0, left: 0, right: 0,
        height:     2,
        background: `linear-gradient(to right, ${color}, transparent)`,
      }} />

      {/* Header */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           10,
        padding:       '16px 20px 12px',
        borderBottom:  `1px solid ${BORDER}`,
        flexWrap:      'wrap',
      }}>
        <span style={{
          background:    color,
          color:         '#000',
          fontSize:      9,
          fontWeight:    900,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily:    MONO,
          padding:       '3px 8px',
          borderRadius:  4,
          boxShadow:     `0 0 10px ${color}55`,
        }}>
          ⚡ Top Matchup
        </span>
        <span style={{
          fontSize:      9,
          color:         color,
          fontWeight:    700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily:    MONO,
          background:    `${color}15`,
          border:        `1px solid ${color}33`,
          padding:       '2px 7px',
          borderRadius:  3,
        }}>
          {emoji} {matchup.league.toUpperCase()}
        </span>
        {timeStr && (
          <span style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', marginLeft: 'auto' }}>
            Today · {timeStr} ET
          </span>
        )}
      </div>

      {/* Teams + lines */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>

          {/* Away */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 6 }}>
              {awayRoute ? (
                <Link href={awayRoute} style={{ textDecoration: 'none' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD }}>
                    {matchup.awayTeam}
                  </span>
                </Link>
              ) : (
                <span style={{ fontSize: 18, fontWeight: 700, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD }}>
                  {matchup.awayTeam}
                </span>
              )}
              <div style={{ fontSize: 8, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: MONO, marginTop: 2 }}>
                AWAY
              </div>
            </div>

            {/* Away stat pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <StatPill
                label={`ML (L${matchup.awayForm.moneyline.length})`}
                value={`${awayML.w}-${awayML.l}`}
                color={awayML.w > awayML.l ? color : awayML.w < awayML.l ? '#ef4444' : MUTED}
              />
              <StatPill
                label={`ATS (L${matchup.awayForm.spread.length})`}
                value={`${awaySP.w}-${awaySP.l}`}
                color={awaySP.w > awaySP.l ? color : awaySP.w < awaySP.l ? '#ef4444' : MUTED}
              />
            </div>
          </div>

          {/* VS */}
          <div style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            flexShrink:     0,
            width:          60,
            paddingTop:     6,
          }}>
            <div style={{ width: 1, height: 20, background: BORDER }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#ffffff', letterSpacing: '0.1em', fontFamily: MONO, margin: '4px 0' }}>VS</span>
            <div style={{ width: 1, height: 20, background: BORDER }} />
          </div>

          {/* Home */}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ marginBottom: 6 }}>
              {homeRoute ? (
                <Link href={homeRoute} style={{ textDecoration: 'none' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD }}>
                    {matchup.homeTeam}
                  </span>
                </Link>
              ) : (
                <span style={{ fontSize: 18, fontWeight: 700, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD }}>
                  {matchup.homeTeam}
                </span>
              )}
              <div style={{ fontSize: 8, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: MONO, marginTop: 2 }}>
                HOME
              </div>
            </div>

            {/* Home stat pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 12 }}>
              <StatPill
                label={`ML (L${matchup.homeForm.moneyline.length})`}
                value={`${homeML.w}-${homeML.l}`}
                color={homeML.w > homeML.l ? color : homeML.w < homeML.l ? '#ef4444' : MUTED}
              />
              <StatPill
                label={`ATS (L${matchup.homeForm.spread.length})`}
                value={`${homeSP.w}-${homeSP.l}`}
                color={homeSP.w > homeSP.l ? color : homeSP.w < homeSP.l ? '#ef4444' : MUTED}
              />
            </div>
          </div>
        </div>

        {/* Betting lines bar */}
        <div style={{
          display:       'flex',
          gap:           20,
          flexWrap:      'wrap',
          padding:       '10px 0',
          borderTop:     `1px solid ${BORDER}`,
          fontSize:      10,
          color:         SUB,
          fontFamily:    MONO,
        }}>
          <span>
            ML: <b style={{ color: TEXT }}>{fmtOdds(matchup.lines?.mlAway)}</b>
            {' / '}
            <b style={{ color: TEXT }}>{fmtOdds(matchup.lines?.mlHome)}</b>
          </span>
          <span>
            Spread: <b style={{ color: TEXT }}>{fmtSpread(matchup.lines?.spreadAway, matchup.lines?.spreadJuice)}</b>
            {' / '}
            <b style={{ color: TEXT }}>{fmtSpread(matchup.lines?.spreadHome, matchup.lines?.spreadJuice)}</b>
          </span>
          {matchup.lines?.total != null && (
            <span>O/U: <b style={{ color: TEXT }}>{matchup.lines.total}</b></span>
          )}
        </div>
      </div>

      {/* COMPARE button — no AI summary anywhere on this page */}
      <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${BORDER}` }}>
        <Link href={compareUrl} style={{ textDecoration: 'none' }}>
          <button style={{
            background:    'none',
            border:        `1px solid ${color}55`,
            borderRadius:  7,
            padding:       '9px 22px',
            color:         color,
            fontSize:      11,
            fontWeight:    900,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor:        'pointer',
            fontFamily:    OSWALD,
            boxShadow:     `0 0 10px ${color}22`,
            transition:    'all 0.15s',
          }}>
            COMPARE →
          </button>
        </Link>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function TopMatchupsPage() {
  let matchups: TopMatchupData[] = []

  try {
    const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    const { data: rows } = await supabaseAdmin
      .from('top_matchups')
      .select('*')
      .eq('game_date', todayET)
    matchups = (rows ?? []).map(rowToTopMatchup).filter(Boolean) as TopMatchupData[]
  } catch {
    // Degrade gracefully — table may not exist yet
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingLeft: 64 }}>

      <SubNav active="top-matchups" />

      {/* Page header */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{
          fontSize: 10, color: MUTED, letterSpacing: '0.3em',
          textTransform: 'uppercase', margin: '0 0 6px', fontFamily: MONO,
        }}>
          Today&apos;s best matchups
        </p>
        <h1 style={{
          fontSize: 28, fontWeight: 900, color: TEXT,
          letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
          fontFamily: OSWALD,
        }}>
          Top Matchups
        </h1>
        <p style={{
          fontSize: 11, color: MUTED, margin: '8px 0 0', fontFamily: MONO, lineHeight: 1.6,
        }}>
          Ranked by combined season win rate. No AI summaries — just the data.
        </p>
      </div>

      {/* Cards grid */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 80px' }}>
        {matchups.length === 0 ? (
          <div style={{
            padding: '80px 24px', textAlign: 'center',
            fontSize: 13, color: MUTED, fontFamily: MONO,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            No top matchups found for today.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
            gap: 20,
          }}>
            {matchups.map((m, i) => (
              <MatchupCard key={`${m.league}-${i}`} matchup={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
