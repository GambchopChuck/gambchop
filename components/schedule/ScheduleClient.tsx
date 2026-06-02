'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { TEAM_ROUTES } from '@/lib/teamRoutes'
import { buildSvg } from '@/lib/svgChart'
import type { ScheduleGame, OutcomeRow } from '@/app/schedule/page'
import TopMatchupCard from '@/components/TopMatchupCard'
import type { TopMatchupData } from '@/lib/topMatchups'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT  = '#39ff9a'
const MONO    = 'var(--font-geist-mono), monospace'
const FREE_CELLS = 3

const LEAGUE_TABS = [
  { key: 'mlb',  label: 'MLB',  active: true  },
  { key: 'nba',  label: 'NBA',  active: false },
  { key: 'nfl',  label: 'NFL',  active: false },
  { key: 'nhl',  label: 'NHL',  active: false },
  { key: 'wnba', label: 'WNBA', active: false },
] as const

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  games:        ScheduleGame[]
  error?:       string
  topMatchups?: TopMatchupData[]
}

// ─── ET helpers ───────────────────────────────────────────────────────────────

function toET(utc: string): { etDate: string; timeStr: string } {
  const d = new Date(utc)
  return {
    etDate:  d.toLocaleDateString('en-CA',  { timeZone: 'America/New_York' }),
    timeStr: d.toLocaleTimeString('en-US',  {
      timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true,
    }),
  }
}

function dateLabel(etDate: string): string {
  const today    = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (etDate === today)    return 'TODAY'
  if (etDate === tomorrow) return 'TOMORROW'
  const [y, m, d] = etDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
}

// ─── Pitcher name helper ──────────────────────────────────────────────────────

// Extract last name from a full name, skipping common suffixes (Jr., III, etc.)
function pitcherLastName(fullName: string | null | undefined): string {
  if (!fullName) return 'TBD'
  const SUFFIXES = new Set(['jr.', 'sr.', 'ii', 'iii', 'iv', 'v'])
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  let i = parts.length - 1
  while (i > 0 && SUFFIXES.has(parts[i].toLowerCase())) i--
  return parts[i] ?? fullName
}

// ─── Inline SVG icons (Tabler-style thin stroke — no external dependency) ──────

function StadiumIcon() {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block' }}
      aria-hidden
    >
      {/* Simplified stadium bowl outline */}
      <ellipse cx="12" cy="9" rx="10" ry="4" />
      <path d="M2 9v5c0 2.8 4.5 5 10 5s10-2.2 10-5V9" />
      <path d="M7 14v4M12 15v3M17 14v4" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block' }}
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.8 3.6-7 8-7s8 3.2 8 7" />
    </svg>
  )
}

// ─── Line formatting ──────────────────────────────────────────────────────────

function fmtOdds(n: number | null | undefined): string {
  if (n == null) return '--'
  return n >= 0 ? `+${n}` : `${n}`
}

function fmtSpread(point: number | null | undefined, juice: number | null | undefined): string {
  if (point == null) return '--'
  const p = point > 0 ? `+${point}` : `${point}`
  return juice != null ? `${p} (${fmtOdds(juice)})` : p
}

function fmtTotal(total: number | null | undefined, juice: number | null | undefined): string {
  if (total == null) return '--'
  return juice != null ? `${total} (${fmtOdds(juice)})` : `${total}`
}

// ─── Chart strip (auth-gated) ─────────────────────────────────────────────────

function ChartStrip({ cells, isPro }: { cells: OutcomeRow[]; isPro: boolean }) {
  const shown   = cells.slice(0, isPro ? 10 : FREE_CELLS)
  const svgHtml = buildSvg(shown)
  if (!svgHtml) {
    return (
      <span style={{ fontSize: 10, color: '#3f3f46', fontFamily: MONO }}>no data</span>
    )
  }
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  )
}

// ─── Team column ─────────────────────────────────────────────────────────────

function TeamColumn({
  name, isHome, chart, lines, isPro,
}: {
  name:   string
  isHome: boolean
  chart:  ScheduleGame['homeChart']
  lines:  ScheduleGame['lines']
  isPro:  boolean
}) {
  const route = TEAM_ROUTES[name]

  const mlOdds      = isHome ? fmtOdds(lines.mlHome)                              : fmtOdds(lines.mlAway)
  const spDisplay   = isHome ? fmtSpread(lines.spreadHome, lines.spreadJuice)     : fmtSpread(lines.spreadAway, lines.spreadJuice)
  const ouDisplay   = fmtTotal(lines.total, isHome ? lines.overJuice : lines.underJuice)

  const rows: { label: string; cells: OutcomeRow[]; line: string }[] = [
    { label: 'ML',  cells: chart.moneyline,  line: mlOdds    },
    { label: 'SP',  cells: chart.spread,     line: spDisplay },
    { label: 'O/U', cells: chart.over_under, line: ouDisplay },
  ]

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Team name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {route ? (
          <Link href={route} style={{ textDecoration: 'none' }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-oswald), sans-serif',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
            onMouseLeave={e => (e.currentTarget.style.color = '#f4f4f5')}
            >
              {name}
            </span>
          </Link>
        ) : (
          <span style={{
            fontSize: 14, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em',
            textTransform: 'uppercase', fontFamily: 'var(--font-oswald), sans-serif',
          }}>
            {name}
          </span>
        )}
        {isHome && (
          <span style={{
            fontSize: 7, fontWeight: 700, color: '#52525b', letterSpacing: '0.14em',
            textTransform: 'uppercase', fontFamily: MONO,
            background: '#1a1a24', padding: '1px 5px', borderRadius: 2,
          }}>
            HOME
          </span>
        )}
      </div>

      {/* Chart rows */}
      {rows.map(({ label, cells, line }) => (
        <div key={label} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              fontSize: 8, fontWeight: 700, color: '#52525b', letterSpacing: '0.14em',
              textTransform: 'uppercase', fontFamily: MONO, width: 22, flexShrink: 0,
            }}>
              {label}
            </span>
            <span style={{ fontSize: 10, color: '#71717a', fontFamily: MONO }}>
              {line}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChartStrip cells={cells} isPro={isPro} />
            {!isPro && cells.length > 0 && (
              <Link href="/pricing" style={{ textDecoration: 'none' }}>
                <span style={{
                  fontSize: 7, color: '#52525b', fontFamily: MONO,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  +{Math.max(0, cells.length - FREE_CELLS)} more →
                </span>
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Matchup card ─────────────────────────────────────────────────────────────

function MatchupCard({ game, isPro }: { game: ScheduleGame; isPro: boolean }) {
  const { etDate, timeStr } = toET(game.commenceTime)
  void etDate  // used by the parent grouping, not needed inside the card

  const awayLast = pitcherLastName(game.awayPitcher)
  const homeLast = pitcherLastName(game.homePitcher)
  const hasPitchers = game.awayPitcher !== null || game.homePitcher !== null

  return (
    <div style={{
      background: '#0a0a0f', border: '1px solid #1a1a24', borderRadius: 10,
      padding: '20px 24px', marginBottom: 12,
    }}>
      {/* Time header */}
      <div style={{
        fontSize: 9, color: '#52525b', letterSpacing: '0.22em',
        textTransform: 'uppercase', fontFamily: MONO,
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: '#71717a' }}>{timeStr} ET</span>
      </div>

      {/* Venue + pitcher meta — small muted, below time and above team columns */}
      {(game.venue || hasPitchers) && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14,
          marginBottom: 14,
          fontSize: 9, color: '#52525b', fontFamily: MONO, letterSpacing: '0.08em',
        }}>
          {game.venue && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#52525b' }}>
              <StadiumIcon />
              {game.venue.name} · {game.venue.city}
            </span>
          )}
          {hasPitchers && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#52525b' }}>
              <PersonIcon />
              SP: {awayLast} vs {homeLast}
            </span>
          )}
        </div>
      )}

      {/* Two team columns with VS divider */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        {/* Away */}
        <TeamColumn
          name={game.awayTeam} isHome={false}
          chart={game.awayChart} lines={game.lines} isPro={isPro}
        />

        {/* VS divider */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, width: 40, paddingTop: 4,
        }}>
          <div style={{ width: 1, height: 28, background: '#1a1a24' }} />
          <span style={{
            fontSize: 9, fontWeight: 700, color: '#3f3f46', letterSpacing: '0.1em',
            fontFamily: MONO, margin: '4px 0',
          }}>
            VS
          </span>
          <div style={{ width: 1, height: 28, background: '#1a1a24' }} />
        </div>

        {/* Home */}
        <TeamColumn
          name={game.homeTeam} isHome={true}
          chart={game.homeChart} lines={game.lines} isPro={isPro}
        />
      </div>

      {/* AI blurbs removed — use Top Matchups page for curated daily picks */}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ScheduleClient({ games, error, topMatchups = [] }: Props) {
  const { isPro } = useAuth()
  const pathname  = usePathname()

  const SUB_TABS = [
    { key: 'schedule',     label: 'SCHEDULE',        href: '/schedule'            },
    { key: 'top-matchups', label: 'TOP MATCHUPS ⚡',  href: '/schedule/top-matchups' },
  ] as const

  // Group games by ET date
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleGame[]>()
    for (const g of games) {
      const { etDate } = toET(g.commenceTime)
      const list = map.get(etDate) ?? []
      list.push(g)
      map.set(etDate, list)
    }
    // Sort date keys ascending
    return Array.from(map.entries()).sort(([a], [b]) => a < b ? -1 : 1)
  }, [games])

  return (
    <div style={{ paddingLeft: 64, minHeight: '100vh' }}>

      {/* ── Sticky header (sub-nav + league filter) ───────────────────────── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 30,
        background: 'rgba(8,8,13,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1a1a24',
      }}>
        {/* Sub-nav row: SCHEDULE | TOP MATCHUPS */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 4, height: 44,
          borderBottom: '1px solid #12121a',
        }}>
          {SUB_TABS.map(tab => {
            const isActive = pathname === tab.href
            return (
              <Link key={tab.key} href={tab.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background:    isActive ? ACCENT : 'transparent',
                  color:         isActive ? '#000' : '#3f3f46',
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

        {/* League filter row */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 4, height: 48,
        }}>
          {LEAGUE_TABS.map(tab => (
            <div key={tab.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                disabled={!tab.active}
                style={{
                  background:    tab.active ? ACCENT : 'transparent',
                  color:         tab.active ? '#000' : '#3f3f46',
                  border:        tab.active ? 'none' : '1px solid transparent',
                  borderRadius:  6, padding: '5px 14px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', cursor: tab.active ? 'pointer' : 'default',
                  fontFamily: MONO, transition: 'all 0.15s',
                  boxShadow: tab.active ? `0 0 12px ${ACCENT}55` : 'none',
                }}
              >
                {tab.label}
              </button>
              {!tab.active && (
                <span style={{
                  fontSize: 7, fontWeight: 700, color: '#52525b',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  fontFamily: MONO, background: '#1a1a24',
                  padding: '1px 5px', borderRadius: 2,
                }}>
                  SOON
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{
          fontSize: 10, color: '#52525b', letterSpacing: '0.3em',
          textTransform: 'uppercase', margin: '0 0 6px', fontFamily: MONO,
        }}>
          Upcoming matchups
        </p>
        <h1 style={{
          fontSize: 28, fontWeight: 900, color: '#f4f4f5',
          letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
          fontFamily: 'var(--font-oswald), sans-serif',
        }}>
          Schedule
        </h1>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 64px' }}>

        {/* Today's Top Matchups — powered by cron-cached data */}
        {topMatchups.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: MONO }}>
                Today's Top Matchups
              </span>
              <div style={{ flex: 1, height: 1, background: '#1a1a24' }} />
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))',
              gap: 12,
            }}>
              {topMatchups.map((tm, i) => (
                <TopMatchupCard key={`${tm.league}-${i}`} matchup={tm} compact={false} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: '#1a0a0a', border: '1px solid #ef444433', borderRadius: 8,
            padding: '14px 18px', fontSize: 12, color: '#ef4444', fontFamily: MONO,
            marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {!error && grouped.length === 0 && (
          <div style={{
            padding: '80px 24px', textAlign: 'center',
            fontSize: 13, color: '#52525b', fontFamily: MONO,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            No upcoming games found in the next 7 days.
          </div>
        )}

        {grouped.map(([etDate, dayGames]) => (
          <div key={etDate} style={{ marginBottom: 40 }}>
            {/* Date header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: ACCENT,
                letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: MONO,
              }}>
                {dateLabel(etDate)}
              </span>
              <div style={{ flex: 1, height: 1, background: '#1a1a24' }} />
              <span style={{ fontSize: 9, color: '#3f3f46', fontFamily: MONO }}>
                {dayGames.length} {dayGames.length === 1 ? 'game' : 'games'}
              </span>
            </div>

            {/* Game cards grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
              gap: 12,
            }}>
              {dayGames.map(game => (
                <MatchupCard key={game.id} game={game} isPro={isPro} />
              ))}
            </div>
          </div>
        ))}

        {/* Pro upsell banner for free users */}
        {!isPro && grouped.length > 0 && (
          <div style={{
            marginTop: 24,
            background: `linear-gradient(135deg, ${ACCENT}0d 0%, #8b5cf60d 100%)`,
            border: `1px solid ${ACCENT}33`, borderRadius: 10,
            padding: '20px 24px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <p style={{
                fontSize: 13, fontWeight: 700, color: '#f4f4f5', margin: '0 0 4px',
                fontFamily: 'var(--font-oswald), sans-serif',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                See the full 10-game chart strip
              </p>
              <p style={{ fontSize: 11, color: '#71717a', margin: 0, fontFamily: MONO }}>
                Pro members see all 10 outcome cells per team and bet type.
              </p>
            </div>
            <Link href="/pricing" style={{ textDecoration: 'none' }}>
              <button style={{
                background: ACCENT, color: '#000', border: 'none', borderRadius: 6,
                fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '9px 20px', cursor: 'pointer',
                fontFamily: MONO, boxShadow: `0 0 16px ${ACCENT}44`,
              }}>
                Go Pro →
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
