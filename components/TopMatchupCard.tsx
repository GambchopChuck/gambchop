'use client'

import Link from 'next/link'
import { buildSvg } from '@/lib/svgChart'
import { TEAM_ROUTES } from '@/lib/teamRoutes'
import type { TopMatchupData } from '@/lib/topMatchups'

export type { TopMatchupData }

// ─── Design tokens ────────────────────────────────────────────────────────────

const ACCENT = '#39ff9a'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const MUTED  = '#52525b'
const TEXT   = '#f4f4f5'
const MONO   = 'var(--font-geist-mono), monospace'
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'

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

// ─── Moneyline chart strip ────────────────────────────────────────────────────

function MlStrip({ cells }: { cells: { result: string; date: string }[] }) {
  const svg = buildSvg(cells.slice(0, 10))
  if (!svg) {
    return <span style={{ fontSize: 10, color: '#3f3f46', fontFamily: MONO }}>no data</span>
  }
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ─── Team section (used for both away and home) ───────────────────────────────

function TeamSection({
  name, isHome, winPct, mlOdds, form,
}: {
  name:    string
  isHome:  boolean
  winPct:  number
  mlOdds:  string
  form:    { result: string; date: string }[]
}) {
  const route    = TEAM_ROUTES[name]
  const pctColor = winPct >= 55 ? ACCENT : winPct >= 45 ? TEXT : '#ef4444'

  return (
    <div className="tm-team" style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      {/* Team name + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {route ? (
          <Link href={route} style={{ textDecoration: 'none' }}>
            <span
              style={{ fontSize: 20, fontWeight: 700, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
              onMouseLeave={e => (e.currentTarget.style.color = TEXT)}
            >
              {name}
            </span>
          </Link>
        ) : (
          <span style={{ fontSize: 20, fontWeight: 700, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD }}>
            {name}
          </span>
        )}
        <span style={{
          fontSize: 7, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase',
          fontFamily: MONO, background: BORDER, padding: '2px 6px', borderRadius: 2, flexShrink: 0,
        }}>
          {isHome ? 'HOME' : 'AWAY'}
        </span>
      </div>

      {/* Season win rate */}
      <div style={{ fontSize: 11, color: pctColor, fontFamily: MONO, fontWeight: 700 }}>
        Season Win Rate: {winPct}%
      </div>

      {/* ML line + moneyline chart strip (spread row removed per spec) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: '0.14em',
            textTransform: 'uppercase', fontFamily: MONO, width: 22, flexShrink: 0,
          }}>
            ML
          </span>
          <span style={{ fontSize: 10, color: '#71717a', fontFamily: MONO }}>
            {mlOdds}
          </span>
        </div>
        <MlStrip cells={form} />
      </div>
    </div>
  )
}

// ─── Top Matchup Card ─────────────────────────────────────────────────────────
// Full-width horizontal banner layout.
// compact prop kept for API compatibility but ignored — card is always full-width.

interface Props {
  matchup:  TopMatchupData | null
  compact?: boolean   // legacy — unused in new layout
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
        /* Full-width horizontal layout — 5 columns: meta | away | center | home | cta */
        .tm-card {
          display: grid;
          grid-template-columns: auto 1fr auto 1fr auto;
          align-items: stretch;
        }
        .tm-vdivider {
          width: 1px;
          background: ${BORDER};
          align-self: stretch;
        }

        /* Mobile — stack vertically */
        @media (max-width: 700px) {
          .tm-card {
            grid-template-columns: 1fr !important;
          }
          .tm-vdivider {
            width: 100%;
            height: 1px;
          }
          .tm-meta   { flex-direction: row !important; flex-wrap: wrap; gap: 8px !important; }
          .tm-center { flex-direction: row !important; padding: 12px 20px !important; justify-content: center; gap: 20px !important; }
          .tm-center .tm-center-divider { display: none; }
          .tm-cta    { align-items: flex-start !important; padding: 16px 20px !important; }
          .tm-team   { padding: 16px 20px !important; }
        }
      `}</style>

      <div style={{
        background: CARD,
        border:     `1px solid ${BORDER}`,
        borderRadius: 12,
        overflow:   'hidden',
        position:   'relative',
        width:      '100%',
      }}>
        {/* Green top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(to right, ${ACCENT}, transparent)`,
        }} />

        <div className="tm-card">

          {/* ── 1. Left meta: badges + game time ─────────────────────── */}
          <div className="tm-meta" style={{
            padding: '22px 20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10,
            minWidth: 130,
          }}>
            <span style={{
              background: ACCENT, color: '#000',
              fontSize: 9, fontWeight: 900, letterSpacing: '0.18em',
              textTransform: 'uppercase', fontFamily: MONO,
              padding: '3px 8px', borderRadius: 4,
              boxShadow: `0 0 10px ${ACCENT}55`, whiteSpace: 'nowrap',
            }}>
              ⚡ Top Matchup
            </span>
            <span style={{
              fontSize: 9, color: ACCENT, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: MONO,
              background: `${ACCENT}15`, border: `1px solid ${ACCENT}33`,
              padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
            }}>
              {matchup.league.toUpperCase()}
            </span>
            {timeStr && (
              <span style={{
                fontSize: 9, color: MUTED, fontFamily: MONO,
                letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                Today · {timeStr} ET
              </span>
            )}
            <span style={{
              fontSize: 8, color: '#2a2a34', letterSpacing: '0.08em',
              fontFamily: MONO, textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>
              Powered by Gambchop Data
            </span>
          </div>

          <div className="tm-vdivider" />

          {/* ── 2. Away team ──────────────────────────────────────────── */}
          <div className="tm-team" style={{ padding: '22px 24px' }}>
            <TeamSection
              name={matchup.awayTeam}
              isHome={false}
              winPct={awayWinPct}
              mlOdds={awayMlOdds}
              form={matchup.awayForm.moneyline}
            />
          </div>

          <div className="tm-vdivider" />

          {/* ── 3. Center: VS + O/U total ─────────────────────────────── */}
          <div className="tm-center" style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '22px 20px', gap: 10,
            minWidth: 80,
          }}>
            <div className="tm-center-divider" style={{ flex: 1, width: 1, background: BORDER }} />
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#3f3f46',
              letterSpacing: '0.1em', fontFamily: MONO,
            }}>
              VS
            </span>
            {ouTotal != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 8, color: MUTED, letterSpacing: '0.1em',
                  textTransform: 'uppercase', fontFamily: MONO, marginBottom: 3,
                }}>
                  O/U
                </div>
                <div style={{ fontSize: 18, color: TEXT, fontFamily: MONO, fontWeight: 700 }}>
                  {ouTotal}
                </div>
              </div>
            )}
            <div className="tm-center-divider" style={{ flex: 1, width: 1, background: BORDER }} />
          </div>

          <div className="tm-vdivider" />

          {/* ── 4. Home team ──────────────────────────────────────────── */}
          <div className="tm-team" style={{ padding: '22px 24px' }}>
            <TeamSection
              name={matchup.homeTeam}
              isHome={true}
              winPct={homeWinPct}
              mlOdds={homeMlOdds}
              form={matchup.homeForm.moneyline}
            />
          </div>

          <div className="tm-vdivider" />

          {/* ── 5. Far right: Compare CTA ─────────────────────────────── */}
          <div className="tm-cta" style={{
            padding: '22px 20px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Link href={compareUrl} style={{ textDecoration: 'none' }}>
              <button
                style={{
                  background:    'none',
                  border:        `1px solid ${ACCENT}55`,
                  borderRadius:  7,
                  padding:       '10px 16px',
                  color:         ACCENT,
                  fontSize:      10,
                  fontWeight:    900,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor:        'pointer',
                  fontFamily:    OSWALD,
                  transition:    'all 0.15s',
                  boxShadow:     `0 0 10px ${ACCENT}22`,
                  whiteSpace:    'nowrap',
                  textAlign:     'center',
                  lineHeight:    1.6,
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = `${ACCENT}18`
                  b.style.boxShadow  = `0 0 18px ${ACCENT}44`
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = 'none'
                  b.style.boxShadow  = `0 0 10px ${ACCENT}22`
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
