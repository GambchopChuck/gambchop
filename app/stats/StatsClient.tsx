'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { TEAM_COLORS } from '@/lib/teamColors'

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT      = '#39ff9a'
const MONO        = 'var(--font-jetbrains), "JetBrains Mono", monospace'
const OSWALD      = 'var(--font-oswald), "Oswald", sans-serif'
const CARD        = '#0f0f14'
const BORDER      = '#1a1a24'
const MUTED       = '#52525b'
const TEXT        = '#f4f4f5'
const FREE_CELLS  = 3

const OVER_COLOR  = '#A855F7'
const UNDER_COLOR = '#7DD3FC'
const PUSH_COLOR  = '#FACC15'

// ─── League tabs ──────────────────────────────────────────────────────────────
const LEAGUE_TABS = [
  { key: 'mlb',  label: 'MLB',  active: true  },
  { key: 'nba',  label: 'NBA',  active: false },
  { key: 'nhl',  label: 'NHL',  active: false },
  { key: 'nfl',  label: 'NFL',  active: false },
  { key: 'wnba', label: 'WNBA', active: false },
] as const

// ─── Team list ────────────────────────────────────────────────────────────────
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
const TEAM_STATS = [
  { key: 'hits',       label: 'HITS',       defaultLine: 8.5, field: 'hits'       },
  { key: 'home_runs',  label: 'HOME RUNS',  defaultLine: 1.5, field: 'home_runs'  },
  { key: 'runs',       label: 'RUNS',       defaultLine: 4.5, field: 'runs'       },
  { key: 'strikeouts', label: 'STRIKEOUTS', defaultLine: 7.5, field: 'strikeouts' },
  { key: 'walks',      label: 'WALKS',      defaultLine: 3.5, field: 'walks'      },
] as const

const PLAYER_STATS = [
  { key: 'hits',       label: 'HITS',       defaultLine: 0.5, field: 'hits',       playerType: 'batter'  },
  { key: 'home_runs',  label: 'HOME RUNS',  defaultLine: 0.5, field: 'home_runs',  playerType: 'batter'  },
  { key: 'rbis',       label: 'RBIs',       defaultLine: 0.5, field: 'rbis',       playerType: 'batter'  },
  { key: 'strikeouts', label: 'STRIKEOUTS', defaultLine: 4.5, field: 'strikeouts', playerType: 'pitcher' },
  { key: 'walks',      label: 'WALKS',      defaultLine: 0.5, field: 'walks',      playerType: 'batter'  },
] as const

type TeamStatKey   = typeof TEAM_STATS[number]['key']
type PlayerStatKey = typeof PLAYER_STATS[number]['key']
type TabType       = 'team' | 'player'

// ─── Types ────────────────────────────────────────────────────────────────────
type ChartRow = {
  game_date: string
  actual:    number
  result:    'over' | 'under' | 'push'
}

type PlayerResult = { player_name: string; team_name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function computeResult(actual: number, line: number): 'over' | 'under' | 'push' {
  if (actual > line) return 'over'
  if (actual < line) return 'under'
  return 'push'
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function computeStreak(rows: ChartRow[]) {
  if (!rows.length) return '—'
  const last = rows[rows.length - 1]
  let count = 1
  for (let i = rows.length - 2; i >= 0; i--) {
    if (rows[i].result === last.result) count++
    else break
  }
  return `${last.result === 'over' ? 'O' : last.result === 'under' ? 'U' : 'P'}${count}`
}

// ─── StatCell ─────────────────────────────────────────────────────────────────
function StatCell({ row, line, statLabel, isLocked }: {
  row:       ChartRow
  line:      number
  statLabel: string
  isLocked:  boolean
}) {
  const [hovered, setHovered] = useState(false)
  const bg     = row.result === 'over' ? OVER_COLOR : row.result === 'under' ? UNDER_COLOR : PUSH_COLOR
  const letter = row.result === 'over' ? 'O'        : row.result === 'under' ? 'U'         : 'P'
  const label  = row.result === 'over' ? 'OVER'     : row.result === 'under' ? 'UNDER'      : 'PUSH'

  return (
    <div
      style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => !isLocked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 32, height: 40, borderRadius: 4, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 900, color: '#000', fontFamily: MONO,
        cursor: isLocked ? 'default' : 'pointer',
        filter:  isLocked ? 'blur(3px)' : 'none',
        opacity: isLocked ? 0.35 : 1,
        transition: 'transform 0.1s',
        transform: hovered ? 'scale(1.12)' : 'scale(1)',
        userSelect: 'none',
      }}>
        {letter}
      </div>

      {hovered && !isLocked && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          background: '#0a0a0f', border: `1px solid ${BORDER}`, borderRadius: 6,
          padding: '8px 12px', zIndex: 200, whiteSpace: 'nowrap',
          fontSize: 10, fontFamily: MONO, color: TEXT,
          boxShadow: '0 4px 16px rgba(0,0,0,0.7)', pointerEvents: 'none',
        }}>
          <div style={{ color: bg, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
          <div style={{ color: MUTED, marginBottom: 1 }}>{fmtDate(row.game_date)}</div>
          <div>{row.actual} {statLabel.toLowerCase()}</div>
          <div style={{ color: MUTED }}>Line: {line}</div>
        </div>
      )}
    </div>
  )
}

// ─── LineInput ────────────────────────────────────────────────────────────────
function LineInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btnStyle: React.CSSProperties = {
    width: 36, height: 36, background: BORDER, border: 'none',
    color: TEXT, fontSize: 20, cursor: 'pointer', fontFamily: MONO,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.1s', flexShrink: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
      <button
        onClick={() => onChange(Math.max(0, Math.round((value - 0.5) * 10) / 10))}
        style={{ ...btnStyle, borderRadius: '4px 0 0 4px' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#2a2a34')}
        onMouseLeave={e => (e.currentTarget.style.background = BORDER)}
      >
        −
      </button>
      <div style={{
        flex: 1, height: 36, background: '#0a0a0f',
        border: `1px solid ${BORDER}`, borderLeft: 'none', borderRight: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 700, color: ACCENT, fontFamily: OSWALD,
        letterSpacing: '0.04em',
      }}>
        {value}
      </div>
      <button
        onClick={() => onChange(Math.round((value + 0.5) * 10) / 10)}
        style={{ ...btnStyle, borderRadius: '0 4px 4px 0' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#2a2a34')}
        onMouseLeave={e => (e.currentTarget.style.background = BORDER)}
      >
        +
      </button>
    </div>
  )
}

// ─── StatPills ────────────────────────────────────────────────────────────────
function StatPills({ options, active, onChange }: {
  options:  readonly { readonly key: string; readonly label: string }[]
  active:   string
  onChange: (k: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {options.map(opt => {
        const on = opt.key === active
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              background:    on ? ACCENT : 'transparent',
              color:         on ? '#000' : '#ffffff',
              border:        on ? 'none' : `1px solid ${BORDER}`,
              borderRadius:  6, padding: '6px 11px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: MONO, transition: 'all 0.15s',
              boxShadow: on ? `0 0 10px ${ACCENT}44` : 'none',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── StatChart ────────────────────────────────────────────────────────────────
function StatChart({ rows, line, statLabel, title, teamName, isPro, onSave }: {
  rows:      ChartRow[]
  line:      number
  statLabel: string
  title:     string
  teamName?: string
  isPro:     boolean
  onSave:    () => void
}) {
  const lockBefore = isPro ? 0 : Math.max(0, rows.length - FREE_CELLS)

  const overCount  = rows.filter(r => r.result === 'over').length
  const underCount = rows.filter(r => r.result === 'under').length
  const pushCount  = rows.filter(r => r.result === 'push').length
  const total      = rows.length
  const overRate   = total ? Math.round((overCount / total) * 100) : 0
  const streak     = computeStreak(rows)
  const last10     = rows.slice(-10)
  const last10Rate = last10.length ? Math.round((last10.filter(r => r.result === 'over').length / last10.length) * 100) : 0

  const colors = teamName ? TEAM_COLORS[teamName] : null

  return (
    <div style={{
      background: CARD, borderRadius: 8, padding: '20px',
      border: `1px solid ${colors?.primary ?? BORDER}`,
      boxShadow: colors ? `0 0 24px ${colors.primary}33` : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{
            fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: OSWALD,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </span>
          <span style={{
            fontSize: 7, fontWeight: 700, color: '#fff', letterSpacing: '0.14em',
            textTransform: 'uppercase', fontFamily: MONO,
            background: '#1a1a24', padding: '2px 6px', borderRadius: 2, flexShrink: 0,
          }}>
            MLB
          </span>
        </div>
        {teamName && (
          <Link href="/teams" style={{
            fontSize: 10, color: ACCENT, fontFamily: MONO,
            letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
            flexShrink: 0, marginLeft: 12,
          }}>
            FULL CHART →
          </Link>
        )}
      </div>

      {/* Stat label row */}
      <div style={{ marginBottom: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color: ACCENT, fontFamily: MONO,
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          {statLabel} · O/U {line}
        </span>
      </div>

      {/* Scrollable cells */}
      <div style={{ overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
          {rows.map((row, i) => (
            <StatCell
              key={row.game_date + i}
              row={row}
              line={line}
              statLabel={statLabel}
              isLocked={i < lockBefore}
            />
          ))}
        </div>
      </div>

      {/* Upgrade CTA for free users */}
      {!isPro && lockBefore > 0 && (
        <div style={{
          marginTop: 10,
          background: `linear-gradient(135deg, ${ACCENT}0d 0%, #8b5cf60d 100%)`,
          border: `1px solid ${ACCENT}33`, borderRadius: 6,
          padding: '8px 14px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 10, color: TEXT, fontFamily: MONO }}>
            🔒 {lockBefore} older {lockBefore === 1 ? 'game' : 'games'} hidden — upgrade to see full history
          </span>
          <Link href="/pricing" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#000', background: ACCENT,
              padding: '4px 12px', borderRadius: 4, fontFamily: MONO,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Upgrade to Pro →
            </span>
          </Link>
        </div>
      )}

      {/* Summary bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 20,
        padding: '14px 0 10px', borderTop: `1px solid ${BORDER}`, marginTop: 14,
      }}>
        {([
          { label: 'OVER RATE', value: `${overRate}%`,   color: OVER_COLOR  },
          { label: 'STREAK',    value: streak,            color: ACCENT      },
          { label: 'LAST 10',   value: `${last10Rate}%`, color: UNDER_COLOR },
          { label: 'SAMPLE',    value: `${total}G`,      color: MUTED       },
        ] as const).map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: 52 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: OSWALD, letterSpacing: '0.04em', lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 8, color: MUTED, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: MONO, marginTop: 4 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Record + Save button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
        paddingTop: 10, borderTop: `1px solid ${BORDER}`,
        fontSize: 9, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        <span>
          <span style={{ color: OVER_COLOR }}>OVER {overCount}</span>
          {' · '}
          <span style={{ color: UNDER_COLOR }}>UNDER {underCount}</span>
          {' · '}
          <span style={{ color: PUSH_COLOR }}>PUSH {pushCount}</span>
        </span>

        {isPro && (
          <button
            onClick={onSave}
            style={{
              background: 'transparent', border: `1px solid ${BORDER}`,
              borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
              fontSize: 9, fontWeight: 700, color: TEXT, fontFamily: MONO,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
          >
            SAVE AS CUSTOM CHART →
          </button>
        )}
      </div>
    </div>
  )
}

// ─── PlayerSearch ─────────────────────────────────────────────────────────────
function PlayerSearch({ teamFilter, onSelect }: {
  teamFilter: string
  onSelect:   (name: string, team: string) => void
}) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<PlayerResult[]>([])
  const [open,    setOpen]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  async function doSearch(q: string) {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setBusy(true)
    let qb = supabase
      .from('player_game_stats')
      .select('player_name, team_name')
      .ilike('player_name', `%${q}%`)
      .eq('league', 'MLB')
      .limit(24)
      .order('player_name', { ascending: true })

    if (teamFilter) qb = qb.eq('team_name', teamFilter)

    const { data } = await qb
    const seen = new Set<string>()
    const unique = ((data ?? []) as PlayerResult[]).filter(r => {
      const k = `${r.player_name}::${r.team_name}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    setResults(unique.slice(0, 8))
    setOpen(unique.length > 0)
    setBusy(false)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(q), 280)
  }

  function pick(name: string, team: string) {
    setQuery(name)
    setOpen(false)
    onSelect(name, team)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search player name..."
          style={{
            width: '100%', height: 40, background: '#0a0a0f',
            border: `1px solid ${BORDER}`, borderRadius: 4, outline: 'none',
            padding: '0 36px 0 12px', color: TEXT, fontSize: 12,
            fontFamily: MONO, boxSizing: 'border-box',
          }}
        />
        {busy && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <div style={{
              width: 12, height: 12,
              border: `2px solid ${ACCENT}`, borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'statspin 0.6s linear infinite',
            }} />
          </div>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#0f0f14', border: `1px solid ${BORDER}`,
          borderTop: 'none', borderRadius: '0 0 6px 6px',
          overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          {results.map(r => (
            <button
              key={`${r.player_name}::${r.team_name}`}
              onClick={() => pick(r.player_name, r.team_name)}
              style={{
                width: '100%', padding: '9px 12px', background: 'transparent',
                border: 'none', borderBottom: `1px solid ${BORDER}`,
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a24')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 12, color: TEXT, fontFamily: MONO }}>{r.player_name}</span>
              <span style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {r.team_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ControlsCard ─────────────────────────────────────────────────────────────
function ControlsCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: '0 0 300px', minWidth: 260, maxWidth: 320,
      background: CARD, border: `1px solid ${BORDER}`,
      borderRadius: 8, padding: '20px',
    }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, color: ACCENT, fontFamily: MONO,
      letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function ViewChartBtn({ onClick, disabled, loading }: { onClick: () => void; disabled: boolean; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', height: 44,
        background: disabled ? '#1a1a24' : ACCENT,
        color: disabled ? MUTED : '#000',
        border: 'none', borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 900, letterSpacing: '0.12em',
        textTransform: 'uppercase', fontFamily: MONO,
        boxShadow: disabled ? 'none' : `0 0 16px ${ACCENT}44`,
        transition: 'all 0.15s',
      }}
    >
      {loading ? 'LOADING...' : 'VIEW CHART →'}
    </button>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '80px 24px', textAlign: 'center',
      color: MUTED, fontFamily: MONO,
      fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
    }}>
      {msg}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StatsClient() {
  const { isPro }     = useAuth()
  const router        = useRouter()
  const searchParams  = useSearchParams()

  // ── Tab / league
  const [activeTab,    setActiveTab]    = useState<TabType>('team')
  const [activeLeague, setActiveLeague] = useState('mlb')

  // ── Team tab
  const [selectedTeam, setSelectedTeam] = useState('')
  const [teamStat,     setTeamStat]     = useState<TeamStatKey>('hits')
  const [teamLine,     setTeamLine]     = useState(8.5)
  const [teamRows,     setTeamRows]     = useState<ChartRow[] | null>(null)
  const [teamLoading,  setTeamLoading]  = useState(false)
  const [teamError,    setTeamError]    = useState<string | null>(null)

  // ── Player tab
  const [playerName,    setPlayerName]    = useState('')
  const [playerTeam,    setPlayerTeam]    = useState('')
  const [teamFilter,    setTeamFilter]    = useState('')
  const [playerStat,    setPlayerStat]    = useState<PlayerStatKey>('hits')
  const [playerLine,    setPlayerLine]    = useState(0.5)
  const [playerRows,    setPlayerRows]    = useState<ChartRow[] | null>(null)
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerError,   setPlayerError]   = useState<string | null>(null)

  // ── Toast
  const [toast, setToast] = useState<string | null>(null)

  // ── Restore from URL on mount
  useEffect(() => {
    const tab  = searchParams.get('tab') as TabType | null
    const stat = searchParams.get('stat')
    const line = searchParams.get('line')
    const team = searchParams.get('team')

    if (tab === 'player') {
      setActiveTab('player')
      const player = searchParams.get('player')
      if (player) setPlayerName(decodeURIComponent(player))
      if (team)   setPlayerTeam(decodeURIComponent(team))
      if (stat) {
        const opt = PLAYER_STATS.find(s => s.key === stat)
        if (opt) { setPlayerStat(opt.key); setPlayerLine(opt.defaultLine) }
      }
      if (line) { const n = parseFloat(line); if (!isNaN(n)) setPlayerLine(n) }
    } else {
      // default: team tab
      if (tab === 'team' || !tab) {
        if (team) {
          const name = MLB_TEAMS.find(t => slugify(t) === team)
          if (name) setSelectedTeam(name)
        }
        if (stat) {
          const opt = TEAM_STATS.find(s => s.key === stat)
          if (opt) { setTeamStat(opt.key); setTeamLine(opt.defaultLine) }
        }
        if (line) { const n = parseFloat(line); if (!isNaN(n)) setTeamLine(n) }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pushUrl(params: Record<string, string>) {
    const p = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => p.set(k, v))
    router.replace(`/stats?${p.toString()}`, { scroll: false })
  }

  // ── Tab change
  function handleTabChange(tab: TabType) {
    setActiveTab(tab)
    setTeamRows(null)
    setPlayerRows(null)
    pushUrl({ tab })
  }

  // ── Team chart fetch
  async function fetchTeamChart() {
    if (!selectedTeam) return
    const opt = TEAM_STATS.find(s => s.key === teamStat)!
    setTeamLoading(true)
    setTeamError(null)
    setTeamRows(null)

    const { data, error } = await supabase
      .from('team_game_stats')
      .select(`game_date, ${opt.field}`)
      .eq('team_name', selectedTeam)
      .eq('league', 'MLB')
      .not(opt.field, 'is', null)
      .order('game_date', { ascending: true })

    setTeamLoading(false)
    if (error) { setTeamError(error.message); return }

    const typed = (data ?? []) as Array<Record<string, unknown>>
    const rows: ChartRow[] = typed.map(row => {
      const actual = row[opt.field] as number
      return { game_date: row.game_date as string, actual, result: computeResult(actual, teamLine) }
    })
    setTeamRows(rows)
    pushUrl({ tab: 'team', league: activeLeague, team: slugify(selectedTeam), stat: teamStat, line: String(teamLine) })
  }

  // ── Player chart fetch
  async function fetchPlayerChart() {
    if (!playerName) return
    const opt = PLAYER_STATS.find(s => s.key === playerStat)!
    setPlayerLoading(true)
    setPlayerError(null)
    setPlayerRows(null)

    const { data, error } = await supabase
      .from('player_game_stats')
      .select(`game_date, ${opt.field}`)
      .eq('player_name', playerName)
      .eq('player_type', opt.playerType)
      .eq('league', 'MLB')
      .not(opt.field, 'is', null)
      .order('game_date', { ascending: true })

    setPlayerLoading(false)
    if (error) { setPlayerError(error.message); return }

    const typed = (data ?? []) as Array<Record<string, unknown>>
    const rows: ChartRow[] = typed.map(row => {
      const actual = row[opt.field] as number
      return { game_date: row.game_date as string, actual, result: computeResult(actual, playerLine) }
    })
    setPlayerRows(rows)
    pushUrl({
      tab: 'player', league: activeLeague,
      player: encodeURIComponent(playerName),
      team:   encodeURIComponent(playerTeam),
      stat:   playerStat, line: String(playerLine),
    })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // ── Shared select style
  const selectStyle: React.CSSProperties = {
    width: '100%', height: 40, background: '#0a0a0f',
    border: `1px solid ${BORDER}`, borderRadius: 4, outline: 'none',
    padding: '0 10px', color: TEXT, fontSize: 12, fontFamily: MONO,
    cursor: 'pointer', appearance: 'none' as const,
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      paddingLeft: 64, minHeight: '100vh',
      background: `radial-gradient(ellipse at 50% -10%, rgba(57,255,154,0.07) 0%, transparent 55%), #08080d`,
    }}>
      <style>{`
        @keyframes statspin { to { transform: rotate(360deg); } }
        @keyframes statefadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#0f0f14', border: `1px solid ${ACCENT}44`,
          borderRadius: 8, padding: '12px 18px', maxWidth: 360,
          fontFamily: MONO, fontSize: 11, color: TEXT,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          animation: 'statefadein 0.2s ease',
        }}>
          {toast}
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
                    background:    on ? ACCENT : 'transparent',
                    color:         on ? '#000' : '#ffffff',
                    border:        on ? 'none' : '1px solid transparent',
                    borderRadius:  6, padding: '5px 14px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', cursor: tab.active ? 'pointer' : 'default',
                    fontFamily: MONO, transition: 'all 0.15s',
                    boxShadow: on ? `0 0 12px ${ACCENT}55` : 'none',
                    opacity: tab.active ? 1 : 0.5,
                  }}
                >
                  {tab.label}
                </button>
                {!tab.active && (
                  <span style={{
                    fontSize: 7, fontWeight: 700, color: '#fff',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    fontFamily: MONO, background: '#1a1a24',
                    padding: '1px 5px', borderRadius: 2,
                  }}>
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
          {(['team', 'player'] as const).map(tab => {
            const on = activeTab === tab
            const label = tab === 'team' ? 'TEAM STATS' : 'PLAYER STATS'
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                style={{
                  background:    on ? ACCENT : 'transparent',
                  color:         on ? '#000' : '#ffffff',
                  border:        on ? 'none' : '1px solid transparent',
                  borderRadius:  6, padding: '5px 16px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  fontFamily: MONO, transition: 'all 0.15s',
                  boxShadow: on ? `0 0 12px ${ACCENT}55` : 'none',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{
          fontSize: 10, color: MUTED, letterSpacing: '0.26em',
          textTransform: 'uppercase', margin: '0 0 6px', fontFamily: MONO,
        }}>
          Team and player stat lines — set your line, see the history.
        </p>
        <h1 style={{
          fontSize: 34, fontWeight: 700, color: TEXT,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          margin: 0, fontFamily: OSWALD,
        }}>
          STATS
        </h1>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* ──── TEAM STATS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Controls */}
            <ControlsCard>
              <div style={{ marginBottom: 20 }}>
                <FieldLabel>TEAM</FieldLabel>
                <select
                  value={selectedTeam}
                  onChange={e => { setSelectedTeam(e.target.value); setTeamRows(null) }}
                  style={{ ...selectStyle, color: selectedTeam ? TEXT : MUTED }}
                >
                  <option value="">Select a team...</option>
                  {MLB_TEAMS.map(t => (
                    <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <FieldLabel>STAT CATEGORY</FieldLabel>
                <StatPills
                  options={TEAM_STATS}
                  active={teamStat}
                  onChange={k => {
                    const opt = TEAM_STATS.find(s => s.key === k)!
                    setTeamStat(opt.key)
                    setTeamLine(opt.defaultLine)
                    setTeamRows(null)
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <FieldLabel>SET LINE</FieldLabel>
                <LineInput value={teamLine} onChange={v => { setTeamLine(v); setTeamRows(null) }} />
              </div>

              <ViewChartBtn onClick={fetchTeamChart} disabled={!selectedTeam || teamLoading} loading={teamLoading} />
            </ControlsCard>

            {/* Chart area */}
            <div style={{ flex: '1 1 400px', minWidth: 300 }}>
              {teamError && (
                <div style={{ background: '#1a0a0a', border: '1px solid #ef444433', borderRadius: 8, padding: '14px 18px', fontSize: 11, color: '#ef4444', fontFamily: MONO }}>
                  Error: {teamError}
                </div>
              )}
              {!teamError && teamRows === null && !teamLoading && (
                <EmptyState msg="Select a team and stat category to view their chart" />
              )}
              {!teamError && teamLoading && (
                <EmptyState msg="Loading..." />
              )}
              {!teamError && !teamLoading && teamRows?.length === 0 && (
                <EmptyState msg="No data available yet — check back after today's games are processed" />
              )}
              {!teamError && !teamLoading && teamRows && teamRows.length > 0 && (
                <StatChart
                  rows={teamRows}
                  line={teamLine}
                  statLabel={TEAM_STATS.find(s => s.key === teamStat)!.label}
                  title={selectedTeam}
                  teamName={selectedTeam}
                  isPro={isPro}
                  onSave={() => showToast('Custom chart saving coming soon — this will let you name and share this chart.')}
                />
              )}
            </div>
          </div>
        )}

        {/* ──── PLAYER STATS TAB ────────────────────────────────────────────── */}
        {activeTab === 'player' && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Controls */}
            <ControlsCard>
              {/* Team filter */}
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>FILTER BY TEAM (OPTIONAL)</FieldLabel>
                <select
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value)}
                  style={{ ...selectStyle, color: teamFilter ? TEXT : MUTED }}
                >
                  <option value="">All teams</option>
                  {MLB_TEAMS.map(t => (
                    <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Player search */}
              <div style={{ marginBottom: 20 }}>
                <FieldLabel>PLAYER</FieldLabel>
                <PlayerSearch
                  teamFilter={teamFilter}
                  onSelect={(name, team) => {
                    setPlayerName(name)
                    setPlayerTeam(team)
                    setPlayerRows(null)
                  }}
                />
                {playerName && (
                  <div style={{ marginTop: 6, fontSize: 10, color: ACCENT, fontFamily: MONO, letterSpacing: '0.04em' }}>
                    ✓ {playerName}
                    {playerTeam && <span style={{ color: MUTED }}> · {playerTeam}</span>}
                  </div>
                )}
              </div>

              {/* Stat category */}
              <div style={{ marginBottom: 20 }}>
                <FieldLabel>STAT CATEGORY</FieldLabel>
                <StatPills
                  options={PLAYER_STATS}
                  active={playerStat}
                  onChange={k => {
                    const opt = PLAYER_STATS.find(s => s.key === k)!
                    setPlayerStat(opt.key)
                    setPlayerLine(opt.defaultLine)
                    setPlayerRows(null)
                  }}
                />
              </div>

              {/* Line setter */}
              <div style={{ marginBottom: 24 }}>
                <FieldLabel>SET LINE</FieldLabel>
                <LineInput value={playerLine} onChange={v => { setPlayerLine(v); setPlayerRows(null) }} />
              </div>

              <ViewChartBtn onClick={fetchPlayerChart} disabled={!playerName || playerLoading} loading={playerLoading} />
            </ControlsCard>

            {/* Chart area */}
            <div style={{ flex: '1 1 400px', minWidth: 300 }}>
              {playerError && (
                <div style={{ background: '#1a0a0a', border: '1px solid #ef444433', borderRadius: 8, padding: '14px 18px', fontSize: 11, color: '#ef4444', fontFamily: MONO }}>
                  Error: {playerError}
                </div>
              )}
              {!playerError && playerRows === null && !playerLoading && (
                <EmptyState msg="Search for a player to view their stat line chart" />
              )}
              {!playerError && playerLoading && (
                <EmptyState msg="Loading..." />
              )}
              {!playerError && !playerLoading && playerRows?.length === 0 && (
                <EmptyState msg="No data available yet — check back after today's games are processed" />
              )}
              {!playerError && !playerLoading && playerRows && playerRows.length > 0 && (
                <StatChart
                  rows={playerRows}
                  line={playerLine}
                  statLabel={PLAYER_STATS.find(s => s.key === playerStat)!.label}
                  title={playerName}
                  isPro={isPro}
                  onSave={() => showToast('Custom chart saving coming soon — this will let you name and share this chart.')}
                />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
