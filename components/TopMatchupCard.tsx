'use client'

import Link from 'next/link'
import { TEAM_ROUTES } from '@/lib/teamRoutes'
import type { TopMatchupData } from '@/lib/topMatchups'

export type { TopMatchupData }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toET(utc: string | null | undefined): string | null {
  if (!utc) return null
  const d = new Date(utc)
  if (isNaN(d.getTime())) return null
  return d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function fmtOdds(n: number | null | undefined): string {
  if (n == null) return '--'
  return n >= 0 ? `+${n}` : `${n}`
}

function teamSlug(name: string): string {
  const route = TEAM_ROUTES[name]
  if (route) return route.split('/').pop() ?? slugify(name)
  return slugify(name)
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ─── Font stacks ──────────────────────────────────────────────────────────────

const MONO   = 'var(--font-geist-mono), monospace'
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'

// ─── fp-card color tokens (identical to Also Featured section) ────────────────

const FP_BG     = `radial-gradient(circle at 50% 35%, color-mix(in srgb, #22c55e 100%, white 18%), color-mix(in srgb, #22c55e 100%, black 22%))`
const FP_BORDER = `1px solid color-mix(in srgb, #22c55e 100%, white 35%)`
const FP_SHADOW = `0 0 0 1px color-mix(in srgb, #22c55e 100%, white 40%), 0 0 22px -2px #22c55e, 0 0 60px -6px #22c55e, inset 0 1px 0 rgba(255,255,255,.45)`

// Text on the bright green background — all dark
const INK      = '#000000'            // primary text
const INK_MED  = 'rgba(0,0,0,0.70)'  // secondary text
const INK_FAINT= 'rgba(0,0,0,0.45)'  // very muted
const DIVIDER  = 'rgba(0,0,0,0.18)'  // column separators

// ─── Compact team column ──────────────────────────────────────────────────────
// No chart strips — just name, win rate, and ML on two tight lines.

function TeamCol({
  name, isHome, winPct, mlOdds,
}: {
  name:   string
  isHome: boolean
  winPct: number
  mlOdds: string
}) {
  const route = TEAM_ROUTES[name]

  return (
    <div className="tm-team" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, minWidth: 0 }}>
      {/* Team name + AWAY/HOME badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        {route ? (
          <Link href={route} style={{ textDecoration: 'none' }}>
            <span
              style={{ fontSize: 18, fontWeight: 700, color: INK, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
            >
              {name}
            </span>
          </Link>
        ) : (
          <span style={{ fontSize: 18, fontWeight: 700, color: INK, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD }}>
            {name}
          </span>
        )}
        <span style={{
          fontSize: 7, color: INK_FAINT, letterSpacing: '0.14em', textTransform: 'uppercase',
          fontFamily: MONO, background: 'rgba(0,0,0,0.15)', padding: '2px 5px', borderRadius: 2, flexShrink: 0,
        }}>
          {isHome ? 'HOME' : 'AWAY'}
        </span>
      </div>

      {/* Win rate + ML on one compact line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: INK_MED, fontFamily: MONO, fontWeight: 700 }}>
          Win Rate: {winPct}%
        </span>
        <span style={{ fontSize: 10, color: INK_FAINT, fontFamily: MONO }}>
          ML&nbsp;<b style={{ color: INK_MED }}>{mlOdds}</b>
        </span>
      </div>
    </div>
  )
}

// ─── Top Matchup Card ─────────────────────────────────────────────────────────
// Full-width horizontal banner styled with the Also Featured fp-card radiant green.
// compact prop kept for API compatibility but ignored.

interface Props {
  matchup:  TopMatchupData | null
  compact?: boolean
}

export default function TopMatchupCard({ matchup }: Props) {
  if (!matchup) return null

  const timeStr    = toET(matchup.lines?.commenceTime)
  const awaySlug   = teamSlug(matchup.awayTeam)
  const homeSlug   = teamSlug(matchup.homeTeam)
  const compareUrl = `/compare?team1=${awaySlug}&team2=${homeSlug}`
  const ouTotal    = matchup.lines?.total

  const awayWinPct = Math.round(matchup.awayScore * 100)
  const homeWinPct = Math.round(matchup.homeScore * 100)
  const awayMlOdds = fmtOdds(matchup.lines?.mlAway)
  const homeMlOdds = fmtOdds(matchup.lines?.mlHome)

  return (
    <>
      <style>{`
        @keyframes tm-neon-breathe {
          from { box-shadow: ${FP_SHADOW.replace('60px', '42px')}; }
          to   { box-shadow: ${FP_SHADOW}; }
        }
        .tm-card {
          display: grid;
          grid-template-columns: auto auto 1fr auto 1fr auto auto;
          align-items: stretch;
        }
        .tm-vdivider {
          width: 1px;
          background: ${DIVIDER};
          align-self: stretch;
        }
        @media (max-width: 700px) {
          .tm-card { grid-template-columns: 1fr !important; }
          .tm-vdivider { width: 100%; height: 1px; }
          .tm-meta   { flex-direction: row !important; flex-wrap: wrap; gap: 8px !important; }
          .tm-center { flex-direction: row !important; padding: 10px 16px !important; justify-content: center; gap: 16px !important; }
          .tm-center .tm-center-divider { display: none !important; }
          .tm-cta    { align-items: flex-start !important; padding: 12px 16px !important; }
          .tm-team   { padding: 12px 16px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tm-outer { animation: none !important; }
        }
      `}</style>

      <div
        className="tm-outer"
        style={{
          background:   FP_BG,
          border:       FP_BORDER,
          borderRadius: 12,
          overflow:     'hidden',
          width:        '100%',
          animation:    'tm-neon-breathe 4.5s ease-in-out infinite alternate',
        }}
      >
        <div className="tm-card">

          {/* ── 1. Left meta ─────────────────────────────────────────────── */}
          <div className="tm-meta" style={{
            padding:        '14px 16px',
            display:        'flex',
            flexDirection:  'column',
            justifyContent: 'center',
            gap:            7,
            minWidth:       110,
          }}>
            {/* ⚡ Top Matchup badge */}
            <span style={{
              background:    'rgba(0,0,0,0.82)',
              color:         '#22c55e',
              fontSize:      8,
              fontWeight:    900,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontFamily:    MONO,
              padding:       '3px 8px',
              borderRadius:  4,
              whiteSpace:    'nowrap',
              display:       'inline-block',
            }}>
              ⚡ Top Matchup
            </span>

            {/* League chip + game time on same row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize:      8,
                color:         'rgba(255,255,255,0.9)',
                fontWeight:    800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontFamily:    MONO,
                background:    'rgba(0,0,0,0.55)',
                padding:       '2px 6px',
                borderRadius:  3,
                whiteSpace:    'nowrap',
                border:        '1px solid rgba(0,0,0,0.25)',
              }}>
                {matchup.league.toUpperCase()}
              </span>
              {timeStr && (
                <span style={{
                  fontSize:      8,
                  color:         INK_MED,
                  fontFamily:    MONO,
                  letterSpacing: '0.08em',
                  whiteSpace:    'nowrap',
                }}>
                  {timeStr} ET
                </span>
              )}
            </div>
          </div>

          <div className="tm-vdivider" />

          {/* ── 2. Away team ─────────────────────────────────────────────── */}
          <div className="tm-team" style={{ padding: '14px 20px' }}>
            <TeamCol name={matchup.awayTeam} isHome={false} winPct={awayWinPct} mlOdds={awayMlOdds} />
          </div>

          <div className="tm-vdivider" />

          {/* ── 3. Center: VS + O/U ──────────────────────────────────────── */}
          <div className="tm-center" style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '14px 18px',
            gap:            6,
            minWidth:       72,
          }}>
            <div className="tm-center-divider" style={{ flex: 1, width: 1, background: DIVIDER }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: INK_FAINT, letterSpacing: '0.1em', fontFamily: MONO }}>VS</span>
            {ouTotal != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 7, color: INK_FAINT, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: 2 }}>O/U</div>
                <div style={{ fontSize: 16, color: INK, fontFamily: MONO, fontWeight: 700 }}>{ouTotal}</div>
              </div>
            )}
            <div className="tm-center-divider" style={{ flex: 1, width: 1, background: DIVIDER }} />
          </div>

          <div className="tm-vdivider" />

          {/* ── 4. Home team ─────────────────────────────────────────────── */}
          <div className="tm-team" style={{ padding: '14px 20px' }}>
            <TeamCol name={matchup.homeTeam} isHome={true} winPct={homeWinPct} mlOdds={homeMlOdds} />
          </div>

          <div className="tm-vdivider" />

          {/* ── 5. CTA button ────────────────────────────────────────────── */}
          <div className="tm-cta" style={{
            padding:        '14px 16px',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
          }}>
            <Link href={compareUrl} style={{ textDecoration: 'none' }}>
              <button
                style={{
                  background:    'rgba(0,0,0,0.82)',
                  border:        '2px solid rgba(0,0,0,0.9)',
                  borderRadius:  7,
                  padding:       '8px 14px',
                  color:         '#22c55e',
                  fontSize:      9,
                  fontWeight:    900,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor:        'pointer',
                  fontFamily:    OSWALD,
                  whiteSpace:    'nowrap',
                  textAlign:     'center',
                  lineHeight:    1.6,
                  transition:    'background 150ms ease-out, transform 150ms ease-out',
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = '#000'
                  b.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = 'rgba(0,0,0,0.82)'
                  b.style.transform = 'none'
                }}
              >
                VIEW FULL<br />COMPARISON →
              </button>
            </Link>
          </div>

        </div>
      </div>
    </>
  )
}
