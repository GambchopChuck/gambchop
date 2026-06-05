'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  fetchAllTeamGameStats,
  computeSeasonAvg,
  computeTrendDirection,
  type TeamGameRow,
  type TrendCell,
  type TrendResult,
} from '@/lib/trends'
import { TEAM_COLORS } from '@/lib/teamColors'

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT  = '#39ff9a'
const MONO    = 'var(--font-jetbrains), "JetBrains Mono", monospace'
const OSWALD  = 'var(--font-oswald), "Oswald", sans-serif'
const BORDER  = '#1a1a24'
const MUTED   = '#52525b'
const TEXT    = '#f4f4f5'
const FREE_CELLS = 3

const CLR_ABOVE   = '#22c55e'  // green  — above avg (good)
const CLR_BELOW   = '#ef4444'  // red    — below avg (bad)
const CLR_AVERAGE = '#eab308'  // yellow — at average

// ─── League tabs ──────────────────────────────────────────────────────────────
const LEAGUE_TABS = [
  { key: 'mlb',  label: 'MLB',  active: true  },
  { key: 'nba',  label: 'NBA',  active: false },
  { key: 'nhl',  label: 'NHL',  active: false },
  { key: 'nfl',  label: 'NFL',  active: false },
  { key: 'wnba', label: 'WNBA', active: false },
] as const

// ─── MLB teams ────────────────────────────────────────────────────────────────
const MLB_TEAMS = [
  'Arizona Diamondbacks', 'Atlanta Braves', 'Baltimore Orioles', 'Boston Red Sox',
  'Chicago Cubs', 'Chicago White Sox', 'Cincinnati Reds', 'Cleveland Guardians',
  'Colorado Rockies', 'Detroit Tigers', 'Houston Astros', 'Kansas City Royals',
  'Los Angeles Angels', 'Los Angeles Dodgers', 'Miami Marlins', 'Milwaukee Brewers',
  'Minnesota Twins', 'New York Mets', 'New York Yankees', 'Oakland Athletics',
  'Philadelphia Phillies', 'Pittsburgh Pirates', 'San Diego Padres', 'San Francisco Giants',
  'Seattle Mariners', 'St. Louis Cardinals', 'Tampa Bay Rays', 'Texas Rangers',
  'Toronto Blue Jays', 'Washington Nationals',
]

// ─── Stat configs ─────────────────────────────────────────────────────────────
type TabType = 'batting' | 'pitching'

interface StatConfig {
  key:           string
  label:         string
  lowerIsBetter: boolean
  getValue:      (row: TeamGameRow) => number | null
  fmtAvg:        (avg: number) => string
  fmtVal:        (v: number)   => string
  unit:          string                              // label suffix after '·'
}

const BAT_STATS: StatConfig[] = [
  {
    key: 'hits', label: 'HITS', lowerIsBetter: false,
    getValue: r => r.hits,
    fmtAvg:  v => `${v.toFixed(1)}/g`,
    fmtVal:  v => String(Math.round(v)),
    unit:    '/g',
  },
  {
    key: 'runs', label: 'RUNS', lowerIsBetter: false,
    getValue: r => r.runs,
    fmtAvg:  v => `${v.toFixed(1)}/g`,
    fmtVal:  v => String(Math.round(v)),
    unit:    '/g',
  },
  {
    key: 'home_runs', label: 'HR', lowerIsBetter: false,
    getValue: r => r.home_runs,
    fmtAvg:  v => `${v.toFixed(1)}/g`,
    fmtVal:  v => String(Math.round(v)),
    unit:    '/g',
  },
  {
    key: 'walks', label: 'BB', lowerIsBetter: false,
    getValue: r => r.walks,
    fmtAvg:  v => `${v.toFixed(1)}/g`,
    fmtVal:  v => String(Math.round(v)),
    unit:    '/g',
  },
  {
    key: 'strikeouts', label: 'K', lowerIsBetter: true,
    getValue: r => r.strikeouts,
    fmtAvg:  v => `${v.toFixed(1)}/g`,
    fmtVal:  v => String(Math.round(v)),
    unit:    '/g',
  },
]

// ─── Tooltip state ────────────────────────────────────────────────────────────
interface TooltipData {
  x:          number
  y:          number
  cell:       TrendCell
  statLabel:  string
  fmtVal:     (v: number) => string
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
const SPARK_W = 600
const SPARK_H = 32
const SPARK_LAST_N = 15

function Sparkline({ values, seasonAvg, direction }: {
  values:    number[]
  seasonAvg: number
  direction: 'up' | 'down' | 'flat'
}) {
  if (!values.length) return <div style={{ height: SPARK_H }} />

  const lineColor =
    direction === 'up'   ? CLR_ABOVE :
    direction === 'down' ? CLR_BELOW : MUTED

  const all    = [...values, seasonAvg]
  const minV   = Math.min(...all)
  const maxV   = Math.max(...all)
  const rangeV = maxV - minV || 1

  const pad = 4
  const px = (i: number) =>
    values.length > 1 ? (i / (values.length - 1)) * (SPARK_W - pad * 2) + pad : SPARK_W / 2
  const py = (v: number) =>
    SPARK_H - pad - ((v - minV) / rangeV) * (SPARK_H - pad * 2)

  const avgY = py(seasonAvg)
  const pathD = values.map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`
  ).join(' ')

  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: SPARK_H, display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      {/* Season average dashed rule */}
      <line
        x1={0} y1={avgY} x2={SPARK_W} y2={avgY}
        stroke="#2a2a34" strokeDasharray="6,4" strokeWidth={1}
      />
      {/* Trend polyline */}
      {values.length > 1 && (
        <path
          d={pathD} fill="none"
          stroke={lineColor} strokeWidth={1.5}
          strokeLinejoin="round" strokeLinecap="round"
          opacity={0.9}
        />
      )}
      {/* Data dots */}
      {values.map((v, i) => (
        <circle key={i} cx={px(i)} cy={py(v)} r={2} fill={lineColor} />
      ))}
    </svg>
  )
}

// ─── Trend cell ───────────────────────────────────────────────────────────────
function TrendCellView({ cell, lowerIsBetter, onEnter, onLeave }: {
  cell:          TrendCell
  lowerIsBetter: boolean
  onEnter:       (e: React.MouseEvent, cell: TrendCell) => void
  onLeave:       () => void
}) {
  // Flip color logic for "lower is better" stats
  const isGood =
    lowerIsBetter ? cell.result === 'below' : cell.result === 'above'
  const isBad  =
    lowerIsBetter ? cell.result === 'above' : cell.result === 'below'

  const bg     = isGood ? CLR_ABOVE : isBad ? CLR_BELOW : CLR_AVERAGE
  const symbol = isGood ? '▲' : isBad ? '▼' : '—'
  const glow   = isGood ? `0 0 10px ${CLR_ABOVE}77` :
                 isBad  ? `0 0 10px ${CLR_BELOW}77` : 'none'

  return (
    <div
      className="cell"
      style={{
        background: bg, color: '#000', boxShadow: glow,
        fontWeight: 800, fontSize: 12, cursor: 'default', flexShrink: 0,
      }}
      onMouseEnter={e => onEnter(e, cell)}
      onMouseLeave={onLeave}
    >
      {symbol}
    </div>
  )
}

// ─── Stat row (cells + sparkline) ─────────────────────────────────────────────
const LABEL_W  = 160
const CELL_COL = 32   // matches .cell width
const THRESHOLD = 5   // % deviation to count as above/below

function StatRow({ cfg, rows, isPro, onEnter, onLeave, rowBg }: {
  cfg:     StatConfig
  rows:    TeamGameRow[]
  isPro:   boolean
  onEnter: (e: React.MouseEvent, cell: TrendCell, cfg: StatConfig) => void
  onLeave: () => void
  rowBg:   string
}) {
  const rawValues  = rows.map(r => cfg.getValue(r))
  const seasonAvg  = computeSeasonAvg(rawValues)
  if (seasonAvg === 0) return null

  const lockBefore = isPro ? 0 : Math.max(0, rows.length - FREE_CELLS)
  const validValues = rawValues.filter((v): v is number => v !== null)
  const sparkVals   = validValues.slice(-SPARK_LAST_N)
  const direction   = computeTrendDirection(validValues, cfg.lowerIsBetter)

  // Build one cell per row (null = placeholder for missing data)
  const cells: (TrendCell | null)[] = rows.map(row => {
    const actual = cfg.getValue(row)
    if (actual === null) return null
    const pctDiff = ((actual - seasonAvg) / seasonAvg) * 100
    const result: TrendResult =
      pctDiff > THRESHOLD ? 'above' : pctDiff < -THRESHOLD ? 'below' : 'average'
    return { game_date: row.game_date, actual_value: actual, season_avg: seasonAvg, result, pct_diff: pctDiff }
  })

  if (!cells.some(Boolean)) return null

  return (
    <div>
      {/* Cells row — no own scroll; parent scroll container handles it */}
      <div style={{ display: 'flex', alignItems: 'center', background: rowBg }}>
        {/* Sticky label */}
        <div style={{
          width: LABEL_W, minWidth: LABEL_W, flexShrink: 0,
          position: 'sticky', left: 0, zIndex: 2, background: rowBg,
          display: 'flex', alignItems: 'center', paddingLeft: 16, height: 34,
        }}>
          <div style={{
            width: 2, height: 12, borderRadius: 2, marginRight: 8, flexShrink: 0,
            background: cfg.lowerIsBetter ? CLR_BELOW : CLR_ABOVE, opacity: 0.8,
          }} />
          <span style={{ fontSize: 10, color: TEXT, fontFamily: MONO, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {cfg.label} · {cfg.fmtAvg(seasonAvg)}
          </span>
        </div>

        {/* One cell per row */}
        <div style={{ display: 'flex', paddingRight: 12 }}>
          {cells.map((cell, i) => {
            const locked = i < lockBefore
            if (!cell) {
              return <div key={rows[i]?.game_date ?? i} style={{ width: CELL_COL, height: 34, margin: '0 1px', flexShrink: 0 }} />
            }
            return (
              <div
                key={cell.game_date}
                style={{ filter: locked ? 'blur(3px)' : 'none', opacity: locked ? 0.35 : 1, pointerEvents: locked ? 'none' : 'auto', flexShrink: 0 }}
              >
                <TrendCellView cell={cell} lowerIsBetter={cfg.lowerIsBetter} onEnter={(e, c) => onEnter(e, c, cfg)} onLeave={onLeave} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Sparkline below cells row */}
      <div style={{ paddingLeft: LABEL_W, paddingRight: 12, background: '#09090e', borderBottom: `1px solid ${BORDER}` }}>
        <Sparkline values={sparkVals} seasonAvg={seasonAvg} direction={direction} />
      </div>
    </div>
  )
}

// ─── Stat summary bar ─────────────────────────────────────────────────────────
function SummaryBar({ rows, tab }: { rows: TeamGameRow[]; tab: TabType }) {
  const cards = useMemo(() => {
    if (tab !== 'batting' || !rows.length) return []

    const hitsPerGame = rows
      .filter(r => r.hits !== null)
      .map(r => r.hits as number)

    if (!hitsPerGame.length) return []

    const seasonAvg = hitsPerGame.reduce((a, b) => a + b, 0) / hitsPerGame.length
    const last10    = hitsPerGame.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, hitsPerGame.length)
    const high      = Math.max(...hitsPerGame)
    const low       = Math.min(...hitsPerGame)
    const fmt       = (v: number) => `${v.toFixed(1)}`

    return [
      { label: 'HITS/G AVG',  value: fmt(seasonAvg), color: ACCENT    },
      { label: 'LAST 10 AVG', value: fmt(last10),    color: '#7DD3FC' },
      { label: 'SEASON HIGH', value: String(high),   color: CLR_ABOVE },
      { label: 'SEASON LOW',  value: String(low),    color: CLR_BELOW },
    ]
  }, [rows, tab])

  if (!cards.length) return null

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8,
      padding: '10px 16px', borderBottom: `1px solid ${BORDER}`,
    }}>
      {cards.map(({ label, value, color }) => (
        <div key={label} style={{
          background: '#0f0f14', border: `1px solid ${BORDER}`,
          borderRadius: 6, padding: '8px 14px', textAlign: 'center',
          minWidth: 80,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: OSWALD, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Team section ─────────────────────────────────────────────────────────────
function TeamSection({ teamName, rows, tab, isPro, onEnter, onLeave }: {
  teamName: string
  rows:     TeamGameRow[]
  tab:      TabType
  isPro:    boolean
  onEnter:  (e: React.MouseEvent, cell: TrendCell, cfg: StatConfig) => void
  onLeave:  () => void
}) {
  const glowRef  = useRef<HTMLDivElement>(null)
  const colors   = TEAM_COLORS[teamName]
  const HEADER_BG = '#0d0d14'

  useEffect(() => {
    const el = glowRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => e.target.classList.toggle('team-glow-active', e.isIntersecting),
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  if (!rows.length) {
    return (
      <div style={{ background: '#0a0a0f', border: `1px solid ${BORDER}`, borderRadius: 0, marginBottom: 8, padding: '20px 16px' }}>
        <span style={{ fontSize: 11, color: MUTED, fontFamily: MONO }}>
          No trend data yet — check back after more games are processed.
        </span>
      </div>
    )
  }

  return (
    <div
      ref={glowRef}
      className="team-glow-border"
      style={{
        marginBottom: 8, background: '#0a0a0f',
        '--team-primary':   colors?.primary   ?? ACCENT,
        '--team-secondary': colors?.secondary ?? '#ffffff',
      } as React.CSSProperties}
    >
      {/* Team header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: colors?.primary ?? ACCENT, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: OSWALD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {teamName}
        </span>
        <span style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em' }}>
          {rows.length} Games
        </span>
      </div>

      {/* Summary bar */}
      <SummaryBar rows={rows} tab={tab} />

      {tab === 'batting' ? (
        <>
          {/* Single shared scroll container: date header + stat rows */}
          <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
            <div>
              {/* Date header row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0 3px', borderBottom: `1px solid ${BORDER}`, background: HEADER_BG }}>
                <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: HEADER_BG, zIndex: 2, paddingLeft: 16 }}>
                  <span style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Game Date</span>
                </div>
                <div style={{ display: 'flex', paddingRight: 12 }}>
                  {rows.map(r => {
                    const parts = r.game_date.split('-')
                    const m = parseInt(parts[1] ?? '0', 10)
                    const d = parseInt(parts[2] ?? '0', 10)
                    return (
                      <div key={r.game_date} style={{ width: CELL_COL, minWidth: CELL_COL, margin: '0 1px', textAlign: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 8, color: '#a1a1aa', fontFamily: MONO }}>{m}/{d}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Stat rows */}
              {BAT_STATS.map((cfg, i) => (
                <StatRow
                  key={cfg.key}
                  cfg={cfg}
                  rows={rows}
                  isPro={isPro}
                  onEnter={onEnter}
                  onLeave={onLeave}
                  rowBg={i % 2 === 0 ? '#0a0a0f' : '#0d0d14'}
                />
              ))}
            </div>
          </div>

          {/* Free upgrade nudge */}
          {!isPro && rows.length > FREE_CELLS && (
            <div style={{
              margin: '0 16px 10px',
              background: `linear-gradient(135deg, ${ACCENT}0d 0%, #8b5cf60d 100%)`,
              border: `1px solid ${ACCENT}33`, borderRadius: 5,
              padding: '7px 12px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontSize: 9, color: TEXT, fontFamily: MONO }}>
                🔒 {rows.length - FREE_CELLS} older games hidden
              </span>
              <a href="/pricing" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: '#000', background: ACCENT, padding: '3px 10px', borderRadius: 3, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Go Pro →
                </span>
              </a>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Pitching Trend Data Coming Soon
          </div>
          <div style={{ fontSize: 10, color: '#3a3a4a', fontFamily: MONO }}>
            Pitcher stats ingestion will populate ERA, WHIP, K, BB, H allowed trends.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TrendsClient() {
  const { isPro, memberTier, openModal, setIsMember } = useAuth()

  const [activeLeague, setActiveLeague] = useState('mlb')
  const [activeTab,   setActiveTab]    = useState<TabType>('batting')
  const [teamFilter,  setTeamFilter]   = useState('')
  const [loading,     setLoading]      = useState(true)
  const [allData,     setAllData]      = useState<Record<string, TeamGameRow[]>>({})
  const [tooltip,     setTooltip]      = useState<TooltipData | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchAllTeamGameStats('MLB').then(data => {
      setAllData(data)
      setLoading(false)
    })
  }, [])

  // Teams to display
  const displayTeams = useMemo(() => {
    const base = teamFilter ? [teamFilter] : MLB_TEAMS
    return base.filter(t => !teamFilter || allData[t] !== undefined || loading)
  }, [teamFilter, allData, loading])

  function handleEnter(e: React.MouseEvent, cell: TrendCell, cfg: StatConfig) {
    setTooltip({ x: e.clientX, y: e.clientY, cell, statLabel: cfg.label, fmtVal: cfg.fmtVal })
  }
  function handleLeave() { setTooltip(null) }

  const selectStyle: React.CSSProperties = {
    height: 36, background: '#0a0a0f', border: `1px solid ${BORDER}`,
    borderRadius: 6, outline: 'none', padding: '0 10px',
    color: TEXT, fontSize: 11, fontFamily: MONO,
    cursor: 'pointer', appearance: 'none' as const,
  }

  const tabPill = (active: boolean) => ({
    background:    active ? ACCENT : 'transparent',
    color:         active ? '#000' : '#ffffff',
    border:        active ? 'none' : `1px solid ${BORDER}`,
    borderRadius:  6, padding: '5px 16px',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase' as const, cursor: 'pointer',
    fontFamily: MONO, transition: 'all 0.15s',
    boxShadow: active ? `0 0 12px ${ACCENT}55` : 'none',
  })

  void memberTier; void openModal; void setIsMember  // suppress lint if unused

  return (
    <div style={{
      paddingLeft: 64, minHeight: '100vh',
      background: `radial-gradient(ellipse at 50% -10%, rgba(57,255,154,0.07) 0%, transparent 55%), #08080d`,
    }}>
      <style>{`
        .cell { display:flex; align-items:center; justify-content:center; height:34px; width:32px; margin:0 1px; border-radius:4px; font-size:12px; letter-spacing:0.05em; }
      `}</style>

      {/* ── Floating tooltip ─────────────────────────────────────────────────── */}
      {tooltip && (
        <div style={{
          position: 'fixed', zIndex: 9999, pointerEvents: 'none',
          left: tooltip.x + 14, top: tooltip.y - 70,
          background: '#0f0f14', border: `1px solid ${BORDER}`,
          borderRadius: 6, padding: '8px 12px',
          fontFamily: MONO, fontSize: 10, color: TEXT,
          boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
          minWidth: 160,
        }}>
          <div style={{ color: MUTED, marginBottom: 4, letterSpacing: '0.06em' }}>{tooltip.cell.game_date}</div>
          <div style={{ marginBottom: 2 }}>
            {tooltip.statLabel}: <strong>{tooltip.fmtVal(tooltip.cell.actual_value)}</strong>
          </div>
          <div style={{ color: MUTED, marginBottom: 2 }}>
            Season avg: {tooltip.fmtVal(tooltip.cell.season_avg)}
          </div>
          <div style={{
            color: tooltip.cell.pct_diff > 0 ? CLR_ABOVE : tooltip.cell.pct_diff < 0 ? CLR_BELOW : CLR_AVERAGE,
            fontWeight: 700,
          }}>
            {tooltip.cell.pct_diff > 0 ? '+' : ''}{tooltip.cell.pct_diff.toFixed(1)}% vs average
          </div>
        </div>
      )}

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 30,
        background: 'rgba(8,8,13,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        {/* League filter */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 6, height: 48,
          borderBottom: '1px solid #12121a',
        }}>
          {LEAGUE_TABS.map(tab => {
            const on = activeLeague === tab.key
            return (
              <div key={tab.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <button
                  onClick={() => tab.active && setActiveLeague(tab.key)}
                  style={{
                    ...tabPill(on),
                    cursor: tab.active ? 'pointer' : 'default',
                    opacity: tab.active ? 1 : 0.5,
                  }}
                >
                  {tab.label}
                </button>
                {!tab.active && (
                  <span style={{ fontSize: 7, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: MONO, background: '#1a1a24', padding: '1px 5px', borderRadius: 2 }}>
                    SOON
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Primary tabs */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 4, height: 44,
        }}>
          <button style={tabPill(activeTab === 'batting')}  onClick={() => setActiveTab('batting')}>  BATTING TRENDS  </button>
          <button style={tabPill(activeTab === 'pitching')} onClick={() => setActiveTab('pitching')}> PITCHING TRENDS </button>
        </div>
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{ fontSize: 10, color: MUTED, letterSpacing: '0.26em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: MONO }}>
          How each team is performing vs their own season averages — game by game.
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, fontFamily: OSWALD }}>
          TRENDS
        </h1>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
          {[
            { color: CLR_ABOVE, symbol: '▲', label: 'Above avg (good)' },
            { color: CLR_BELOW, symbol: '▼', label: 'Below avg (bad)'  },
            { color: CLR_AVERAGE, symbol: '—', label: 'At average'      },
          ].map(({ color, symbol, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.08em' }}>
              <span style={{ display: 'inline-flex', width: 18, height: 18, borderRadius: 3, background: color, alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#000', fontWeight: 800 }}>
                {symbol}
              </span>
              {label}
            </span>
          ))}
          <span style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.06em' }}>
            · Deviation threshold: ±5%
          </span>
        </div>
      </div>

      {/* ── Team filter + content ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            TEAM
          </label>
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            style={{ ...selectStyle, width: 240, color: teamFilter ? TEXT : MUTED }}
          >
            <option value="">All Teams</option>
            {MLB_TEAMS.map(t => (
              <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>
            ))}
          </select>
          {loading && <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading…</span>}
        </div>
      </div>

      {/* ── Team sections ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 8px 80px' }}>
        {!loading && displayTeams.length === 0 && (
          <div style={{ padding: '80px 24px', textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            No trend data yet — check back after more games are processed.
          </div>
        )}

        {!loading && displayTeams.map(teamName => (
          <TeamSection
            key={teamName}
            teamName={teamName}
            rows={allData[teamName] ?? []}
            tab={activeTab}
            isPro={isPro}
            onEnter={handleEnter}
            onLeave={handleLeave}
          />
        ))}
      </div>
    </div>
  )
}
