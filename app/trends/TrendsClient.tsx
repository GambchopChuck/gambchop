'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  fetchAllTeamGameStats,
  fetchAllPlayerGameStats,
  fetchMLBTeamAverages,
  computeSeasonAvg,
  type TeamGameRow,
  type PlayerGameRow,
  type PlayerEntry,
  type TeamMLBAvg,
  type TrendCell,
  type TrendResult,
} from '@/lib/trends'
import { supabase } from '@/lib/supabase'
import { TEAM_COLORS } from '@/lib/teamColors'

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT  = '#39ff9a'
const MONO    = 'var(--font-jetbrains), "JetBrains Mono", monospace'
const OSWALD  = 'var(--font-oswald), "Oswald", sans-serif'
const BORDER  = '#1a1a24'
const MUTED   = '#52525b'
const TEXT    = '#f4f4f5'
const FREE_CELLS = 3
const LABEL_W    = 180
const CELL_COL   = 32
const THRESHOLD  = 5

const CLR_ABOVE   = '#22c55e'
const CLR_BELOW   = '#ef4444'
const CLR_AVERAGE = '#eab308'

// ─── League tabs ──────────────────────────────────────────────────────────────
const LEAGUE_TABS = [
  { key: 'mlb',  label: 'MLB',  active: true  },
  { key: 'nba',  label: 'NBA',  active: false },
  { key: 'nhl',  label: 'NHL',  active: false },
  { key: 'nfl',  label: 'NFL',  active: false },
  { key: 'wnba', label: 'WNBA', active: false },
] as const

// ─── Per-league primary tab configs ───────────────────────────────────────────
const MLB_SUB_TABS = [
  { key: 'batting'  as const, label: 'BATTING TRENDS'  },
  { key: 'pitching' as const, label: 'PITCHING TRENDS' },
]

// TODO Phase 2: wire NBA stats endpoints and activate these tabs
const NBA_SUB_TABS = [
  { key: 'offensive' as const, label: 'OFFENSIVE TRENDS' },
  { key: 'defensive' as const, label: 'DEFENSIVE TRENDS' },
]

// TODO Phase 2: wire WNBA stats endpoints and activate these tabs
const WNBA_SUB_TABS = [
  { key: 'offensive' as const, label: 'OFFENSIVE TRENDS' },
  { key: 'defensive' as const, label: 'DEFENSIVE TRENDS' },
]

// TODO Phase 2: wire NFL stats endpoints and activate these tabs
const NFL_SUB_TABS = [
  { key: 'offensive' as const, label: 'OFFENSIVE TRENDS' },
  { key: 'defensive' as const, label: 'DEFENSIVE TRENDS' },
]

// TODO Phase 2: wire NHL stats endpoints and activate these tabs
const NHL_SUB_TABS = [
  { key: 'offensive' as const, label: 'OFFENSIVE TRENDS' },
  { key: 'defensive' as const, label: 'DEFENSIVE TRENDS' },
]

const LEAGUE_SUB_TABS: Record<string, { key: string; label: string }[]> = {
  mlb:  MLB_SUB_TABS,
  nba:  NBA_SUB_TABS,
  wnba: WNBA_SUB_TABS,
  nfl:  NFL_SUB_TABS,
  nhl:  NHL_SUB_TABS,
}

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

// ─── Types ────────────────────────────────────────────────────────────────────
type TabType = 'batting' | 'pitching' | 'player' | 'offensive' | 'defensive'

interface StatConfig<T = TeamGameRow> {
  key:           string
  label:         string
  lowerIsBetter: boolean
  getValue:      (row: T) => number | null
  getMLBAvg?:    (a: TeamMLBAvg) => number   // full-season avg from MLB Stats API
  fmtAvg:        (avg: number) => string
  fmtVal:        (v: number)   => string
}

// ─── Team batting stat configs ────────────────────────────────────────────────
const BAT_STATS: StatConfig<TeamGameRow>[] = [
  {
    key: 'avg', label: 'AVG', lowerIsBetter: false,
    getValue:   r => (r.at_bats && r.at_bats > 0 && r.hits !== null) ? r.hits / r.at_bats : null,
    getMLBAvg:  a => a.avg,
    fmtAvg: v => `.${String(Math.round(v * 1000)).padStart(3, '0')}`,
    fmtVal: v => `.${String(Math.round(v * 1000)).padStart(3, '0')}`,
  },
  {
    key: 'hits', label: 'HITS', lowerIsBetter: false,
    getValue:  r => r.hits,
    getMLBAvg: a => a.hits_per_game,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'runs', label: 'RUNS', lowerIsBetter: false,
    getValue:  r => r.runs,
    getMLBAvg: a => a.runs_per_game,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'home_runs', label: 'HR', lowerIsBetter: false,
    getValue:  r => r.home_runs,
    getMLBAvg: a => a.home_runs_per_game,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'walks', label: 'WALKS', lowerIsBetter: false,
    getValue:  r => r.walks,
    getMLBAvg: a => a.walks_per_game,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'strikeouts', label: 'SO', lowerIsBetter: true,
    getValue:  r => r.strikeouts,
    getMLBAvg: a => a.strikeouts_per_game,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'obp', label: 'OBP', lowerIsBetter: false,
    getValue: r => {
      if (!r.at_bats || r.at_bats === 0 || r.hits === null || r.walks === null) return null
      return (r.hits + r.walks) / (r.at_bats + r.walks)
    },
    getMLBAvg: a => a.obp,
    fmtAvg: v => `.${String(Math.round(v * 1000)).padStart(3, '0')}`,
    fmtVal: v => `.${String(Math.round(v * 1000)).padStart(3, '0')}`,
  },
]

// ─── Player batting stat configs ──────────────────────────────────────────────
const PLAYER_BAT_STATS: StatConfig<PlayerGameRow>[] = [
  {
    key: 'avg', label: 'AVG', lowerIsBetter: false,
    getValue: r => (r.at_bats && r.at_bats > 0 && r.hits !== null) ? r.hits / r.at_bats : null,
    fmtAvg: v => `.${String(Math.round(v * 1000)).padStart(3, '0')}`,
    fmtVal: v => `.${String(Math.round(v * 1000)).padStart(3, '0')}`,
  },
  {
    key: 'hits', label: 'H', lowerIsBetter: false,
    getValue: r => r.hits,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'home_runs', label: 'HR', lowerIsBetter: false,
    getValue: r => r.home_runs,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'rbis', label: 'RBI', lowerIsBetter: false,
    getValue: r => r.rbis,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'strikeouts', label: 'K', lowerIsBetter: true,
    getValue: r => r.strikeouts,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'walks', label: 'BB', lowerIsBetter: false,
    getValue: r => r.walks,
    fmtAvg: v => `${v.toFixed(1)}/g`,
    fmtVal: v => String(Math.round(v)),
  },
  {
    key: 'obp', label: 'OBP', lowerIsBetter: false,
    getValue: r => {
      if (!r.at_bats || r.at_bats === 0 || r.hits === null || r.walks === null) return null
      return (r.hits + r.walks) / (r.at_bats + r.walks)
    },
    fmtAvg: v => `.${String(Math.round(v * 1000)).padStart(3, '0')}`,
    fmtVal: v => `.${String(Math.round(v * 1000)).padStart(3, '0')}`,
  },
]

// ─── Tooltip state ────────────────────────────────────────────────────────────
interface TooltipData {
  x:         number
  y:         number
  cell:      TrendCell
  statLabel: string
  fmtVal:    (v: number) => string
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
// ─── Bar chart (replaces cell row + sparkline — same data, visual format only) ──
const CHART_H   = 72   // total row height (previously ~66 for cells+sparkline)
const CELL_UNIT = 34   // 32px cell + 2px margin — matches date header column width
const PAD_TOP   = 6
const PAD_BOT   = 4
const DRAW_H    = CHART_H - PAD_TOP - PAD_BOT  // usable vertical space for bars

function BarChart({ cells, sparkVals, seasonAvg, lockBefore, lowerIsBetter, onEnter, onLeave }: {
  cells:         (TrendCell | null)[]
  sparkVals:     number[]
  seasonAvg:     number
  lockBefore:    number
  lowerIsBetter: boolean
  onEnter:       (e: React.MouseEvent, cell: TrendCell) => void
  onLeave:       () => void
}) {
  if (!cells.length) return null

  // Y-axis scale: 0-based so bars always grow from the floor
  const maxV  = Math.max(...sparkVals, seasonAvg) * 1.15 || 1
  const baseY = CHART_H - PAD_BOT                                  // bar floor
  const toH   = (v: number) => Math.max(2, (v / maxV) * DRAW_H)   // bar height
  const toTopY = (v: number) => baseY - toH(v)                     // bar top Y
  const avgY  = toTopY(seasonAvg)

  // Trend line color — last 5 of sparkVals, 5% threshold, lowerIsBetter-aware
  const last5 = sparkVals.slice(-5)
  let lineColor = MUTED
  if (last5.length >= 2) {
    const half  = Math.ceil(last5.length / 2)
    const early = last5.slice(0, half)
    const late  = last5.slice(half)
    const avgE  = early.reduce((a, b) => a + b, 0) / early.length
    const avgL  = late.reduce((a, b) => a + b, 0) / late.length
    const pct   = avgE === 0 ? 0 : ((avgL - avgE) / Math.abs(avgE)) * 100
    if (Math.abs(pct) >= 5) {
      lineColor = (lowerIsBetter ? pct < 0 : pct > 0) ? CLR_ABOVE : CLR_BELOW
    }
  }

  // Trend polyline: connects top of each non-null bar
  type Pt = { x: number; y: number; locked: boolean }
  const trendPts: Pt[] = []
  cells.forEach((cell, i) => {
    if (cell) trendPts.push({ x: i * CELL_UNIT + CELL_UNIT / 2, y: toTopY(cell.actual_value), locked: i < lockBefore })
  })
  const trendD = trendPts.length > 1
    ? trendPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    : ''

  const viewW = cells.length * CELL_UNIT

  // Split into locked (blurred) and visible bars
  const lockedCells  = cells.slice(0, lockBefore)
  const visibleCells = cells.slice(lockBefore)

  function renderBar(cell: TrendCell | null, globalIdx: number) {
    const bx = globalIdx * CELL_UNIT + 1
    const bw = CELL_UNIT - 2  // 32px — matches CELL_COL

    if (!cell) {
      // No data for this game — render a 2px floor stub
      return <rect key={globalIdx} x={bx} y={baseY - 2} width={bw} height={2} fill="#1e1e2e" rx={1} />
    }

    const isGood = lowerIsBetter ? cell.result === 'below' : cell.result === 'above'
    const isBad  = lowerIsBetter ? cell.result === 'above' : cell.result === 'below'
    const fill   = isGood ? CLR_ABOVE : isBad ? CLR_BELOW : CLR_AVERAGE
    const bh     = toH(cell.actual_value)
    const by     = baseY - bh

    return (
      <rect
        key={globalIdx}
        x={bx} y={by} width={bw} height={bh}
        fill={fill} rx={2} opacity={0.85}
        onMouseEnter={globalIdx >= lockBefore ? (e: React.MouseEvent<SVGRectElement>) => onEnter(e as unknown as React.MouseEvent, cell) : undefined}
        onMouseLeave={globalIdx >= lockBefore ? onLeave : undefined}
        style={{ cursor: 'default' }}
      />
    )
  }

  return (
    <svg
      viewBox={`0 0 ${viewW} ${CHART_H}`}
      preserveAspectRatio="none"
      width="100%"
      height={CHART_H}
      style={{ display: 'block', overflow: 'hidden' }}
      aria-hidden
    >
      {/* Locked bars — blurred + dimmed for freemium gate */}
      {lockBefore > 0 && (
        <g style={{ filter: 'blur(3px)', opacity: 0.35, pointerEvents: 'none' } as React.CSSProperties}>
          {lockedCells.map((cell, i) => renderBar(cell, i))}
        </g>
      )}

      {/* Visible bars */}
      {visibleCells.map((cell, i) => renderBar(cell, i + lockBefore))}

      {/* White dashed season-average reference line */}
      <line
        x1={0} y1={avgY} x2={viewW} y2={avgY}
        stroke="rgba(255,255,255,0.5)" strokeDasharray="6,4" strokeWidth={1}
      />

      {/* Trend polyline — sits on top of bars, connects bar tops */}
      {trendD && (
        <path d={trendD} fill="none" stroke={lineColor} strokeWidth={1.5}
          strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      )}

      {/* Dots at each trend point — visible (unlocked) only */}
      {trendPts.filter(p => !p.locked).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={lineColor} opacity={0.9} />
      ))}
    </svg>
  )
}

// ─── Generic stat row (works for both team and player rows) ───────────────────
function StatRow<T extends { game_date: string }>({ cfg, rows, isPro, onEnter, onLeave, rowBg, mlbAvg }: {
  cfg:     StatConfig<T>
  rows:    T[]
  isPro:   boolean
  onEnter: (e: React.MouseEvent, cell: TrendCell, label: string, fmtVal: (v: number) => string) => void
  onLeave: () => void
  rowBg:   string
  mlbAvg?: TeamMLBAvg
}) {
  const rawValues = rows.map(r => cfg.getValue(r))
  const seasonAvg = (mlbAvg && cfg.getMLBAvg)
    ? cfg.getMLBAvg(mlbAvg)
    : computeSeasonAvg(rawValues)
  if (seasonAvg === 0) return null

  const lockBefore  = isPro ? 0 : Math.max(0, rows.length - FREE_CELLS)
  const validValues = rawValues.filter((v): v is number => v !== null)
  const sparkVals   = validValues

  const cells: (TrendCell | null)[] = rows.map(row => {
    const actual = cfg.getValue(row)
    if (actual === null) return null
    const pctDiff = ((actual - seasonAvg) / seasonAvg) * 100
    const result: TrendResult = pctDiff > THRESHOLD ? 'above' : pctDiff < -THRESHOLD ? 'below' : 'average'
    return { game_date: row.game_date, actual_value: actual, season_avg: seasonAvg, result, pct_diff: pctDiff }
  })

  if (!cells.some(Boolean)) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Sticky label — same height as bar chart */}
        <div style={{
          width: LABEL_W, minWidth: LABEL_W, flexShrink: 0,
          position: 'sticky', left: 0, zIndex: 2, background: rowBg,
          display: 'flex', alignItems: 'center', paddingLeft: 16,
          minHeight: CHART_H,
        }}>
          <div style={{ width: 2, height: 12, borderRadius: 2, marginRight: 8, flexShrink: 0, background: cfg.lowerIsBetter ? CLR_BELOW : CLR_ABOVE, opacity: 0.8 }} />
          <span style={{ fontSize: 10, color: TEXT, fontFamily: MONO, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {cfg.label} · {cfg.fmtAvg(seasonAvg)}
          </span>
        </div>

        {/* Bar chart — replaces colored cells + sparkline */}
        <div style={{ flex: 1, paddingRight: 12, background: '#09090e', borderBottom: `1px solid ${BORDER}` }}>
          <BarChart
            cells={cells}
            sparkVals={sparkVals}
            seasonAvg={seasonAvg}
            lockBefore={lockBefore}
            lowerIsBetter={cfg.lowerIsBetter}
            onEnter={(e, c) => onEnter(e, c, cfg.label, cfg.fmtVal)}
            onLeave={onLeave}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Stat summary bar ─────────────────────────────────────────────────────────
function SummaryBar({ rows, mlbAvg }: { rows: TeamGameRow[]; mlbAvg?: TeamMLBAvg }) {
  const cards = useMemo(() => {
    if (!rows.length) return []

    const hitsPerGame = rows.filter(r => r.hits !== null).map(r => r.hits as number)
    if (!hitsPerGame.length) return []

    const seasonAvg = mlbAvg?.hits_per_game ?? (hitsPerGame.reduce((a, b) => a + b, 0) / hitsPerGame.length)
    const last10    = hitsPerGame.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, hitsPerGame.length)
    const high      = Math.max(...hitsPerGame)
    const low       = Math.min(...hitsPerGame)
    const fmt       = (v: number) => `${v.toFixed(1)}`

    return [
      { label: mlbAvg ? 'SEASON AVG (API)' : 'HITS/G AVG', value: fmt(seasonAvg), color: ACCENT    },
      { label: 'LAST 10 AVG',                               value: fmt(last10),    color: '#7DD3FC' },
      { label: 'RECENT HIGH',                               value: String(high),   color: CLR_ABOVE },
      { label: 'RECENT LOW',                                value: String(low),    color: CLR_BELOW },
    ]
  }, [rows, mlbAvg])

  if (!cards.length) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
      {cards.map(({ label, value, color }) => (
        <div key={label} style={{ background: '#0f0f14', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 14px', textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: OSWALD, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Date header row ──────────────────────────────────────────────────────────
function TrendDateHeader({ rows, headerBg }: { rows: Array<{ game_date: string }>; headerBg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0 3px', borderBottom: `1px solid ${BORDER}`, background: headerBg }}>
      <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: headerBg, zIndex: 2, paddingLeft: 16 }}>
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
  )
}

// ─── Upgrade nudge ────────────────────────────────────────────────────────────
function UpgradeNudge({ count }: { count: number }) {
  return (
    <div style={{
      margin: '0 16px 10px',
      background: `linear-gradient(135deg, ${ACCENT}0d 0%, #8b5cf60d 100%)`,
      border: `1px solid ${ACCENT}33`, borderRadius: 5,
      padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    }}>
      <span style={{ fontSize: 9, color: TEXT, fontFamily: MONO }}>🔒 {count} older games hidden</span>
      <Link href="/pricing" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: 8, fontWeight: 700, color: '#000', background: ACCENT, padding: '3px 10px', borderRadius: 3, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Go Pro →
        </span>
      </Link>
    </div>
  )
}

// ─── Starting rotation ────────────────────────────────────────────────────────

type StarterRow = {
  game_date:       string
  pitcher_name:    string
  decision:        string | null
  innings_pitched: number | null
  earned_runs:     number | null
  strikeouts:      number | null
}

const ROT_WIN  = '#16a34a'
const ROT_LOSS = '#dc2626'
const ROT_ND   = '#ca8a04'
const ROT_NONE = '#09090e'

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1] ?? fullName
}

function fmtIP(ip: number | null): string {
  if (ip === null) return ''
  const whole  = Math.floor(ip)
  const thirds = Math.round((ip - whole) * 3)
  return thirds === 0 ? `${whole}` : `${whole}.${thirds}`
}

function RotationSection({ rows, starters, isPro, teamColor }: {
  rows:      TeamGameRow[]
  starters:  StarterRow[]
  isPro:     boolean
  teamColor: string
}) {
  const lockBefore = isPro ? 0 : Math.max(0, rows.length - FREE_CELLS)

  const starterByDate = useMemo(
    () => new Map(starters.map(s => [s.game_date, s])),
    [starters],
  )

  const pitchers = useMemo(() => {
    const names = [...new Set(starters.map(s => s.pitcher_name))]
    return names.sort((a, b) => getLastName(a).localeCompare(getLastName(b)))
  }, [starters])

  if (!pitchers.length || !rows.length) return null

  return (
    <div style={{ borderTop: `1px solid ${teamColor}30` }}>
      {/* Section header */}
      <div style={{ padding: '10px 16px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 2, height: 10, background: ACCENT, borderRadius: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 8, color: ACCENT, fontFamily: MONO, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>
          STARTING ROTATION
        </span>
      </div>

      <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div>
          <TrendDateHeader rows={rows} headerBg="#0d0d14" />
          {pitchers.map((pitcher, pi) => {
            const rowBg   = pi % 2 === 0 ? '#0a0a0f' : '#0d0d14'
            const lastName = getLastName(pitcher)
            return (
              <div key={pitcher} style={{ display: 'flex', alignItems: 'center', minHeight: 36, background: rowBg }}>
                {/* Sticky label */}
                <div style={{
                  width: LABEL_W, minWidth: LABEL_W, flexShrink: 0,
                  position: 'sticky', left: 0, zIndex: 2, background: rowBg,
                  display: 'flex', alignItems: 'center', paddingLeft: 24,
                }}>
                  <span style={{ fontSize: 10, color: TEXT, fontFamily: MONO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {lastName}
                  </span>
                </div>

                {/* Cells */}
                <div style={{ display: 'flex', paddingRight: 12 }}>
                  {rows.map((r, idx) => {
                    const starter  = starterByDate.get(r.game_date)
                    const didStart = starter?.pitcher_name === pitcher
                    const locked   = idx < lockBefore

                    if (!didStart) {
                      return (
                        <div key={r.game_date} style={{
                          width: CELL_COL, minWidth: CELL_COL, height: 34, margin: '0 1px',
                          background: ROT_NONE, borderRadius: 3, flexShrink: 0,
                        }} />
                      )
                    }

                    const dec    = starter!.decision
                    const bg     = dec === 'W' ? ROT_WIN : dec === 'L' ? ROT_LOSS : ROT_ND
                    const letter = dec === 'W' ? 'W' : dec === 'L' ? 'L' : 'ND'
                    const glow   = dec === 'W' ? `0 0 10px ${ROT_WIN}80` : dec === 'L' ? `0 0 10px ${ROT_LOSS}80` : 'none'
                    const tooltip = [
                      pitcher, r.game_date, dec ?? 'ND',
                      starter!.innings_pitched !== null ? `${fmtIP(starter!.innings_pitched)} IP` : null,
                      starter!.earned_runs     !== null ? `${starter!.earned_runs} ER` : null,
                      starter!.strikeouts      !== null ? `${starter!.strikeouts} K` : null,
                    ].filter(Boolean).join(' · ')

                    return (
                      <div
                        key={r.game_date}
                        style={{
                          width: CELL_COL, minWidth: CELL_COL, height: 34, margin: '0 1px',
                          background: bg, borderRadius: 3, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: letter === 'ND' ? 9 : 11, fontWeight: 900, color: '#fff',
                          boxShadow: locked ? 'none' : glow,
                          filter:     locked ? 'blur(3px)' : 'none',
                          opacity:    locked ? 0.35 : 1,
                          cursor: 'default', userSelect: 'none' as const,
                        }}
                        title={locked ? undefined : tooltip}
                      >
                        {letter}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Team section ─────────────────────────────────────────────────────────────
function TeamSection({ teamName, rows, tab, isPro, onEnter, onLeave, mlbAvg, starters }: {
  teamName: string
  rows:     TeamGameRow[]
  tab:      TabType
  isPro:    boolean
  onEnter:  (e: React.MouseEvent, cell: TrendCell, label: string, fmtVal: (v: number) => string) => void
  onLeave:  () => void
  mlbAvg?:  TeamMLBAvg
  starters?: StarterRow[]
}) {
  const glowRef   = useRef<HTMLDivElement>(null)
  const colors    = TEAM_COLORS[teamName]
  const HEADER_BG = '#0d0d14'

  useEffect(() => {
    const el = glowRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => e.target.classList.toggle('team-glow-active', e.isIntersecting), { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  if (!rows.length) {
    return (
      <div style={{ background: '#0a0a0f', border: `1px solid ${BORDER}`, marginBottom: 8, padding: '20px 16px' }}>
        <span style={{ fontSize: 11, color: MUTED, fontFamily: MONO }}>No trend data yet — check back after more games are processed.</span>
      </div>
    )
  }

  const stats = tab === 'batting' ? BAT_STATS : []

  return (
    <div ref={glowRef} className="team-glow-border"
      style={{ marginBottom: 8, background: '#0a0a0f', '--team-primary': colors?.primary ?? ACCENT, '--team-secondary': colors?.secondary ?? '#ffffff' } as React.CSSProperties}
    >
      {/* Team header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: colors?.primary ?? ACCENT, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: OSWALD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{teamName}</span>
        <span style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em' }}>{rows.length} Games</span>
      </div>

      {tab === 'pitching' ? (
        <>
          <div style={{ padding: '24px 16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Pitching Trend Data Coming Soon
            </div>
            <div style={{ fontSize: 10, color: '#3a3a4a', fontFamily: MONO }}>
              ERA, WHIP, K, BB Allowed, HR Allowed, Hits Allowed — populates after pitching columns are added.
            </div>
          </div>
          {starters && starters.length > 0 && (
            <RotationSection
              rows={rows}
              starters={starters}
              isPro={isPro}
              teamColor={TEAM_COLORS[teamName]?.primary ?? ACCENT}
            />
          )}
          {!isPro && rows.length > FREE_CELLS && <UpgradeNudge count={rows.length - FREE_CELLS} />}
        </>
      ) : (
        <>
          <SummaryBar rows={rows} mlbAvg={mlbAvg} />
          <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
            <div>
              <TrendDateHeader rows={rows} headerBg={HEADER_BG} />
              {stats.map((cfg, i) => (
                <StatRow key={cfg.key} cfg={cfg} rows={rows} isPro={isPro}
                  onEnter={onEnter} onLeave={onLeave}
                  rowBg={i % 2 === 0 ? '#0a0a0f' : '#0d0d14'}
                  mlbAvg={mlbAvg} />
              ))}
            </div>
          </div>
          {!isPro && rows.length > FREE_CELLS && <UpgradeNudge count={rows.length - FREE_CELLS} />}
        </>
      )}
    </div>
  )
}

// ─── Player section ───────────────────────────────────────────────────────────
function PlayerSection({ playerName, entry, isPro, onEnter, onLeave }: {
  playerName: string
  entry:      PlayerEntry
  isPro:      boolean
  onEnter:    (e: React.MouseEvent, cell: TrendCell, label: string, fmtVal: (v: number) => string) => void
  onLeave:    () => void
}) {
  const glowRef   = useRef<HTMLDivElement>(null)
  const colors    = TEAM_COLORS[entry.team]
  const HEADER_BG = '#0d0d14'
  const games     = entry.games

  useEffect(() => {
    const el = glowRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => e.target.classList.toggle('team-glow-active', e.isIntersecting), { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  if (!games.length) return null

  return (
    <div ref={glowRef} className="team-glow-border"
      style={{ marginBottom: 8, background: '#0a0a0f', '--team-primary': colors?.primary ?? ACCENT, '--team-secondary': colors?.secondary ?? '#ffffff' } as React.CSSProperties}
    >
      {/* Player header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: colors?.primary ?? ACCENT, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: OSWALD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{playerName}</span>
        <span style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.06em' }}>{entry.team}</span>
        <span style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', marginLeft: 4 }}>{games.length} Games</span>
      </div>

      <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div>
          <TrendDateHeader rows={games} headerBg={HEADER_BG} />
          {PLAYER_BAT_STATS.map((cfg, i) => (
            <StatRow key={cfg.key} cfg={cfg} rows={games} isPro={isPro}
              onEnter={onEnter} onLeave={onLeave}
              rowBg={i % 2 === 0 ? '#0a0a0f' : '#0d0d14'} />
          ))}
        </div>
      </div>
      {!isPro && games.length > FREE_CELLS && <UpgradeNudge count={games.length - FREE_CELLS} />}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TrendsClient() {
  const { isPro, memberTier, openModal, setIsMember } = useAuth()
  void memberTier; void openModal; void setIsMember

  const [activeLeague,   setActiveLeague]   = useState('mlb')
  const [activeTab,      setActiveTab]      = useState<TabType>('batting')
  const [teamFilter,     setTeamFilter]     = useState('')
  const [loading,        setLoading]        = useState(true)
  const [allData,        setAllData]        = useState<Record<string, TeamGameRow[]>>({})
  const [mlbAvgs,        setMlbAvgs]        = useState<Record<string, TeamMLBAvg>>({})
  const [playerData,       setPlayerData]       = useState<Record<string, PlayerEntry>>({})
  const [playerLoading,    setPlayerLoading]    = useState(false)
  const [playerSearch,     setPlayerSearch]     = useState('')
  const [playerTeamFilter, setPlayerTeamFilter] = useState('')
  const [starterData,      setStarterData]      = useState<Record<string, StarterRow[]>>({})
  const [tooltip,          setTooltip]          = useState<TooltipData | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchAllTeamGameStats('MLB'),
      fetchMLBTeamAverages(),
    ]).then(([gameData, avgData]) => {
      setAllData(gameData)
      setMlbAvgs(avgData)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (activeTab !== 'player' || Object.keys(playerData).length > 0) return
    setPlayerLoading(true)
    fetchAllPlayerGameStats('MLB').then(data => { setPlayerData(data); setPlayerLoading(false) })
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== 'pitching' || Object.keys(starterData).length > 0) return
    supabase
      .from('team_game_starters')
      .select('team_name,game_date,pitcher_name,decision,innings_pitched,earned_runs,strikeouts')
      .eq('league', 'MLB')
      .order('game_date', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return
        const grouped: Record<string, StarterRow[]> = {}
        for (const row of data as Array<{ team_name: string } & StarterRow>) {
          if (!grouped[row.team_name]) grouped[row.team_name] = []
          grouped[row.team_name].push({
            game_date:       row.game_date,
            pitcher_name:    row.pitcher_name,
            decision:        row.decision,
            innings_pitched: row.innings_pitched,
            earned_runs:     row.earned_runs,
            strikeouts:      row.strikeouts,
          })
        }
        setStarterData(grouped)
      })
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayTeams = useMemo(() => {
    const base = teamFilter ? [teamFilter] : MLB_TEAMS
    return base.filter(t => !teamFilter || allData[t] !== undefined || loading)
  }, [teamFilter, allData, loading])

  const displayPlayers = useMemo(() => {
    return Object.entries(playerData)
      .filter(([name, entry]) => {
        const matchSearch = !playerSearch || name.toLowerCase().includes(playerSearch.toLowerCase())
        const matchTeam   = !playerTeamFilter || entry.team === playerTeamFilter
        return matchSearch && matchTeam
      })
      .sort(([a], [b]) => a.localeCompare(b))
  }, [playerData, playerSearch, playerTeamFilter])

  function handleEnter(e: React.MouseEvent, cell: TrendCell, statLabel: string, fmtVal: (v: number) => string) {
    setTooltip({ x: e.clientX, y: e.clientY, cell, statLabel, fmtVal })
  }
  function handleLeave() { setTooltip(null) }

  const selectStyle: React.CSSProperties = {
    height: 36, background: '#0a0a0f', border: `1px solid ${BORDER}`,
    borderRadius: 6, outline: 'none', padding: '0 10px',
    color: TEXT, fontSize: 11, fontFamily: MONO,
    cursor: 'pointer', appearance: 'none' as const,
  }

  const tabPill = (active: boolean): React.CSSProperties => ({
    background:    active ? ACCENT : 'transparent',
    color:         active ? '#000' : '#ffffff',
    border:        active ? 'none' : `1px solid ${BORDER}`,
    borderRadius:  6, padding: '5px 16px',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer',
    fontFamily: MONO, transition: 'all 0.15s',
    boxShadow: active ? `0 0 12px ${ACCENT}55` : 'none',
  })

  return (
    <div style={{ paddingLeft: 64, minHeight: '100vh', background: `radial-gradient(ellipse at 50% -10%, rgba(57,255,154,0.07) 0%, transparent 55%), #08080d` }}>
      <style>{`
        .cell { display:flex; align-items:center; justify-content:center; height:34px; width:32px; margin:0 1px; border-radius:4px; font-size:12px; letter-spacing:0.05em; }
      `}</style>

      {/* Floating tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', zIndex: 9999, pointerEvents: 'none',
          left: tooltip.x + 14, top: tooltip.y - 70,
          background: '#0f0f14', border: `1px solid ${BORDER}`,
          borderRadius: 6, padding: '8px 12px',
          fontFamily: MONO, fontSize: 10, color: TEXT,
          boxShadow: '0 4px 16px rgba(0,0,0,0.7)', minWidth: 160,
        }}>
          <div style={{ color: MUTED, marginBottom: 4, letterSpacing: '0.06em' }}>{tooltip.cell.game_date}</div>
          <div style={{ marginBottom: 2 }}>{tooltip.statLabel}: <strong>{tooltip.fmtVal(tooltip.cell.actual_value)}</strong></div>
          <div style={{ color: MUTED, marginBottom: 2 }}>Season avg: {tooltip.fmtVal(tooltip.cell.season_avg)}</div>
          <div style={{ color: tooltip.cell.pct_diff > 0 ? CLR_ABOVE : tooltip.cell.pct_diff < 0 ? CLR_BELOW : CLR_AVERAGE, fontWeight: 700 }}>
            {tooltip.cell.pct_diff > 0 ? '+' : ''}{tooltip.cell.pct_diff.toFixed(1)}% vs average
          </div>
        </div>
      )}

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 64, zIndex: 30, background: 'rgba(8,8,13,0.97)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}` }}>
        {/* League tabs */}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 6, height: 48, borderBottom: '1px solid #12121a' }}>
          {LEAGUE_TABS.map(tab => {
            const on = activeLeague === tab.key
            return (
              <div key={tab.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <button onClick={() => tab.active && setActiveLeague(tab.key)}
                  style={{ ...tabPill(on), cursor: tab.active ? 'pointer' : 'default', opacity: tab.active ? 1 : 0.5 }}>
                  {tab.label}
                </button>
                {!tab.active && (
                  <span style={{ fontSize: 7, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: MONO, background: '#1a1a24', padding: '1px 5px', borderRadius: 2 }}>SOON</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Primary tabs — driven by LEAGUE_SUB_TABS; MLB shows BATTING/PITCHING only */}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 4, height: 44 }}>
          {(LEAGUE_SUB_TABS[activeLeague] ?? MLB_SUB_TABS).map(tab => {
            const leagueActive = LEAGUE_TABS.find(l => l.key === activeLeague)?.active ?? false
            const on = activeTab === tab.key
            return (
              <button
                key={tab.key}
                style={{ ...tabPill(on), cursor: leagueActive ? 'pointer' : 'default', opacity: leagueActive ? 1 : 0.5 }}
                onClick={() => leagueActive && setActiveTab(tab.key as TabType)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Page header */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{ fontSize: 10, color: MUTED, letterSpacing: '0.26em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: MONO }}>
          {activeTab === 'player' ? 'How each player is performing vs their own season averages.' : 'How each team is performing vs their own season averages — game by game.'}
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, fontFamily: OSWALD }}>TRENDS</h1>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
          {[
            { color: CLR_ABOVE,   symbol: '▲', label: 'Above avg' },
            { color: CLR_BELOW,   symbol: '▼', label: 'Below avg'  },
            { color: CLR_AVERAGE, symbol: '—', label: 'At average' },
          ].map(({ color, symbol, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.08em' }}>
              <span style={{ display: 'inline-flex', width: 18, height: 18, borderRadius: 3, background: color, alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#000', fontWeight: 800 }}>
                {symbol}
              </span>
              {label}
            </span>
          ))}
          <span style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.06em' }}>· ±5% threshold</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {activeTab === 'player' ? (
            <>
              <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase' }}>PLAYER</label>
              <input
                type="text"
                placeholder="Search player name…"
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                style={{ ...selectStyle, width: 220, padding: '0 10px' }}
              />
              <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase' }}>TEAM</label>
              <select value={playerTeamFilter} onChange={e => setPlayerTeamFilter(e.target.value)}
                style={{ ...selectStyle, width: 220, color: playerTeamFilter ? TEXT : MUTED }}>
                <option value="">All Teams</option>
                {MLB_TEAMS.map(t => <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>)}
              </select>
              {playerLoading && <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading…</span>}
            </>
          ) : (
            <>
              <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase' }}>TEAM</label>
              <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
                style={{ ...selectStyle, width: 240, color: teamFilter ? TEXT : MUTED }}>
                <option value="">All Teams</option>
                {MLB_TEAMS.map(t => <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>)}
              </select>
              {loading && <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading…</span>}
            </>
          )}
        </div>
      </div>

      {/* Team sections */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 8px 80px' }}>

        {/* Batting / Pitching tabs */}
        {(activeTab === 'batting' || activeTab === 'pitching') && (
          <>
            {!loading && displayTeams.length === 0 && (
              <div style={{ padding: '80px 24px', textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                No trend data yet — run the backfill script to populate historical data.
              </div>
            )}
            {!loading && displayTeams.map(teamName => (
              <TeamSection key={teamName} teamName={teamName} rows={allData[teamName] ?? []}
                tab={activeTab} isPro={isPro} onEnter={handleEnter} onLeave={handleLeave}
                mlbAvg={mlbAvgs[teamName]} starters={starterData[teamName]} />
            ))}
          </>
        )}

        {/* Player Trends tab */}
        {activeTab === 'player' && (
          <>
            {playerLoading && (
              <div style={{ padding: '80px 24px', textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Loading player stats…
              </div>
            )}
            {!playerLoading && displayPlayers.length === 0 && (
              <div style={{ padding: '80px 24px', textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {Object.keys(playerData).length === 0
                  ? 'No player data yet — run the backfill script to populate historical data.'
                  : 'No players match your search.'}
              </div>
            )}
            {!playerLoading && displayPlayers.map(([playerName, entry]) => (
              <PlayerSection key={playerName} playerName={playerName} entry={entry}
                isPro={isPro} onEnter={handleEnter} onLeave={handleLeave} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
