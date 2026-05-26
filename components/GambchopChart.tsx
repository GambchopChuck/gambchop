'use client'

import { useState } from 'react'
import type { TeamChartData, GameEntry, BetResult } from '@/lib/leagues-data'
import type { MemberTier } from '@/lib/auth-context'
import { useFilters } from '@/lib/filter-context'
import type { VisibleRows } from '@/lib/filter-context'
import { computeStreak } from '@/lib/chart-data'

const FREE_COLS = 3

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  green:  '#22c55e',
  red:    '#ef4444',
  gold:   '#eab308',
  orange: '#f97316',
  royal:  '#2563eb',
  purple: '#9333ea',
  teal:   '#14b8a6',
  silver: '#94a3b8',
  violet: '#8b5cf6',
  brown:  '#b45309',
  white:  '#f4f4f5',
  empty:  '#131318',
}

// ─── Record helpers ───────────────────────────────────────────────────────────

interface WL { w: number; l: number }

const rec = {
  ml:     (g: GameEntry[]): WL => ({ w: g.filter(x => x.moneylineResult === 'win').length,  l: g.filter(x => x.moneylineResult === 'loss').length }),
  spread: (g: GameEntry[]): WL => ({ w: g.filter(x => x.spreadResult === 'win').length,     l: g.filter(x => x.spreadResult === 'loss').length }),
  mlFav:  (g: GameEntry[]): WL => rec.ml(g.filter(x =>  x.isFavorite)),
  mlDog:  (g: GameEntry[]): WL => rec.ml(g.filter(x => !x.isFavorite)),
  spFav:  (g: GameEntry[]): WL => rec.spread(g.filter(x =>  x.isSpreadFavorite)),
  spDog:  (g: GameEntry[]): WL => rec.spread(g.filter(x => !x.isSpreadFavorite)),
  home:   (g: GameEntry[]): WL => rec.ml(g.filter(x =>  x.isHome)),
  away:   (g: GameEntry[]): WL => rec.ml(g.filter(x => !x.isHome)),
  ou:     (g: GameEntry[])      => ({ o: g.filter(x => x.ouResult === 'over').length, u: g.filter(x => x.ouResult === 'under').length }),
}

function wlColor(r: WL) { return r.w > r.l ? '#4ade80' : r.w < r.l ? '#f87171' : '#52525b' }

function RecordBadge({ r }: { r: WL }) {
  return <span style={{ color: wlColor(r), fontSize: 10, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>&nbsp;({r.w}-{r.l})</span>
}
function OUBadge({ o, u }: { o: number; u: number }) {
  const color = o > u ? C.violet : o < u ? C.brown : '#52525b'
  return <span style={{ color, fontSize: 10, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>&nbsp;({o}-{u})</span>
}

// ─── Calendar cells ───────────────────────────────────────────────────────────

type RowKey = 'moneyline' | 'spread' | 'ml-fav' | 'ml-dog' | 'sp-fav' | 'sp-dog' | 'home' | 'away' | 'ou'

function WLCell({ result, winLabel = 'W', lossLabel = 'L' }: { result: BetResult; winLabel?: string; lossLabel?: string }) {
  if (!result) return <div className="cell" style={{ background: C.empty, opacity: 0.3 }} />
  const s = {
    win:  { bg: C.green,  color: '#000', glow: `0 0 12px ${C.green}80`,  label: winLabel  },
    loss: { bg: C.red,    color: '#fff', glow: `0 0 12px ${C.red}80`,    label: lossLabel },
    push: { bg: C.white,  color: '#111', glow: 'none',                   label: 'P'       },
  }[result]
  return <div className="cell" style={{ background: s.bg, color: s.color, boxShadow: s.glow, fontWeight: 800, fontSize: result === 'push' ? 10 : 11 }}>{s.label}</div>
}

function ConditionCell({ active, result, color, glow }: { active: boolean; result: BetResult; color: string; glow: string }) {
  if (!active) return <div className="cell" style={{ background: C.empty }} />
  if (!result) return <div className="cell" style={{ background: C.empty, opacity: 0.3 }} />
  if (result === 'push') return <div className="cell" style={{ background: C.white, color: '#111', fontWeight: 800, fontSize: 10 }}>P</div>
  const won = result === 'win'
  return (
    <div className="cell" style={{
      background: won ? color : C.red,
      color:      won ? '#000' : '#fff',
      boxShadow:  won ? glow  : `0 0 12px ${C.red}80`,
      fontWeight: 800, fontSize: 11,
    }}>
      {won ? 'W' : 'L'}
    </div>
  )
}

function OUCell({ r }: { r: 'over' | 'under' | 'push' | null }) {
  if (!r) return <div className="cell" style={{ background: C.empty, opacity: 0.3 }} />
  const s = {
    over:  { bg: C.violet, glow: `0 0 14px ${C.violet}90` },
    under: { bg: C.brown,  glow: `0 0 14px ${C.brown}90`  },
    push:  { bg: C.white,  glow: 'none'                   },
  }[r]
  return <div className="cell" style={{ background: s.bg, boxShadow: s.glow }} />
}

// Single game cell for a calendar day
function CalendarCell({ rowKey, game }: { rowKey: RowKey; game: GameEntry }) {
  switch (rowKey) {
    case 'moneyline': return <WLCell result={game.moneylineResult} />
    case 'spread':    return <WLCell result={game.spreadResult} winLabel="COV" lossLabel="L" />
    case 'ml-fav':    return <ConditionCell active={game.isFavorite}        result={game.moneylineResult} color={C.gold}   glow={`0 0 10px ${C.gold}80`}   />
    case 'ml-dog':    return <ConditionCell active={!game.isFavorite}       result={game.moneylineResult} color={C.orange} glow={`0 0 10px ${C.orange}80`} />
    case 'sp-fav':    return <ConditionCell active={game.isSpreadFavorite}  result={game.spreadResult}    color={C.royal}  glow={`0 0 10px ${C.royal}80`}  />
    case 'sp-dog':    return <ConditionCell active={!game.isSpreadFavorite} result={game.spreadResult}    color={C.purple} glow={`0 0 10px ${C.purple}80`} />
    case 'home':      return <ConditionCell active={game.isHome}            result={game.moneylineResult} color={C.teal}   glow={`0 0 10px ${C.teal}80`}   />
    case 'away':      return <ConditionCell active={!game.isHome}           result={game.moneylineResult} color={C.silver} glow={`0 0 10px ${C.silver}60`}  />
    case 'ou':        return <OUCell r={game.ouResult} />
    default:          return null
  }
}

// Doubleheader: two half-height cells stacked
function DoubleheaderCell({ rowKey, g1, g2 }: { rowKey: RowKey; g1: GameEntry; g2: GameEntry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '0 3px', gap: 1, borderRadius: 5, overflow: 'hidden' }}>
      <div className="cell-half"><CalendarCell rowKey={rowKey} game={g1} /></div>
      <div className="cell-half"><CalendarCell rowKey={rowKey} game={g2} /></div>
    </div>
  )
}

// ─── Row config ───────────────────────────────────────────────────────────────

interface RowMeta { key: RowKey; label: string; accent: string; record: (g: GameEntry[]) => React.ReactNode }

const ROWS: RowMeta[] = [
  { key: 'moneyline', label: 'Moneyline',      accent: C.green,  record: g => <RecordBadge r={rec.ml(g)} />     },
  { key: 'spread',    label: 'Spread',          accent: C.green,  record: g => <RecordBadge r={rec.spread(g)} /> },
  { key: 'ml-fav',   label: 'ML Favorite',     accent: C.gold,   record: g => <RecordBadge r={rec.mlFav(g)} />  },
  { key: 'ml-dog',   label: 'ML Underdog',     accent: C.orange, record: g => <RecordBadge r={rec.mlDog(g)} />  },
  { key: 'sp-fav',   label: 'Spread Favorite', accent: C.royal,  record: g => <RecordBadge r={rec.spFav(g)} />  },
  { key: 'sp-dog',   label: 'Spread Dog',      accent: C.purple, record: g => <RecordBadge r={rec.spDog(g)} />  },
  { key: 'home',     label: 'Home',            accent: C.teal,   record: g => <RecordBadge r={rec.home(g)} />   },
  { key: 'away',     label: 'Away',            accent: C.silver, record: g => <RecordBadge r={rec.away(g)} />   },
  { key: 'ou',       label: 'Over / Under',    accent: C.violet, record: g => { const {o,u} = rec.ou(g); return <OUBadge o={o} u={u} /> } },
]

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND = [
  { bg: C.green, label: 'Win / Cover' }, { bg: C.red, label: 'Loss / Miss' }, { bg: C.white, label: 'Push' },
  { bg: C.gold, label: 'ML Fav' }, { bg: C.orange, label: 'ML Dog' }, { bg: C.royal, label: 'Sp Fav' },
  { bg: C.purple, label: 'Sp Dog' }, { bg: C.teal, label: 'Home' }, { bg: C.silver, label: 'Away' },
  { bg: C.violet, label: 'Over' }, { bg: C.brown, label: 'Under' },
]

function formatUpdatedAgo(iso: string | null | undefined): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (isNaN(then)) return null
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1)  return 'Updated just now'
  if (mins < 60) return `Updated ${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `Updated ${hrs}h ago`
  return `Updated ${Math.floor(hrs / 24)}d ago`
}

function Legend({ lastUpdated }: { lastUpdated?: string | null }) {
  const updatedLabel = formatUpdatedAgo(lastUpdated)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 18px', padding: '12px 20px 14px', borderBottom: '1px solid #1a1a24' }}>
      {LEGEND.map(({ bg, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, background: bg, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        </div>
      ))}
      {updatedLabel && (
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#3f3f46', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>
          ◷ {updatedLabel}
        </span>
      )}
    </div>
  )
}

// ─── Month navigator ──────────────────────────────────────────────────────────

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function MonthNav({ year, month, onPrev, onNext, canPrev, canNext }: {
  year: number; month: number
  onPrev: () => void; onNext: () => void
  canPrev: boolean; canNext: boolean
}) {
  const btnBase: React.CSSProperties = {
    background: 'none', border: '1px solid #1a1a24', borderRadius: 5,
    color: '#a1a1aa', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 13, lineHeight: 1, padding: '4px 10px',
    transition: 'all 0.15s',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '10px 20px 8px', borderBottom: '1px solid #1a1a24' }}>
      <button
        onClick={onPrev}
        disabled={!canPrev}
        style={{ ...btnBase, opacity: canPrev ? 1 : 0.25, cursor: canPrev ? 'pointer' : 'default' }}
      >
        ←
      </button>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.18em', minWidth: 90, textAlign: 'center' }}>
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{ ...btnBase, opacity: canNext ? 1 : 0.25, cursor: canNext ? 'pointer' : 'default' }}
      >
        →
      </button>
    </div>
  )
}

// ─── Date header ─────────────────────────────────────────────────────────────

const LABEL_W = 220
const COL_W   = 40
const DOW     = ['S','M','T','W','T','F','S']

function DateHeader({ year, month, daysInMonth, populatedDays }: {
  year: number; month: number; daysInMonth: number; populatedDays: Set<number>
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #1a1a24', padding: '8px 0 6px', background: '#0a0a0f' }}>
      <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: '#0a0a0f', paddingLeft: 20, zIndex: 20 }}>
        <span style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Team / Metric</span>
      </div>
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const dow = new Date(year, month - 1, day).getDay()
        const hasGame = populatedDays.has(day)
        return (
          <div key={day} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 7, color: '#2a2a34', letterSpacing: '0.05em' }}>{DOW[dow]}</span>
            <span style={{ fontSize: 9, color: hasGame ? '#d4d4d8' : '#2a2a34', fontWeight: hasGame ? 700 : 400, letterSpacing: '0.02em' }}>{day}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Paywall overlays ─────────────────────────────────────────────────────────

function NoMemberOverlay({ onJoin, onPro }: { onJoin: () => void; onPro: () => void }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(to bottom, #0a0a0f99 0%, #0a0a0fcc 40%, #0a0a0f 100%)',
      zIndex: 10, backdropFilter: 'blur(2px)',
    }}>
      <div style={{ textAlign: 'center', padding: '32px', background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 16, maxWidth: 400 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Membership Required</div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 10px' }}>View Team Charts</h3>
        <p style={{ fontSize: 11, color: '#71717a', margin: '0 0 24px', lineHeight: 1.6 }}>
          Free members see the last 3 game days.<br />Pro members get the full season.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onJoin} style={{
            background: 'none', border: '1px solid #2a2a34', borderRadius: 8,
            color: '#a1a1aa', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer', padding: '10px 20px', fontFamily: 'inherit',
          }}>Join Free — Last 3 Game Days</button>
          <button onClick={onPro} style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 8,
            color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer', padding: '10px 20px', fontFamily: 'inherit',
            boxShadow: '0 0 16px #22c55e44',
          }}>Go Pro — Full Season</button>
        </div>
      </div>
    </div>
  )
}

// ─── Row visibility mapping ───────────────────────────────────────────────────

const ROW_VISIBLE_KEY: Record<RowKey, keyof VisibleRows> = {
  moneyline: 'moneyline',
  spread:    'spread',
  'ml-fav':  'ml_favorite',
  'ml-dog':  'ml_underdog',
  'sp-fav':  'spread_favorite',
  'sp-dog':  'spread_dog',
  home:      'home',
  away:      'away',
  ou:        'over_under',
}

const ROW_STAR: Partial<Record<RowKey, string>> = {
  moneyline: 'moneyline',
  spread:    'spread',
  'ml-fav':  'ml_favorite',
  'ml-dog':  'ml_underdog',
  'sp-fav':  'spread_favorite',
  'sp-dog':  'spread_dog',
  home:      'home',
  away:      'away',
  ou:        'over_under',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:         TeamChartData[]        // month's games (for cell rendering)
  seasonData?:  TeamChartData[]        // full-season games (for records/streaks)
  viewYear:     number
  viewMonth:    number                 // 1-indexed
  onPrevMonth:  () => void
  onNextMonth:  () => void
  canPrevMonth: boolean
  canNextMonth: boolean
  memberTier?:  MemberTier
  isPro?:       boolean
  onJoin?:      () => void
  onUpgrade?:   () => void
  accent?:      string
  starredBetTypes?:  Set<string>
  onStarClick?:      (betType: string, teamName: string) => void
  lastUpdated?:      string | null
}

// ─── Main chart ───────────────────────────────────────────────────────────────

export default function GambchopChart({
  data, seasonData,
  viewYear, viewMonth, onPrevMonth, onNextMonth, canPrevMonth, canNextMonth,
  memberTier, isPro, onJoin, onUpgrade,
  accent = C.green, starredBetTypes, onStarClick, lastUpdated,
}: Props) {
  const [showBanner, setShowBanner] = useState(false)
  const { visibleRows, setVisibleRows, filterChips, isFiltered, activeCount, resetFilters } = useFilters()
  const allRowsHidden = Object.values(visibleRows).every(v => !v)

  const tier: MemberTier = memberTier ?? (isPro ? 'pro' : 'free')
  const handleUpgrade = () => { if (onUpgrade) onUpgrade(); else setShowBanner(true) }
  const handleJoin    = () => { if (onJoin) onJoin() }

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()

  // Union of all game days across all teams — used to highlight the date header
  const allPopulatedDays = new Set<number>()
  for (const team of data) {
    for (const g of team.games) {
      const day = parseInt(g.rawDate.split('-')[2] ?? '0', 10)
      if (day > 0) allPopulatedDays.add(day)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <MonthNav
        year={viewYear} month={viewMonth}
        onPrev={onPrevMonth} onNext={onNextMonth}
        canPrev={canPrevMonth} canNext={canNextMonth}
      />
      <Legend lastUpdated={lastUpdated} />

      {/* Active filters bar */}
      {isFiltered && tier !== 'none' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          padding: '8px 20px', background: '#0b0b10', borderBottom: '1px solid #1a1a24',
        }}>
          <span style={{ fontSize: 8, color: C.green, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800, flexShrink: 0 }}>
            ◧ {activeCount} Filter{activeCount !== 1 ? 's' : ''}
          </span>
          {filterChips.map(({ key, label }) => (
            <div key={key as string} style={{
              background: `${C.green}11`, border: `1px solid ${C.green}33`,
              borderRadius: 4, padding: '2px 6px',
              fontSize: 9, color: C.green, letterSpacing: '0.06em', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {label}
              <button
                onClick={() => setVisibleRows({ ...visibleRows, [key]: true })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.green, fontSize: 10, lineHeight: 1, fontFamily: 'inherit' }}
              >×</button>
            </div>
          ))}
          <button
            onClick={resetFilters}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 9, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'inherit', textDecoration: 'underline', padding: 0, flexShrink: 0,
            }}
          >Clear All</button>
        </div>
      )}

      {tier !== 'pro' && showBanner && (
        <div style={{ background: '#8b5cf60d', border: '1px solid #8b5cf633', borderRadius: 10, padding: '14px 20px', margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Upgrade to unlock full season</div>
            <div style={{ fontSize: 10, color: '#52525b', marginTop: 4 }}>
              {tier === 'free' ? `Showing last ${FREE_COLS} game days. Pro unlocks every month for every team.` : 'Pro unlocks the complete season for every team.'}
            </div>
          </div>
          <button
            onClick={handleUpgrade}
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: 8, padding: '10px 18px', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
          >
            Go Pro →
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ minWidth: LABEL_W + daysInMonth * COL_W + 24, position: 'relative' }}>

          {/* No-member blur over the whole chart body */}
          {tier === 'none' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, filter: 'blur(6px)', pointerEvents: 'none' }} aria-hidden />
          )}

          <DateHeader year={viewYear} month={viewMonth} daysInMonth={daysInMonth} populatedDays={allPopulatedDays} />

          {data.map((team, ti) => {
            // Build day → games lookup for this team
            const dayMap = new Map<number, GameEntry[]>()
            for (const g of team.games) {
              const day = parseInt(g.rawDate.split('-')[2] ?? '0', 10)
              if (day > 0) {
                if (!dayMap.has(day)) dayMap.set(day, [])
                dayMap.get(day)!.push(g)
              }
            }

            // Sorted list of game days for this team — determines freemium visibility
            const populatedDays = Array.from(dayMap.keys()).sort((a, b) => a - b)
            const visibleDaySet = tier === 'pro'
              ? new Set(populatedDays)
              : new Set(populatedDays.slice(-FREE_COLS))

            // Full-season games for records/streaks (fallback to month data)
            const seasonTeam  = (seasonData ?? []).find(t => t.teamName === team.teamName)
            const seasonGames = seasonTeam?.games ?? team.games

            const mlStreak = computeStreak(seasonGames, 'moneyline')
            const spStreak = computeStreak(seasonGames, 'spread')
            const ouStreak = computeStreak(seasonGames, 'over_under')
            const streakFor: Partial<Record<RowKey, typeof mlStreak>> = {
              moneyline: mlStreak,
              spread:    spStreak,
              ou:        ouStreak,
            }

            return (
              <div key={team.teamName}>
                {ti > 0 && ti % 5 === 0 && (
                  <DateHeader year={viewYear} month={viewMonth} daysInMonth={daysInMonth} populatedDays={allPopulatedDays} />
                )}

                {/* Team label row */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 20, background: '#0a0a0f', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 3, alignSelf: 'stretch', background: accent, marginRight: 16, borderRadius: '0 2px 2px 0', minHeight: 46 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.3 }}>{team.teamName}</div>
                      <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>{populatedDays.length} Games</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, height: 46, alignSelf: 'center', background: `linear-gradient(to right, ${accent}0d 0%, transparent 60%)`, borderTop: '1px solid #1a1a24', borderBottom: '1px solid #1a1a24', marginTop: 8 }} />
                </div>

                {allRowsHidden && (
                  <div style={{ padding: '14px 20px', fontSize: 10, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    No rows selected — open filters to enable rows
                  </div>
                )}

                {ROWS.filter(row => visibleRows[ROW_VISIBLE_KEY[row.key]]).map((row, ri) => {
                  const rowBg = ri % 2 === 0 ? '#0a0a0f' : '#0d0d14'
                  return (
                    <div key={row.key} style={{ display: 'flex', alignItems: 'center', background: rowBg }}>
                      {/* Label column */}
                      <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, background: rowBg, height: 34, display: 'flex', alignItems: 'center', paddingLeft: 19 }}>
                        <div style={{ width: 2, height: 12, background: row.accent, borderRadius: 2, marginRight: 10, flexShrink: 0, opacity: 0.85 }} />
                        <span style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.label}</span>
                        {row.record(seasonGames)}
                        {(() => {
                          const s = streakFor[row.key]
                          if (!s) return null
                          const color = (s.type === 'W' || s.type === 'O') ? '#22c55e'
                            : (s.type === 'L' || s.type === 'U') ? '#ef4444'
                            : '#52525b'
                          return (
                            <span style={{ fontSize: 9, color, fontWeight: 800, letterSpacing: '0.05em', marginLeft: 5, flexShrink: 0 }}>
                              · {s.type}{s.count}
                            </span>
                          )
                        })()}
                        {onStarClick && (() => {
                          const bt = ROW_STAR[row.key]
                          if (!bt) return null
                          const starred = starredBetTypes?.has(`${team.teamName}|${bt}`)
                          return (
                            <button
                              onClick={e => { e.stopPropagation(); onStarClick(bt, team.teamName) }}
                              title={starred ? 'Remove from favorites' : 'Add to favorites'}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '4px 6px', lineHeight: 1, transition: 'color 0.15s',
                                fontSize: 15, color: starred ? '#eab308' : '#71717a',
                                marginLeft: 'auto',
                              }}
                            >
                              {starred ? '★' : '☆'}
                            </button>
                          )
                        })()}
                      </div>

                      {/* Calendar day columns */}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day   = i + 1
                        const games = dayMap.get(day) ?? []
                        const locked = tier !== 'none' && games.length > 0 && !visibleDaySet.has(day)

                        return (
                          <div
                            key={day}
                            style={{
                              width: COL_W, minWidth: COL_W, flexShrink: 0, background: rowBg,
                              filter:        locked ? 'blur(3px)' : 'none',
                              opacity:       locked ? 0.35 : 1,
                              pointerEvents: locked ? 'none' : 'auto',
                            }}
                          >
                            {games.length === 0 ? (
                              <div style={{ height: 34 }} />
                            ) : games.length === 1 ? (
                              <CalendarCell rowKey={row.key} game={games[0]} />
                            ) : (
                              <DoubleheaderCell rowKey={row.key} g1={games[0]} g2={games[1]} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}

                <div style={{ height: 10, borderBottom: ti < data.length - 1 ? '1px solid #16161e' : 'none' }} />
              </div>
            )
          })}

          {/* No-member overlay */}
          {tier === 'none' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
              <NoMemberOverlay onJoin={handleJoin} onPro={handleUpgrade} />
            </div>
          )}

          {/* Free-tier upgrade nudge — shown once when there are locked cells */}
          {tier === 'free' && data.some(team => {
            const populated = team.games.map(g => parseInt(g.rawDate.split('-')[2] ?? '0', 10)).filter(d => d > 0)
            return populated.length > FREE_COLS
          }) && showBanner === false && (
            <div
              style={{
                position: 'sticky', bottom: 16, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 5,
              }}
            >
              <button
                onClick={handleUpgrade}
                style={{
                  pointerEvents: 'all',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  border: 'none', borderRadius: 8, padding: '10px 22px',
                  color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(139,92,246,0.55)', fontFamily: 'inherit',
                }}
              >
                🔒 Go Pro — Unlock Full Month
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .cell      { display:flex; align-items:center; justify-content:center; height:34px; margin:0 3px; border-radius:5px; font-size:11px; letter-spacing:0.1em; }
        .cell-half { flex:1; display:flex; align-items:stretch; }
        .cell-half .cell { height:100%; border-radius:0; margin:0; flex:1; }
      `}</style>
    </div>
  )
}
