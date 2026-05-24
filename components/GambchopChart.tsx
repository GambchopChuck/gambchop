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

// ─── Forward-fill ─────────────────────────────────────────────────────────────

function forwardFill<T>(values: (T | null | undefined)[]): (T | null)[] {
  let last: T | null = null
  return values.map(v => { if (v != null) last = v; return last })
}

interface FilledRow {
  ml:    (BetResult)[]
  sp:    (BetResult)[]
  ou:    ('over' | 'under' | 'push' | null)[]
  fav:   (boolean | null)[]
  spFav: (boolean | null)[]
  home:  (boolean | null)[]
}

function buildFilledRows(games: GameEntry[]): FilledRow {
  return {
    ml:    forwardFill(games.map(g => g.moneylineResult)),
    sp:    forwardFill(games.map(g => g.spreadResult)),
    ou:    forwardFill(games.map(g => g.ouResult)),
    fav:   forwardFill(games.map(g => g.isFavorite)),
    spFav: forwardFill(games.map(g => g.isSpreadFavorite)),
    home:  forwardFill(games.map(g => g.isHome)),
  }
}

// ─── Record Helpers ───────────────────────────────────────────────────────────

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

// ─── Cells ────────────────────────────────────────────────────────────────────

function WLCell({ result, winLabel = 'W', lossLabel = 'L' }: { result: BetResult; winLabel?: string; lossLabel?: string }) {
  if (!result) return <div className="cell" style={{ background: C.empty, opacity: 0.3 }} />
  const s = { win: { bg: C.green, color: '#000', glow: `0 0 12px ${C.green}80`, label: winLabel }, loss: { bg: C.red, color: '#fff', glow: `0 0 12px ${C.red}80`, label: lossLabel }, push: { bg: C.white, color: '#111', glow: 'none', label: 'P' } }[result]
  return <div className="cell" style={{ background: s.bg, color: s.color, boxShadow: s.glow, fontWeight: 800, fontSize: result === 'push' ? 10 : 11 }}>{s.label}</div>
}

// ConditionCell: colored=won, red=lost, black=didn't apply, dim=no data
function ConditionCell({ active, result, color, glow }: { active: boolean | null; result: BetResult; color: string; glow: string }) {
  if (active === null) return <div className="cell" style={{ background: C.empty, opacity: 0.3 }} />
  if (!active)         return <div className="cell" style={{ background: C.empty }} />
  if (!result)         return <div className="cell" style={{ background: C.empty }} />
  if (result === 'push') return <div className="cell" style={{ background: C.white, color: '#111', fontWeight: 800, fontSize: 10 }}>P</div>
  const won = result === 'win'
  return (
    <div className="cell" style={{
      background: won ? color : C.red,
      color:      won ? '#000' : '#fff',
      boxShadow:  won ? glow   : `0 0 12px ${C.red}80`,
      fontWeight: 800,
      fontSize:   11,
    }}>
      {won ? 'W' : 'L'}
    </div>
  )
}

function OUCell({ r }: { r: 'over' | 'under' | 'push' | null }) {
  if (!r) return <div className="cell" style={{ background: C.empty, opacity: 0.3 }} />
  const s = { over: { bg: C.violet, glow: `0 0 14px ${C.violet}90` }, under: { bg: C.brown, glow: `0 0 14px ${C.brown}90` }, push: { bg: C.white, glow: 'none' } }[r]
  return <div className="cell" style={{ background: s.bg, boxShadow: s.glow }} />
}

// ─── Row Config ───────────────────────────────────────────────────────────────

type RowKey = 'moneyline' | 'spread' | 'ml-fav' | 'ml-dog' | 'sp-fav' | 'sp-dog' | 'home' | 'away' | 'ou'

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

function GameCellFilled({ rowKey, game: _game, gi, filled }: { rowKey: RowKey; game: GameEntry; gi: number; filled: FilledRow }) {
  switch (rowKey) {
    case 'moneyline': return <WLCell result={filled.ml[gi]} />
    case 'spread':    return <WLCell result={filled.sp[gi]} winLabel="COV" lossLabel="L" />
    case 'ml-fav':    return <ConditionCell active={filled.fav[gi]}                                         result={filled.ml[gi]} color={C.gold}   glow={`0 0 10px ${C.gold}80`}   />
    case 'ml-dog':    return <ConditionCell active={filled.fav[gi]   === null ? null : !filled.fav[gi]}   result={filled.ml[gi]} color={C.orange} glow={`0 0 10px ${C.orange}80`} />
    case 'sp-fav':    return <ConditionCell active={filled.spFav[gi]}                                     result={filled.sp[gi]} color={C.royal}  glow={`0 0 10px ${C.royal}80`}  />
    case 'sp-dog':    return <ConditionCell active={filled.spFav[gi] === null ? null : !filled.spFav[gi]} result={filled.sp[gi]} color={C.purple} glow={`0 0 10px ${C.purple}80`} />
    case 'home':      return <ConditionCell active={filled.home[gi]}                                      result={filled.ml[gi]} color={C.teal}   glow={`0 0 10px ${C.teal}80`}   />
    case 'away':      return <ConditionCell active={filled.home[gi]  === null ? null : !filled.home[gi]}  result={filled.ml[gi]} color={C.silver} glow={`0 0 10px ${C.silver}60`}  />
    case 'ou':        return <OUCell r={filled.ou[gi]} />
    default: return null
  }
}

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
  const days = Math.floor(hrs / 24)
  return `Updated ${days}d ago`
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

// ─── Date Header ─────────────────────────────────────────────────────────────

const LABEL_W = 220
const COL_W   = 64

function DateHeader({ dates, visibleCols }: { dates: string[]; visibleCols: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #1a1a24', padding: '10px 0 8px', background: '#0a0a0f' }}>
      <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: '#0a0a0f', paddingLeft: 20, zIndex: 20 }}>
        <span style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Team / Metric</span>
      </div>
      {dates.map((d, i) => (
        <div key={i} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          {/* actual game date — "M/D" from real data, "G1" etc. from mock */}
          <span style={{ fontSize: 9,  color: i < visibleCols ? '#d4d4d8' : '#3f3f46', letterSpacing: '0.04em', fontWeight: 600 }}>{d}</span>
          {/* column sequence label */}
          <span style={{ fontSize: 9,  color: i < visibleCols ? '#d4d4d8' : '#2a2a34', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>G{i + 1}</span>
          {i === visibleCols && <div style={{ position: 'absolute', top: -2, left: 0, width: 1, height: 44, background: '#8b5cf644' }} />}
        </div>
      ))}
    </div>
  )
}

// ─── Paywall Overlays ─────────────────────────────────────────────────────────

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
          Free members see the last 3 games.<br />Pro members get the full season.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onJoin} style={{
            background: 'none', border: '1px solid #2a2a34', borderRadius: 8,
            color: '#a1a1aa', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer', padding: '10px 20px', fontFamily: 'inherit',
          }}>Join Free — Last 3 Games</button>
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

function ProUpgradeOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(to right, transparent 0%, #0a0a0f88 20%, #0a0a0fcc 60%, #0a0a0f 100%)',
      zIndex: 5, pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'all', textAlign: 'center', padding: '12px 20px', marginRight: 16 }}>
        <button onClick={onUpgrade} style={{
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: 8,
          padding: '10px 20px', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
          textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 0 20px rgba(139,92,246,0.5)', fontFamily: 'inherit',
        }}>🔒 Go Pro — Full Season</button>
        <p style={{ fontSize: 9, color: '#52525b', marginTop: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Free: last {FREE_COLS} games only
        </p>
      </div>
    </div>
  )
}

// ─── Main Chart ───────────────────────────────────────────────────────────────

// Maps each chart RowKey → filter-context VisibleRows key
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

// Maps each chart RowKey to its favorites bet_type string(s)
const ROW_STAR: Partial<Record<RowKey, string | [string, string]>> = {
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

interface Props {
  data: TeamChartData[]
  memberTier?: MemberTier
  isPro?: boolean       // legacy — maps to memberTier='pro'
  onJoin?: () => void
  onUpgrade?: () => void
  accent?: string
  // Optional star-toggle support (used on team/league pages)
  starredBetTypes?: Set<string>   // keyed as `${teamName}|${betType}`
  onStarClick?: (betType: string, teamName: string) => void
  lastUpdated?: string | null     // ISO timestamp of latest successful ingestion run
}


export default function GambchopChart({ data, memberTier, isPro, onJoin, onUpgrade, accent = C.green, starredBetTypes, onStarClick, lastUpdated }: Props) {
  const [showBanner, setShowBanner] = useState(false)
  const { visibleRows, setVisibleRows, filterChips, isFiltered, activeCount, resetFilters } = useFilters()
  const allRowsHidden = Object.values(visibleRows).every(v => !v)

  const tier: MemberTier = memberTier ?? (isPro ? 'pro' : 'free')
  const dates = data[0]?.games.map(g => g.date) ?? []
  const visibleCols = tier === 'pro' ? dates.length : tier === 'free' ? Math.min(FREE_COLS, dates.length) : 0

  const handleUpgrade = () => { if (onUpgrade) onUpgrade(); else setShowBanner(true) }
  const handleJoin    = () => { if (onJoin) onJoin() }

  return (
    <div style={{ width: '100%' }}>
      <Legend lastUpdated={lastUpdated} />

      {/* Active filters bar */}
      {isFiltered && tier !== 'none' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          padding: '8px 20px', background: '#0b0b10',
          borderBottom: '1px solid #1a1a24',
        }}>
          <span style={{ fontSize: 8, color: C.green, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800, flexShrink: 0 }}>
            ◧ {activeCount} Filter{activeCount !== 1 ? 's' : ''}
          </span>
          {filterChips.map(({ key, label }) => (
            <div
              key={key as string}
              style={{
                background: `${C.green}11`, border: `1px solid ${C.green}33`,
                borderRadius: 4, padding: '2px 6px',
                fontSize: 9, color: C.green, letterSpacing: '0.06em', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
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
          >
            Clear All
          </button>
        </div>
      )}

      {tier !== 'pro' && showBanner && (
        <div style={{ background: '#8b5cf60d', border: '1px solid #8b5cf633', borderRadius: 10, padding: '14px 20px', margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Upgrade to unlock full season</div>
            <div style={{ fontSize: 10, color: '#52525b', marginTop: 4 }}>Showing {tier === 'free' ? `first ${FREE_COLS} games` : 'no data'}. Pro unlocks the complete season for every team.</div>
          </div>
          <button style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: 8, padding: '10px 18px', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            Go Pro →
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ minWidth: LABEL_W + dates.length * COL_W + 24, position: 'relative' }}>

          {/* No-member blur: cover the whole chart */}
          {tier === 'none' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, filter: 'blur(6px)', pointerEvents: 'none' }} aria-hidden />
          )}

          <DateHeader dates={dates} visibleCols={visibleCols} />

          {data.map((team, ti) => {
            const filled    = buildFilledRows(team.games)
            const mlStreak  = computeStreak(team.games, 'moneyline')
            const spStreak  = computeStreak(team.games, 'spread')
            const ouStreak  = computeStreak(team.games, 'over_under')
            const streakFor: Partial<Record<RowKey, typeof mlStreak>> = {
              moneyline: mlStreak,
              spread:    spStreak,
              ou:        ouStreak,
            }
            return (
              <div key={team.teamName}>
                {ti > 0 && ti % 5 === 0 && <DateHeader dates={dates} visibleCols={visibleCols} />}

                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 20, background: '#0a0a0f', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 3, alignSelf: 'stretch', background: accent, marginRight: 16, borderRadius: '0 2px 2px 0', minHeight: 46 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.3 }}>{team.teamName}</div>
                      <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>{team.games.length} Games</div>
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
                      <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, background: rowBg, height: 34, display: 'flex', alignItems: 'center', paddingLeft: 19 }}>
                        <div style={{ width: 2, height: 12, background: row.accent, borderRadius: 2, marginRight: 10, flexShrink: 0, opacity: 0.85 }} />
                        <span style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.label}</span>
                        {row.record(team.games)}
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
                          const mapping = ROW_STAR[row.key]
                          if (!mapping) return null
                          const bts = Array.isArray(mapping) ? mapping : [mapping]
                          return (
                            <span style={{ marginLeft: 'auto', display: 'flex', gap: 0, flexShrink: 0 }}>
                              {bts.map(bt => {
                                const key = `${team.teamName}|${bt}`
                                const starred = starredBetTypes?.has(key)
                                return (
                                  <button
                                    key={bt}
                                    onClick={e => { e.stopPropagation(); onStarClick(bt, team.teamName) }}
                                    title={starred ? 'Remove from favorites' : 'Add to favorites'}
                                    style={{
                                      background: 'none', border: 'none', cursor: 'pointer',
                                      padding: '4px 6px', lineHeight: 1, transition: 'color 0.15s',
                                      fontSize: 15,
                                      color: starred ? '#eab308' : '#71717a',
                                    }}
                                  >
                                    {starred ? '★' : '☆'}
                                  </button>
                                )
                              })}
                            </span>
                          )
                        })()}
                      </div>
                      {team.games.map((game, gi) => {
                        const locked = gi >= visibleCols
                        return (
                          <div
                            key={game.date}
                            style={{
                              width: COL_W, minWidth: COL_W, flexShrink: 0, background: rowBg,
                              filter: locked ? 'blur(4px)' : 'none',
                              opacity: locked ? 0.3 : 1,
                              pointerEvents: locked ? 'none' : 'auto',
                            }}
                          >
                            <GameCellFilled rowKey={row.key} game={game} gi={gi} filled={filled} />
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

          {/* Overlays based on tier */}
          {tier === 'none' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
              <NoMemberOverlay onJoin={handleJoin} onPro={handleUpgrade} />
            </div>
          )}
          {tier === 'free' && dates.length > FREE_COLS && (
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: LABEL_W + FREE_COLS * COL_W, right: 0, pointerEvents: 'none' }}>
              <ProUpgradeOverlay onUpgrade={handleUpgrade} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .cell { display:flex; align-items:center; justify-content:center; height:34px; margin:0 3px; border-radius:5px; font-size:11px; letter-spacing:0.1em; }
      `}</style>
    </div>
  )
}
