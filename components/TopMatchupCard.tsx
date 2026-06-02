'use client'

import Link from 'next/link'
import { buildSvg } from '@/lib/svgChart'
import { TEAM_ROUTES } from '@/lib/teamRoutes'
import type { TopMatchupData } from '@/lib/topMatchups'

// Re-export for convenience
export type { TopMatchupData }

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#39ff9a'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const MUTED  = '#52525b'
const TEXT   = '#f4f4f5'
const MONO   = 'var(--font-geist-mono), monospace'
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toET(utc: string | null | undefined): { etDate: string; timeStr: string } | null {
  if (!utc) return null
  const d = new Date(utc)
  if (isNaN(d.getTime())) return null
  return {
    etDate:  d.toLocaleDateString('en-CA',  { timeZone: 'America/New_York' }),
    timeStr: d.toLocaleTimeString('en-US',  { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true }),
  }
}

function fmtOdds(n: number | null | undefined): string {
  if (n == null) return '--'
  return n >= 0 ? `+${n}` : `${n}`
}

function fmtSpread(point: number | null | undefined, juice: number | null | undefined): string {
  if (point == null) return '--'
  const p = point > 0 ? `+${point}` : `${point}`
  return juice != null ? `${p} (${fmtOdds(juice)})` : p
}

function teamSlug(name: string): string {
  const route = TEAM_ROUTES[name]
  if (route) return route.split('/').pop() ?? slugify(name)
  return slugify(name)
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ─── Chart strip ──────────────────────────────────────────────────────────────

function Strip({ cells }: { cells: { result: string; date: string }[] }) {
  const svg = buildSvg(cells.slice(0, 10))
  if (!svg) return <span style={{ fontSize: 10, color: '#3f3f46', fontFamily: MONO }}>no data</span>
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ─── Team side ────────────────────────────────────────────────────────────────

interface TeamSideProps {
  name:     string
  score:    number
  form:     TopMatchupData['homeForm']
  isHome:   boolean
  compact:  boolean
  mlOdds:   string
  spLine:   string
}

function TeamSide({ name, score, form, isHome, compact, mlOdds, spLine }: TeamSideProps) {
  const route = TEAM_ROUTES[name]
  const pct   = Math.round(score * 100)
  const pctColor = pct >= 55 ? ACCENT : pct >= 45 ? '#f4f4f5' : '#ef4444'

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Team name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {route ? (
          <Link href={route} style={{ textDecoration: 'none' }}>
            <span
              style={{ fontSize: 15, fontWeight: 700, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
              onMouseLeave={e => (e.currentTarget.style.color = TEXT)}
            >
              {name}
            </span>
          </Link>
        ) : (
          <span style={{ fontSize: 15, fontWeight: 700, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: OSWALD }}>{name}</span>
        )}
        {isHome && (
          <span style={{ fontSize: 7, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: MONO, background: '#1a1a24', padding: '1px 5px', borderRadius: 2 }}>
            HOME
          </span>
        )}
      </div>

      {/* Win rate */}
      <div style={{ fontSize: 11, color: pctColor, fontFamily: MONO, marginBottom: compact ? 0 : 10, fontWeight: 700 }}>
        Season Win Rate: {pct}%
      </div>

      {/* Chart strips — full version only */}
      {!compact && (
        <div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: MONO, width: 22, flexShrink: 0 }}>ML</span>
              <span style={{ fontSize: 10, color: '#71717a', fontFamily: MONO }}>{mlOdds}</span>
            </div>
            <Strip cells={form.moneyline} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: MONO, width: 22, flexShrink: 0 }}>SP</span>
              <span style={{ fontSize: 10, color: '#71717a', fontFamily: MONO }}>{spLine}</span>
            </div>
            <Strip cells={form.spread} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Top Matchup Card ─────────────────────────────────────────────────────────

interface Props {
  matchup: TopMatchupData | null
  compact?: boolean
}

export default function TopMatchupCard({ matchup, compact = false }: Props) {
  if (!matchup) return null

  const et       = toET(matchup.lines?.commenceTime)
  const awaySlug = teamSlug(matchup.awayTeam)
  const homeSlug = teamSlug(matchup.homeTeam)
  const compareUrl = `/compare?team1=${awaySlug}&team2=${homeSlug}`

  const awayMlOdds = fmtOdds(matchup.lines?.mlAway)
  const homeMlOdds = fmtOdds(matchup.lines?.mlHome)
  const awaySpLine = fmtSpread(matchup.lines?.spreadAway, matchup.lines?.spreadJuice)
  const homeSpLine = fmtSpread(matchup.lines?.spreadHome, matchup.lines?.spreadJuice)

  const leagueLabel = matchup.league.toUpperCase()

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: compact ? '16px 20px' : '20px 24px',
      marginBottom: 12,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle green top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${ACCENT}, transparent)` }} />

      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: compact ? 12 : 16 }}>
        <span style={{
          background: ACCENT, color: '#000',
          fontSize: 9, fontWeight: 900, letterSpacing: '0.18em',
          textTransform: 'uppercase', fontFamily: MONO,
          padding: '3px 8px', borderRadius: 4,
          boxShadow: `0 0 10px ${ACCENT}55`,
        }}>
          ⚡ Top Matchup
        </span>
        <span style={{
          fontSize: 9, color: ACCENT, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: MONO,
          background: `${ACCENT}15`, border: `1px solid ${ACCENT}33`,
          padding: '2px 7px', borderRadius: 3,
        }}>
          {leagueLabel}
        </span>
        <span style={{ fontSize: 9, color: '#3f3f46', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', marginLeft: 'auto' }}>
          Powered by Gambchop Data
        </span>
      </div>

      {/* Game time */}
      {et && (
        <div style={{ fontSize: 9, color: '#71717a', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: compact ? 12 : 16 }}>
          Today · {et.timeStr} ET
        </div>
      )}

      {/* Two team columns with VS divider */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', marginBottom: compact ? 12 : 16 }}>

        {/* Away team */}
        <TeamSide
          name={matchup.awayTeam}
          score={matchup.awayScore}
          form={matchup.awayForm}
          isHome={false}
          compact={compact}
          mlOdds={awayMlOdds}
          spLine={awaySpLine}
        />

        {/* VS divider with current lines */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'flex-start', flexShrink: 0,
          width: compact ? 56 : 80, paddingTop: 4, gap: 6,
        }}>
          <div style={{ width: 1, height: 24, background: BORDER }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#3f3f46', letterSpacing: '0.1em', fontFamily: MONO }}>VS</span>
          <div style={{ width: 1, height: 24, background: BORDER }} />

          {/* Lines between VS */}
          {!compact && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <div style={{ fontSize: 8, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: 4 }}>O/U</div>
              <div style={{ fontSize: 10, color: '#a1a1aa', fontFamily: MONO }}>
                {matchup.lines?.total != null ? matchup.lines.total : '--'}
              </div>
            </div>
          )}
        </div>

        {/* Home team */}
        <TeamSide
          name={matchup.homeTeam}
          score={matchup.homeScore}
          form={matchup.homeForm}
          isHome={true}
          compact={compact}
          mlOdds={homeMlOdds}
          spLine={homeSpLine}
        />
      </div>

      {/* Lines bar (compact uses this instead of inline) */}
      {compact && (
        <div style={{
          display: 'flex', gap: 20, flexWrap: 'wrap',
          padding: '8px 0', borderTop: `1px solid ${BORDER}`, marginBottom: 12,
          fontSize: 10, color: '#71717a', fontFamily: MONO,
        }}>
          <span>ML: <b style={{ color: TEXT }}>{awayMlOdds}</b> / <b style={{ color: TEXT }}>{homeMlOdds}</b></span>
          <span>SP: <b style={{ color: TEXT }}>{awaySpLine}</b> / <b style={{ color: TEXT }}>{homeSpLine}</b></span>
          {matchup.lines?.total != null && (
            <span>O/U: <b style={{ color: TEXT }}>{matchup.lines.total}</b></span>
          )}
        </div>
      )}

      {/* Compare CTA */}
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
        <Link href={compareUrl} style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'none',
            border: `1px solid ${ACCENT}55`,
            borderRadius: 7, padding: '8px 20px',
            color: ACCENT, fontSize: 11, fontWeight: 900,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: OSWALD,
            transition: 'all 0.15s',
            boxShadow: `0 0 10px ${ACCENT}22`,
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
            View Full Comparison →
          </button>
        </Link>
      </div>
    </div>
  )
}
