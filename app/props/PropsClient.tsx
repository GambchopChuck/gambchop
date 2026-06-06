'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { TEAM_COLORS } from '@/lib/teamColors'
import { TEAM_ROUTES } from '@/lib/teamRoutes'
import { type Favorite, type BetType, fetchFavorites, addFavorite, removeFavorite } from '@/lib/favorites'

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT      = '#39ff9a'
const MONO        = 'var(--font-jetbrains), "JetBrains Mono", monospace'
const OSWALD      = 'var(--font-oswald), "Oswald", sans-serif'
const BORDER      = '#1a1a24'
const MUTED       = '#52525b'
const TEXT        = '#f4f4f5'
const FREE_CELLS  = 3
const CELL_W      = 32
const LABEL_W     = 186

// Player section colors (unchanged)
const STAT_OVER  = '#8b5cf6'
const STAT_UNDER = '#b45309'
const STAT_PUSH  = '#f4f4f5'

// Alt Lines colors
const ALT_WIN  = '#16a34a'
const ALT_LOSS = '#dc2626'
const ALT_TIE  = '#ca8a04'
const ALT_GRAY = '#2a2a35'

type ViewTab = 'team' | 'player'

// ─── League tabs ──────────────────────────────────────────────────────────────
const LEAGUE_TABS = [
  { key: 'mlb',  label: 'MLB',  active: true  },
  { key: 'nba',  label: 'NBA',  active: false },
  { key: 'nfl',  label: 'NFL',  active: false },
  { key: 'nhl',  label: 'NHL',  active: false },
  { key: 'wnba', label: 'WNBA', active: false },
] as const

// ─── MLB team list ────────────────────────────────────────────────────────────
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

// ─── Alt Lines configs ────────────────────────────────────────────────────────
type AltLineRowKey = 'first3' | 'first5' | 'first7' | 'runs' | 'altrl_minus' | 'altrl_plus' | 'rundiff'
type AltLineFilter = 'all' | '1st3' | '1st5' | '1st7' | 'runs' | 'altrl' | 'rundiff'

const ALT_LINE_CONFIGS: { key: AltLineRowKey; label: string; filterKey: AltLineFilter }[] = [
  { key: 'first3',      label: '1ST 3 INN',   filterKey: '1st3'    },
  { key: 'first5',      label: '1ST 5 INN',   filterKey: '1st5'    },
  { key: 'first7',      label: '1ST 7 INN',   filterKey: '1st7'    },
  { key: 'runs',        label: 'RUNS SCORED', filterKey: 'runs'    },
  { key: 'altrl_minus', label: 'ALT RL -2.5', filterKey: 'altrl'   },
  { key: 'altrl_plus',  label: 'ALT RL +2.5', filterKey: 'altrl'   },
  { key: 'rundiff',     label: 'RUN DIFF',    filterKey: 'rundiff' },
]

const FILTER_PILLS: { key: AltLineFilter; label: string }[] = [
  { key: 'all',     label: 'ALL'     },
  { key: '1st3',    label: '1ST 3'   },
  { key: '1st5',    label: '1ST 5'   },
  { key: '1st7',    label: '1ST 7'   },
  { key: 'runs',    label: 'RUNS'    },
  { key: 'altrl',   label: 'ALT RL'  },
  { key: 'rundiff', label: 'RUN DIFF'},
]

// ─── Player stat configs (unchanged) ─────────────────────────────────────────
type PlayerStatKey = 'home_runs' | 'hits' | 'rbi' | 'strikeouts' | 'walks'

const PLAYER_STAT_CONFIGS: { key: PlayerStatKey; label: string; defaultLine: number }[] = [
  { key: 'home_runs',  label: 'HR',   defaultLine: 0.5 },
  { key: 'hits',       label: 'HITS', defaultLine: 1.5 },
  { key: 'rbi',        label: 'RBI',  defaultLine: 0.5 },
  { key: 'strikeouts', label: 'SO',   defaultLine: 1.5 },
  { key: 'walks',      label: 'BB',   defaultLine: 0.5 },
]

// ─── Data types ───────────────────────────────────────────────────────────────
type AltLineGameRow = {
  game_date:              string
  score_after_3:          number | null
  opponent_score_after_3: number | null
  score_after_5:          number | null
  opponent_score_after_5: number | null
  score_after_7:          number | null
  opponent_score_after_7: number | null
  run_differential:       number | null
  runs:                   number | null
}
type AltLineGameMap = Map<string, AltLineGameRow>

type PlayerGameRow = {
  game_date:  string
  home_runs:  number | null
  hits:       number | null
  rbi:        number | null
  strikeouts: number | null
  walks:      number | null
}
type PlayerGameMap = Map<string, PlayerGameRow>
type PlayerEntry = { team: string; games: PlayerGameMap }

// ─── Cell result helpers ──────────────────────────────────────────────────────
type CellResult = {
  bg: string
  letter: string
  textColor: string
  glow: string
  tooltip: string
  isNoData: boolean
}

function computeCellResult(rowKey: AltLineRowKey, game: AltLineGameRow): CellResult {
  const noData: CellResult = {
    bg: ALT_GRAY, letter: '—', textColor: '#71717a', glow: 'none', tooltip: 'No data', isNoData: true,
  }
  const mkWin  = (tip: string): CellResult => ({ bg: ALT_WIN,  letter: 'W', textColor: '#fff', glow: `0 0 14px ${ALT_WIN}90`,  tooltip: tip, isNoData: false })
  const mkLoss = (tip: string): CellResult => ({ bg: ALT_LOSS, letter: 'L', textColor: '#fff', glow: `0 0 14px ${ALT_LOSS}90`, tooltip: tip, isNoData: false })
  const mkTie  = (tip: string): CellResult => ({ bg: ALT_TIE,  letter: 'T', textColor: '#fff', glow: `0 0 14px ${ALT_TIE}90`,  tooltip: tip, isNoData: false })

  switch (rowKey) {
    case 'first3': {
      const s = game.score_after_3, o = game.opponent_score_after_3
      if (s === null || o === null) return noData
      const tip = `${game.game_date} · After 3: ${s}–${o}`
      return s > o ? mkWin(tip + ' · WIN') : s < o ? mkLoss(tip + ' · LOSS') : mkTie(tip + ' · TIE')
    }
    case 'first5': {
      const s = game.score_after_5, o = game.opponent_score_after_5
      if (s === null || o === null) return noData
      const tip = `${game.game_date} · After 5: ${s}–${o}`
      return s > o ? mkWin(tip + ' · WIN') : s < o ? mkLoss(tip + ' · LOSS') : mkTie(tip + ' · TIE')
    }
    case 'first7': {
      const s = game.score_after_7, o = game.opponent_score_after_7
      if (s === null || o === null) return noData
      const tip = `${game.game_date} · After 7: ${s}–${o}`
      return s > o ? mkWin(tip + ' · WIN') : s < o ? mkLoss(tip + ' · LOSS') : mkTie(tip + ' · TIE')
    }
    case 'runs': {
      const r = game.runs
      if (r === null) return noData
      return r > 4.5
        ? { bg: ALT_WIN,  letter: 'O', textColor: '#fff', glow: `0 0 14px ${ALT_WIN}90`,  tooltip: `${game.game_date} · ${r} runs · O 4.5`, isNoData: false }
        : { bg: ALT_LOSS, letter: 'U', textColor: '#fff', glow: `0 0 14px ${ALT_LOSS}90`, tooltip: `${game.game_date} · ${r} runs · U 4.5`, isNoData: false }
    }
    case 'altrl_minus': {
      const rd = game.run_differential
      if (rd === null) return noData
      const rdStr = rd >= 0 ? `+${rd}` : `${rd}`
      return rd >= 3
        ? mkWin(`${game.game_date} · Diff: ${rdStr} · W (-2.5)`)
        : mkLoss(`${game.game_date} · Diff: ${rdStr} · L (-2.5)`)
    }
    case 'altrl_plus': {
      const rd = game.run_differential
      if (rd === null) return noData
      const rdStr = rd >= 0 ? `+${rd}` : `${rd}`
      return rd >= -2
        ? mkWin(`${game.game_date} · Diff: ${rdStr} · W (+2.5)`)
        : mkLoss(`${game.game_date} · Diff: ${rdStr} · L (+2.5)`)
    }
    case 'rundiff': {
      const rd = game.run_differential
      if (rd === null) return noData
      const lbl = rd > 0 ? `+${rd}` : `${rd}`
      if (rd > 0) return { bg: ALT_WIN,  letter: lbl, textColor: '#fff', glow: `0 0 14px ${ALT_WIN}90`,  tooltip: `${game.game_date} · Run diff: +${rd}`, isNoData: false }
      if (rd < 0) return { bg: ALT_LOSS, letter: lbl, textColor: '#fff', glow: `0 0 14px ${ALT_LOSS}90`, tooltip: `${game.game_date} · Run diff: ${rd}`,  isNoData: false }
      return { bg: ALT_TIE, letter: '0', textColor: '#fff', glow: `0 0 14px ${ALT_TIE}90`, tooltip: `${game.game_date} · Run diff: 0`, isNoData: false }
    }
    default: return noData
  }
}

function computeRecord(rowKey: AltLineRowKey, games: AltLineGameRow[]) {
  let w = 0, l = 0, t = 0
  for (const g of games) {
    const r = computeCellResult(rowKey, g)
    if (r.isNoData) continue
    if (r.letter === 'W' || r.letter === 'O') w++
    else if (r.letter === 'L' || r.letter === 'U') l++
    else if (r.letter === 'T') t++
  }
  return { w, l, t }
}

function computeAvgRunDiff(games: AltLineGameRow[]): string {
  const vals = games.map(g => g.run_differential).filter((v): v is number => v !== null)
  if (!vals.length) return ''
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return `${avg >= 0 ? '+' : ''}${avg.toFixed(1)} avg`
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function PropsLegend({ isTeam }: { isTeam: boolean }) {
  if (isTeam) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {[
          { color: ALT_WIN,  label: 'WIN / OVER'  },
          { color: ALT_LOSS, label: 'LOSS / UNDER' },
          { color: ALT_TIE,  label: 'TIE / PUSH'   },
          { color: ALT_GRAY, label: 'NO DATA', border: '1px solid #3f3f46' },
        ].map(({ color, label, border }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 9, height: 9, background: color, borderRadius: 2, flexShrink: 0, border }} />
            <span style={{ fontSize: 9, color: TEXT, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: MONO }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
      {[
        { color: STAT_OVER,  label: 'Over line'                                          },
        { color: STAT_UNDER, label: 'Under line'                                         },
        { color: STAT_PUSH,  label: 'Push / At line', border: `1px solid ${BORDER}` },
      ].map(({ color, label, border }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 9, height: 9, background: color, borderRadius: 2, flexShrink: 0, border }} />
          <span style={{ fontSize: 9, color: TEXT, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: MONO }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Date header ──────────────────────────────────────────────────────────────
function PropsDateHeader({ games, headerBg }: {
  games:    Array<{ game_date: string }>
  headerBg: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0 2px', borderBottom: `1px solid ${BORDER}`, background: headerBg }}>
      <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: headerBg, zIndex: 2, paddingLeft: 16 }}>
        <span style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Game Date</span>
      </div>
      <div style={{ display: 'flex', gap: 3, paddingRight: 16 }}>
        {games.map(g => {
          const parts = g.game_date.split('-')
          const m = parseInt(parts[1] ?? '0', 10)
          const d = parseInt(parts[2] ?? '0', 10)
          return (
            <div key={g.game_date} style={{ width: CELL_W, minWidth: CELL_W, flexShrink: 0, textAlign: 'center' }}>
              <span style={{ fontSize: 8, color: '#a1a1aa', fontFamily: MONO }}>{m}/{d}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Alt Line row ─────────────────────────────────────────────────────────────
function AltLineRow({ rowKey, label, games, isPro, rowBg, isStarred, onStarClick }: {
  rowKey:       AltLineRowKey
  label:        string
  games:        AltLineGameRow[]
  isPro:        boolean
  rowBg:        string
  isStarred?:   boolean
  onStarClick?: () => void
}) {
  const lockBefore = isPro ? 0 : Math.max(0, games.length - FREE_CELLS)

  const recordDisplay = useMemo(() => {
    if (rowKey === 'rundiff') return computeAvgRunDiff(games)
    const { w, l, t } = computeRecord(rowKey, games)
    return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`
  }, [rowKey, games])

  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 38 }}>
      {/* Sticky label */}
      <div style={{
        width: LABEL_W, minWidth: LABEL_W, flexShrink: 0,
        position: 'sticky', left: 0, zIndex: 2, background: rowBg,
        display: 'flex', alignItems: 'center', paddingLeft: 16,
      }}>
        {onStarClick && (
          <button
            onClick={onStarClick}
            title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 4px', lineHeight: 1, flexShrink: 0,
              fontSize: 13, color: isStarred ? '#eab308' : '#3a3a4a',
              transition: 'color 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = isStarred ? '#ca8a04' : '#7a7a8a')}
            onMouseLeave={e => (e.currentTarget.style.color = isStarred ? '#eab308' : '#3a3a4a')}
          >
            {isStarred ? '★' : '☆'}
          </button>
        )}
        <div style={{ width: 2, height: 12, background: ALT_WIN, borderRadius: 2, marginRight: 8, marginLeft: onStarClick ? 2 : 0, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: TEXT, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ fontSize: 9, color: ALT_WIN, fontWeight: 700, marginLeft: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
          &nbsp;{recordDisplay}
        </span>
      </div>

      {/* Cells */}
      <div style={{ display: 'flex', gap: 3, paddingRight: 16 }}>
        {games.map((g, i) => {
          const r = computeCellResult(rowKey, g)
          const locked = i < lockBefore
          const isLong = r.letter.length > 2
          return (
            <div
              key={g.game_date}
              style={{
                width: CELL_W, height: 36, borderRadius: 4, background: r.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isLong ? 8 : 11, fontWeight: 900, color: r.textColor, flexShrink: 0,
                boxShadow: locked ? 'none' : r.glow,
                filter:     locked ? 'blur(3px)' : 'none',
                opacity:    locked ? 0.35 : 1,
                cursor:     'default',
                userSelect: 'none' as const,
              }}
              title={locked ? undefined : r.tooltip}
            >
              {r.letter}
            </div>
          )
        })}
        {games.length === 0 && (
          <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.08em', padding: '8px 0' }}>
            No data yet
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Prop cell (player section) ───────────────────────────────────────────────
function PropCell({ actual, line, label, date, isLocked }: {
  actual:   number | null
  line:     number
  label:    string
  date:     string
  isLocked: boolean
}) {
  if (actual === null) return <div style={{ width: CELL_W, height: 36, flexShrink: 0 }} />
  const result = actual > line ? 'over' : actual < line ? 'under' : 'push'
  const s = {
    over:  { bg: STAT_OVER,  glow: `0 0 14px ${STAT_OVER}90`,  letter: 'O', color: '#fff' },
    under: { bg: STAT_UNDER, glow: `0 0 14px ${STAT_UNDER}90`, letter: 'U', color: '#fff' },
    push:  { bg: STAT_PUSH,  glow: 'none',                      letter: 'P', color: '#000' },
  }[result]

  return (
    <div
      style={{
        width: CELL_W, height: 36, borderRadius: 4, background: s.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 900, color: s.color, flexShrink: 0,
        boxShadow: s.glow,
        filter:     isLocked ? 'blur(3px)' : 'none',
        opacity:    isLocked ? 0.35 : 1,
        cursor:     'default',
        userSelect: 'none' as const,
      }}
      title={isLocked ? undefined : `${date} · ${actual} ${label.toLowerCase()} · Line: ${line} · ${result.toUpperCase()}`}
    >
      {s.letter}
    </div>
  )
}

// ─── Prop row (player section) ────────────────────────────────────────────────
function PropRow({ statKey, label, line, games, isPro, rowBg, isStarred, onStarClick }: {
  statKey:      string
  label:        string
  line:         number
  games:        Array<{ game_date: string } & Record<string, number | null | string>>
  isPro:        boolean
  rowBg:        string
  isStarred?:   boolean
  onStarClick?: () => void
}) {
  const lockBefore = isPro ? 0 : Math.max(0, games.length - FREE_CELLS)

  const record = useMemo(() => {
    let o = 0, u = 0
    for (const g of games) {
      const v = g[statKey]
      if (typeof v !== 'number') continue
      if (v > line) o++
      else if (v < line) u++
    }
    return { o, u }
  }, [games, statKey, line])

  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 38 }}>
      <div style={{
        width: LABEL_W, minWidth: LABEL_W, flexShrink: 0,
        position: 'sticky', left: 0, zIndex: 2, background: rowBg,
        display: 'flex', alignItems: 'center', paddingLeft: 16,
      }}>
        {onStarClick && (
          <button
            onClick={onStarClick}
            title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 4px', lineHeight: 1, flexShrink: 0,
              fontSize: 13, color: isStarred ? '#eab308' : '#3a3a4a',
              transition: 'color 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = isStarred ? '#ca8a04' : '#7a7a8a')}
            onMouseLeave={e => (e.currentTarget.style.color = isStarred ? '#eab308' : '#3a3a4a')}
          >
            {isStarred ? '★' : '☆'}
          </button>
        )}
        <div style={{ width: 2, height: 12, background: STAT_OVER, borderRadius: 2, marginRight: 8, marginLeft: onStarClick ? 2 : 0, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: TEXT, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {label} ({line})
        </span>
        <span style={{ fontSize: 9, color: STAT_OVER, fontWeight: 700, marginLeft: 4, flexShrink: 0 }}>
          &nbsp;{record.o}-{record.u}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 3, paddingRight: 16 }}>
        {games.map((g, i) => (
          <PropCell
            key={g.game_date}
            actual={typeof g[statKey] === 'number' ? g[statKey] as number : null}
            line={line}
            label={label}
            date={g.game_date}
            isLocked={i < lockBefore}
          />
        ))}
        {games.length === 0 && (
          <span style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.08em', padding: '8px 0' }}>
            No data yet
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Team section (Alt Lines) ─────────────────────────────────────────────────
function TeamSection({ teamName, games, isPro, altFilter, starredProps, onStarClick }: {
  teamName:     string
  games:        AltLineGameRow[]
  isPro:        boolean
  altFilter:    AltLineFilter
  starredProps: Set<string>
  onStarClick:  (rowKey: string, teamName: string) => void
}) {
  const glowRef   = useRef<HTMLDivElement>(null)
  const colors    = TEAM_COLORS[teamName]
  const href      = TEAM_ROUTES[teamName]
  const HEADER_BG = '#0d0d14'

  const visibleConfigs = altFilter === 'all'
    ? ALT_LINE_CONFIGS
    : ALT_LINE_CONFIGS.filter(c => c.filterKey === altFilter)

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

  return (
    <div
      ref={glowRef}
      className="team-glow-border"
      style={{
        background: '#0a0a0f', borderRadius: 0, marginBottom: 8,
        '--team-primary':   colors?.primary   ?? ACCENT,
        '--team-secondary': colors?.secondary ?? '#ffffff',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 8px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: colors?.primary ?? ACCENT, flexShrink: 0 }} />
        {href ? (
          <Link href={href} style={{ textDecoration: 'none' }}>
            <span
              style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: OSWALD, letterSpacing: '0.04em', textTransform: 'uppercase' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = ACCENT)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = TEXT)}
            >
              {teamName}
            </span>
          </Link>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: OSWALD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {teamName}
          </span>
        )}
        <span style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em' }}>
          {games.length} Games
        </span>
      </div>

      <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div>
          {games.length > 0 && <PropsDateHeader games={games} headerBg={HEADER_BG} />}
          {visibleConfigs.map((cfg, i) => {
            const rowBg  = i % 2 === 0 ? '#0a0a0f' : '#0d0d14'
            const favKey = `${teamName}|prop_${cfg.key}`
            return (
              <div key={cfg.key} style={{ background: rowBg }}>
                <AltLineRow
                  rowKey={cfg.key}
                  label={cfg.label}
                  games={games}
                  isPro={isPro}
                  rowBg={rowBg}
                  isStarred={starredProps.has(favKey)}
                  onStarClick={() => onStarClick(cfg.key, teamName)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {!isPro && games.length > FREE_CELLS && (
        <div style={{
          margin: '0 16px 10px', padding: '7px 12px',
          background: `linear-gradient(135deg, ${ACCENT}0d 0%, #8b5cf60d 100%)`,
          border: `1px solid ${ACCENT}33`, borderRadius: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ fontSize: 9, color: TEXT, fontFamily: MONO }}>
            🔒 {games.length - FREE_CELLS} older games hidden
          </span>
          <Link href="/pricing" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: '#000', background: ACCENT, padding: '3px 10px', borderRadius: 3, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Go Pro →
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Player section ───────────────────────────────────────────────────────────
function PlayerSection({ playerName, teamName, games, isPro }: {
  playerName: string
  teamName:   string
  games:      PlayerGameRow[]
  isPro:      boolean
}) {
  const glowRef   = useRef<HTMLDivElement>(null)
  const colors    = TEAM_COLORS[teamName]
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

  return (
    <div
      ref={glowRef}
      className="team-glow-border"
      style={{
        background: '#0a0a0f', borderRadius: 0, marginBottom: 8,
        '--team-primary':   colors?.primary   ?? ACCENT,
        '--team-secondary': colors?.secondary ?? '#ffffff',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 8px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: colors?.primary ?? ACCENT, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: OSWALD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {playerName}
        </span>
        <span style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.08em' }}>{teamName}</span>
        <span style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', marginLeft: 4 }}>
          {games.length} Games
        </span>
      </div>

      <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div>
          {games.length > 0 && <PropsDateHeader games={games} headerBg={HEADER_BG} />}
          {PLAYER_STAT_CONFIGS.map((cfg, i) => {
            const rowBg = i % 2 === 0 ? '#0a0a0f' : '#0d0d14'
            return (
              <div key={cfg.key} style={{ background: rowBg }}>
                <PropRow
                  statKey={cfg.key}
                  label={cfg.label}
                  line={cfg.defaultLine}
                  games={games as Array<{ game_date: string } & Record<string, number | null | string>>}
                  isPro={isPro}
                  rowBg={rowBg}
                />
              </div>
            )
          })}
        </div>
      </div>

      {!isPro && games.length > FREE_CELLS && (
        <div style={{
          margin: '0 16px 10px', padding: '7px 12px',
          background: `linear-gradient(135deg, ${ACCENT}0d 0%, #8b5cf60d 100%)`,
          border: `1px solid ${ACCENT}33`, borderRadius: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ fontSize: 9, color: TEXT, fontFamily: MONO }}>
            🔒 {games.length - FREE_CELLS} older games hidden
          </span>
          <Link href="/pricing" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: '#000', background: ACCENT, padding: '3px 10px', borderRadius: 3, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Go Pro →
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PropsClient() {
  const { isPro, memberTier, user } = useAuth()
  const router = useRouter()

  const [viewTab,          setViewTab]         = useState<ViewTab>('team')
  const [activeLeague,     setActiveLeague]     = useState('mlb')
  const [loading,          setLoading]          = useState(true)
  const [playerLoading,    setPlayerLoading]    = useState(false)
  const [allData,          setAllData]          = useState<Record<string, AltLineGameMap>>({})
  const [playerData,       setPlayerData]       = useState<Record<string, PlayerEntry>>({})
  const [teamFilter,       setTeamFilter]       = useState<string>('')
  const [altFilter,        setAltFilter]        = useState<AltLineFilter>('all')
  const [playerSearch,     setPlayerSearch]     = useState<string>('')
  const [playerTeamFilter, setPlayerTeamFilter] = useState<string>('')

  const [allFavorites, setAllFavorites] = useState<Favorite[]>([])
  const [favError,     setFavError]     = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    fetchFavorites(user.id).then(setAllFavorites)
  }, [user?.id])

  const starredProps = useMemo(
    () => new Set(allFavorites.map(f => `${f.team_name}|${f.bet_type}`)),
    [allFavorites],
  )

  async function handlePropStarClick(rowKey: string, teamName: string) {
    if (!user?.id) { router.push('/pricing'); return }
    const bt = `prop_${rowKey}` as BetType
    const existing = allFavorites.find(f => f.team_name === teamName && f.bet_type === bt)
    if (existing) {
      const ok = await removeFavorite(existing.id)
      if (ok) setAllFavorites(prev => prev.filter(f => f.id !== existing.id))
    } else {
      if (memberTier !== 'pro') { router.push('/pricing'); return }
      const result = await addFavorite(
        user.id,
        { team_name: teamName, league_id: 'mlb', league_name: 'MLB', bet_type: bt },
        allFavorites.length,
      )
      if (result.error) {
        setFavError(result.error)
        setTimeout(() => setFavError(null), 4000)
      } else {
        setAllFavorites(prev => [...prev, result.data!])
      }
    }
  }

  // Load alt-lines data: merge team_game_linescore + runs from team_game_stats
  useEffect(() => {
    async function load() {
      setLoading(true)

      const [{ data: lsData }, { data: stData }] = await Promise.all([
        supabase
          .from('team_game_linescore')
          .select('team_name,game_date,score_after_3,opponent_score_after_3,score_after_5,opponent_score_after_5,score_after_7,opponent_score_after_7,run_differential')
          .eq('league', 'MLB')
          .order('game_date', { ascending: true }),
        supabase
          .from('team_game_stats')
          .select('team_name,game_date,runs')
          .eq('league', 'MLB')
          .order('game_date', { ascending: true }),
      ])

      const grouped: Record<string, AltLineGameMap> = {}

      for (const row of (lsData ?? []) as Array<{
        team_name: string; game_date: string
        score_after_3: number|null; opponent_score_after_3: number|null
        score_after_5: number|null; opponent_score_after_5: number|null
        score_after_7: number|null; opponent_score_after_7: number|null
        run_differential: number|null
      }>) {
        if (!grouped[row.team_name]) grouped[row.team_name] = new Map()
        grouped[row.team_name].set(row.game_date, {
          game_date:              row.game_date,
          score_after_3:          row.score_after_3,
          opponent_score_after_3: row.opponent_score_after_3,
          score_after_5:          row.score_after_5,
          opponent_score_after_5: row.opponent_score_after_5,
          score_after_7:          row.score_after_7,
          opponent_score_after_7: row.opponent_score_after_7,
          run_differential:       row.run_differential,
          runs:                   null,
        })
      }

      for (const row of (stData ?? []) as Array<{ team_name: string; game_date: string; runs: number|null }>) {
        if (!grouped[row.team_name]) grouped[row.team_name] = new Map()
        const existing = grouped[row.team_name].get(row.game_date)
        if (existing) {
          existing.runs = row.runs
        } else {
          grouped[row.team_name].set(row.game_date, {
            game_date:              row.game_date,
            score_after_3:          null, opponent_score_after_3: null,
            score_after_5:          null, opponent_score_after_5: null,
            score_after_7:          null, opponent_score_after_7: null,
            run_differential:       null,
            runs:                   row.runs,
          })
        }
      }

      setAllData(grouped)
      setLoading(false)
    }
    load()
  }, [])

  // Load player data when switching to player tab
  useEffect(() => {
    if (viewTab !== 'player' || Object.keys(playerData).length > 0) return
    async function loadPlayers() {
      setPlayerLoading(true)
      const { data } = await supabase
        .from('player_game_stats')
        .select('player_name,team_name,game_date,home_runs,hits,rbi,strikeouts,walks')
        .eq('league', 'MLB')
        .order('game_date', { ascending: true })

      const grouped: Record<string, PlayerEntry> = {}
      for (const row of (data ?? []) as Array<{ player_name: string; team_name: string } & PlayerGameRow>) {
        if (!grouped[row.player_name]) grouped[row.player_name] = { team: row.team_name, games: new Map() }
        grouped[row.player_name].games.set(row.game_date, {
          game_date:  row.game_date,
          home_runs:  row.home_runs,
          hits:       row.hits,
          rbi:        row.rbi,
          strikeouts: row.strikeouts,
          walks:      row.walks,
        })
      }
      setPlayerData(grouped)
      setPlayerLoading(false)
    }
    loadPlayers()
  }, [viewTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayTeams = useMemo(() => {
    const teams = teamFilter ? [teamFilter] : MLB_TEAMS
    return teams.filter(t => allData[t] !== undefined || !loading)
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

  const selectStyle: React.CSSProperties = {
    height: 36, background: '#0a0a0f',
    border: `1px solid ${BORDER}`, borderRadius: 6, outline: 'none',
    padding: '0 10px', color: TEXT, fontSize: 11, fontFamily: MONO,
    cursor: 'pointer', appearance: 'none' as const,
  }

  const tabPill = (active: boolean): React.CSSProperties => ({
    background:    active ? ACCENT : 'transparent',
    color:         active ? '#000' : TEXT,
    border:        active ? 'none' : `1px solid ${BORDER}`,
    borderRadius:  6, padding: '5px 16px',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer',
    fontFamily: MONO, transition: 'all 0.15s',
    boxShadow: active ? `0 0 12px ${ACCENT}55` : 'none',
  })

  void memberTier

  return (
    <div style={{
      paddingLeft: 64, minHeight: '100vh',
      background: `radial-gradient(ellipse at 50% -10%, rgba(57,255,154,0.07) 0%, transparent 55%), #08080d`,
    }}>
      <style>{`
        @keyframes propsfadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {favError && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#0f0f14', border: `1px solid #ef444444`,
          borderRadius: 8, padding: '12px 18px', maxWidth: 360,
          fontFamily: MONO, fontSize: 11, color: '#ef4444',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          animation: 'propsfadein 0.2s ease',
        }}>
          {favError}
        </div>
      )}

      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 30,
        background: 'rgba(8,8,13,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        {/* League tabs */}
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
                  style={{ ...tabPill(on), cursor: tab.active ? 'pointer' : 'default', opacity: tab.active ? 1 : 0.5 }}
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

        {/* View tabs */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 4, height: 52,
          borderBottom: '1px solid #12121a',
        }}>
          <button onClick={() => setViewTab('team')}   style={tabPill(viewTab === 'team')}>   Alt Lines    </button>
          <button onClick={() => setViewTab('player')} style={tabPill(viewTab === 'player')}> Player Props </button>
        </div>

        {/* Filters row */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 10, height: 54, flexWrap: 'wrap',
        }}>
          {viewTab === 'team' ? (
            <>
              <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TEAM</label>
              <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
                style={{ ...selectStyle, width: 210, color: teamFilter ? TEXT : MUTED }}>
                <option value="">All Teams</option>
                {MLB_TEAMS.map(t => <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>)}
              </select>
              <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: 6 }}>STAT</label>
              {FILTER_PILLS.map(pill => {
                const on = altFilter === pill.key
                return (
                  <button key={pill.key} onClick={() => setAltFilter(pill.key)} style={{
                    background:    on ? ACCENT : 'transparent',
                    color:         on ? '#000' : '#ffffff',
                    border:        on ? 'none' : `1px solid ${BORDER}`,
                    borderRadius:  6, padding: '4px 10px',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase', cursor: 'pointer',
                    fontFamily: MONO, transition: 'all 0.15s',
                    boxShadow: on ? `0 0 10px ${ACCENT}44` : 'none',
                    whiteSpace: 'nowrap',
                  }}>
                    {pill.label}
                  </button>
                )
              })}
            </>
          ) : (
            <>
              <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>PLAYER</label>
              <input type="text" placeholder="Search player…" value={playerSearch} onChange={e => setPlayerSearch(e.target.value)}
                style={{ ...selectStyle, width: 200, padding: '0 10px' }} />
              <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: 8 }}>TEAM</label>
              <select value={playerTeamFilter} onChange={e => setPlayerTeamFilter(e.target.value)}
                style={{ ...selectStyle, width: 210, color: playerTeamFilter ? TEXT : MUTED }}>
                <option value="">All Teams</option>
                {MLB_TEAMS.map(t => <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>)}
              </select>
            </>
          )}
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <PropsLegend isTeam={viewTab === 'team'} />
          </div>
        </div>
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{ fontSize: 10, color: MUTED, letterSpacing: '0.26em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: MONO }}>
          MLB · {viewTab === 'team' ? 'Alt Lines' : 'Player Props'}
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, fontFamily: OSWALD }}>
          PROPS
        </h1>
        {!isPro && (
          <p style={{ fontSize: 10, color: MUTED, fontFamily: MONO, margin: '8px 0 0', letterSpacing: '0.04em' }}>
            Free members see last 3 games per row.
          </p>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 8px 80px' }}>

        {/* Alt Lines */}
        {viewTab === 'team' && (
          <>
            {loading && (
              <div style={{ padding: '80px 24px', textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Loading stats…
              </div>
            )}
            {!loading && displayTeams.length === 0 && (
              <div style={{ padding: '80px 24px', textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                No data available yet — check back after games are processed
              </div>
            )}
            {!loading && displayTeams.map(teamName => {
              const teamMap = allData[teamName]
              const games: AltLineGameRow[] = teamMap
                ? Array.from(teamMap.values()).sort((a, b) => a.game_date.localeCompare(b.game_date))
                : []
              return (
                <TeamSection
                  key={teamName}
                  teamName={teamName}
                  games={games}
                  isPro={isPro}
                  altFilter={altFilter}
                  starredProps={starredProps}
                  onStarClick={handlePropStarClick}
                />
              )
            })}
          </>
        )}

        {/* Player Props */}
        {viewTab === 'player' && (
          <>
            {playerLoading && (
              <div style={{ padding: '80px 24px', textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Loading player stats…
              </div>
            )}
            {!playerLoading && displayPlayers.length === 0 && (
              <div style={{ padding: '80px 24px', textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {Object.keys(playerData).length === 0
                  ? 'No player stats available yet — check back after games are processed'
                  : 'No players match your search'}
              </div>
            )}
            {!playerLoading && displayPlayers.map(([playerName, entry]) => {
              const games = Array.from(entry.games.values()).sort((a, b) => a.game_date.localeCompare(b.game_date))
              return (
                <PlayerSection
                  key={playerName}
                  playerName={playerName}
                  teamName={entry.team}
                  games={games}
                  isPro={isPro}
                />
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
