'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { TEAM_COLORS } from '@/lib/teamColors'
import { TEAM_ROUTES } from '@/lib/teamRoutes'

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT      = '#39ff9a'
const MONO        = 'var(--font-jetbrains), "JetBrains Mono", monospace'
const OSWALD      = 'var(--font-oswald), "Oswald", sans-serif'
const BORDER      = '#1a1a24'
const MUTED       = '#52525b'
const TEXT        = '#f4f4f5'
const FREE_CELLS  = 3

const STAT_OVER  = '#A855F7'
const STAT_UNDER = '#7DD3FC'
const STAT_PUSH  = '#FACC15'

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

// ─── Stat configs ─────────────────────────────────────────────────────────────
type StatKey = 'home_runs' | 'hits' | 'runs' | 'strikeouts' | 'walks'

const STAT_CONFIGS: { key: StatKey; label: string; defaultLine: number }[] = [
  { key: 'home_runs',  label: 'HR',          defaultLine: 1.5 },
  { key: 'hits',       label: 'HITS',        defaultLine: 8.5 },
  { key: 'runs',       label: 'RUNS',        defaultLine: 4.5 },
  { key: 'strikeouts', label: 'STRIKEOUTS',  defaultLine: 7.5 },
  { key: 'walks',      label: 'WALKS',       defaultLine: 3.5 },
]

// ─── Data types ───────────────────────────────────────────────────────────────
type GameRow = {
  game_date:  string
  home_runs:  number | null
  hits:       number | null
  runs:       number | null
  strikeouts: number | null
  walks:      number | null
}

type TeamGameMap = Map<string, GameRow>  // date → row

// ─── Cell component ───────────────────────────────────────────────────────────
function PropCell({ actual, line, label, date, isLocked }: {
  actual:   number | null
  line:     number
  label:    string
  date:     string
  isLocked: boolean
}) {
  if (actual === null) return null
  const result = actual > line ? 'over' : actual < line ? 'under' : 'push'
  const s = {
    over:  { bg: STAT_OVER,  glow: `0 0 10px ${STAT_OVER}77`,  letter: 'O' },
    under: { bg: STAT_UNDER, glow: `0 0 10px ${STAT_UNDER}66`, letter: 'U' },
    push:  { bg: STAT_PUSH,  glow: 'none',                      letter: 'P' },
  }[result]

  return (
    <div
      style={{
        width: 32, height: 36, borderRadius: 4, background: s.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 900, color: '#000', flexShrink: 0,
        boxShadow: s.glow,
        filter:  isLocked ? 'blur(3px)' : 'none',
        opacity: isLocked ? 0.35 : 1,
        cursor:  isLocked ? 'default' : 'default',
        userSelect: 'none',
      }}
      title={isLocked ? undefined : `${date} · ${actual} ${label.toLowerCase()} · Line: ${line} · ${result.toUpperCase()}`}
    >
      {s.letter}
    </div>
  )
}

// ─── Stat row for one team ─────────────────────────────────────────────────────
function PropRow({ statKey, label, line, games, isPro, onEditLine }: {
  statKey:     StatKey
  label:       string
  line:        number
  games:       GameRow[]  // ordered asc
  isPro:       boolean
  onEditLine:  (newLine: number) => void
}) {
  const [editing,   setEditing]   = useState(false)
  const [editValue, setEditValue] = useState(String(line))

  // Compute over/under record
  const record = useMemo(() => {
    let o = 0, u = 0
    for (const g of games) {
      const v = g[statKey]
      if (v === null) continue
      if (v > line) o++
      else if (v < line) u++
    }
    return { o, u }
  }, [games, statKey, line])

  const lockBefore = isPro ? 0 : Math.max(0, games.length - FREE_CELLS)

  function commit() {
    const n = parseFloat(editValue)
    if (!isNaN(n) && n >= 0) onEditLine(n)
    setEditing(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, minHeight: 38 }}>
      {/* Label column */}
      <div style={{
        width: 180, minWidth: 180, flexShrink: 0,
        display: 'flex', alignItems: 'center', paddingLeft: 16, gap: 0,
      }}>
        <div style={{ width: 2, height: 12, background: STAT_OVER, borderRadius: 2, marginRight: 8, flexShrink: 0 }} />

        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, color: TEXT, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>
              {label}
            </span>
            <input
              autoFocus
              type="number"
              step="0.5"
              min="0"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
              style={{
                width: 50, background: '#1a1a24', border: `1px solid ${STAT_OVER}66`,
                borderRadius: 3, color: TEXT, fontSize: 11,
                padding: '2px 5px', outline: 'none', fontFamily: MONO,
              }}
            />
          </div>
        ) : (
          <>
            <span style={{ fontSize: 10, color: TEXT, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {label} ({line})
            </span>
            <span style={{ fontSize: 9, color: STAT_OVER, fontWeight: 700, marginLeft: 4, flexShrink: 0 }}>
              &nbsp;{record.o}-{record.u}
            </span>
            <button
              onClick={() => { setEditing(true); setEditValue(String(line)) }}
              title="Edit line"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 5px', color: '#3a3a4a', fontSize: 11,
                lineHeight: 1, marginLeft: 2, flexShrink: 0,
                transition: 'color 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7a7a8a')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
            >
              ✎
            </button>
          </>
        )}
      </div>

      {/* Cells */}
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto', flex: 1, paddingRight: 16, scrollbarWidth: 'none' }}>
        {games.map((g, i) => (
          <PropCell
            key={g.game_date}
            actual={g[statKey]}
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

// ─── Team section ─────────────────────────────────────────────────────────────
function TeamSection({ teamName, games, lines, setLine, isPro, visibleStats, onSave }: {
  teamName:    string
  games:       GameRow[]
  lines:       Record<StatKey, number>
  setLine:     (key: StatKey, v: number) => void
  isPro:       boolean
  visibleStats: StatKey[] | 'all'
  onSave:      () => void
}) {
  const glowRef = useRef<HTMLDivElement>(null)
  const colors  = TEAM_COLORS[teamName]
  const href    = TEAM_ROUTES[teamName]
  const stats   = visibleStats === 'all' ? STAT_CONFIGS : STAT_CONFIGS.filter(s => (visibleStats as StatKey[]).includes(s.key))

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
      {/* Team header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: 2,
            background: colors?.primary ?? ACCENT, flexShrink: 0,
          }} />
          {href ? (
            <Link href={href} style={{ textDecoration: 'none' }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: OSWALD,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
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
        {isPro && (
          <button
            onClick={onSave}
            style={{
              background: 'transparent', border: `1px solid ${BORDER}`,
              borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
              fontSize: 8, fontWeight: 700, color: MUTED, fontFamily: MONO,
              letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = ACCENT; (e.currentTarget as HTMLElement).style.color = ACCENT }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER;  (e.currentTarget as HTMLElement).style.color = MUTED }}
          >
            SAVE AS CUSTOM CHART →
          </button>
        )}
      </div>

      {/* Stat rows */}
      <div style={{ padding: '4px 0 8px' }}>
        {stats.map((cfg, i) => (
          <div key={cfg.key} style={{ background: i % 2 === 0 ? '#0a0a0f' : '#0d0d14' }}>
            <PropRow
              statKey={cfg.key}
              label={cfg.label}
              line={lines[cfg.key]}
              games={games}
              isPro={isPro}
              onEditLine={v => setLine(cfg.key, v)}
            />
          </div>
        ))}
      </div>

      {/* Free upgrade nudge */}
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
  const { isPro, memberTier } = useAuth()

  const [loading,     setLoading]     = useState(true)
  const [allData,     setAllData]     = useState<Record<string, TeamGameMap>>({})
  const [teamFilter,  setTeamFilter]  = useState<string>('')
  const [statFilter,  setStatFilter]  = useState<StatKey | 'all'>('all')
  const [toast,       setToast]       = useState<string | null>(null)

  // Global stat lines (apply to all teams)
  const [lines, setLines] = useState<Record<StatKey, number>>({
    home_runs:  1.5,
    hits:       8.5,
    runs:       4.5,
    strikeouts: 7.5,
    walks:      3.5,
  })

  function setLine(key: StatKey, v: number) {
    setLines(prev => ({ ...prev, [key]: v }))
  }

  // Fetch all team_game_stats for the season
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('team_game_stats')
        .select('team_name, game_date, home_runs, hits, runs, strikeouts, walks')
        .eq('league', 'MLB')
        .order('game_date', { ascending: true })

      const grouped: Record<string, TeamGameMap> = {}
      for (const row of (data ?? []) as Array<{ team_name: string } & GameRow>) {
        const name = row.team_name
        if (!grouped[name]) grouped[name] = new Map()
        grouped[name].set(row.game_date, {
          game_date:  row.game_date,
          home_runs:  row.home_runs,
          hits:       row.hits,
          runs:       row.runs,
          strikeouts: row.strikeouts,
          walks:      row.walks,
        })
      }
      setAllData(grouped)
      setLoading(false)
    }
    load()
  }, [])

  // Teams to display
  const displayTeams = useMemo(() => {
    const teams = teamFilter ? [teamFilter] : MLB_TEAMS
    return teams.filter(t => allData[t] !== undefined || !loading)
  }, [teamFilter, allData, loading])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const selectStyle: React.CSSProperties = {
    height: 36, background: '#0a0a0f',
    border: `1px solid ${BORDER}`, borderRadius: 6, outline: 'none',
    padding: '0 10px', color: TEXT, fontSize: 11, fontFamily: MONO,
    cursor: 'pointer', appearance: 'none' as const,
  }

  return (
    <div style={{
      paddingLeft: 64, minHeight: '100vh',
      background: `radial-gradient(ellipse at 50% -10%, rgba(57,255,154,0.07) 0%, transparent 55%), #08080d`,
    }}>
      <style>{`
        @keyframes propsfadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#0f0f14', border: `1px solid ${ACCENT}44`,
          borderRadius: 8, padding: '12px 18px', maxWidth: 360,
          fontFamily: MONO, fontSize: 11, color: TEXT,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          animation: 'propsfadein 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      {/* ── Sticky filter bar ───────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 30,
        background: 'rgba(8,8,13,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 12, height: 54, flexWrap: 'wrap',
        }}>
          {/* Team filter */}
          <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            TEAM
          </label>
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            style={{ ...selectStyle, width: 210, color: teamFilter ? TEXT : MUTED }}
          >
            <option value="">All Teams</option>
            {MLB_TEAMS.map(t => (
              <option key={t} value={t} style={{ background: '#0f0f14', color: TEXT }}>{t}</option>
            ))}
          </select>

          {/* Stat category pills */}
          <label style={{ fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: 8 }}>
            STAT
          </label>
          {([{ key: 'all', label: 'ALL' }, ...STAT_CONFIGS.map(s => ({ key: s.key, label: s.label }))] as { key: StatKey | 'all'; label: string }[]).map(opt => {
            const on = statFilter === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setStatFilter(opt.key)}
                style={{
                  background:    on ? ACCENT : 'transparent',
                  color:         on ? '#000' : '#ffffff',
                  border:        on ? 'none' : `1px solid ${BORDER}`,
                  borderRadius:  6, padding: '4px 12px',
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

          {/* Legend dots */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {[
              { color: STAT_OVER,  label: 'Over'  },
              { color: STAT_UNDER, label: 'Under' },
              { color: STAT_PUSH,  label: 'Push'  },
            ].map(({ color, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
                <span style={{ fontSize: 8, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{ fontSize: 10, color: MUTED, letterSpacing: '0.26em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: MONO }}>
          MLB · Set your line, see the history
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, fontFamily: OSWALD }}>
          PROPS
        </h1>
        {memberTier !== 'none' && (
          <p style={{ fontSize: 10, color: MUTED, fontFamily: MONO, margin: '8px 0 0', letterSpacing: '0.04em' }}>
            Click <span style={{ color: TEXT }}>✎</span> next to any stat to change the line. Purple = over, blue = under, yellow = push.
            {!isPro && ' Free members see last 3 games per row.'}
          </p>
        )}
      </div>

      {/* ── Team sections ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 8px 80px' }}>
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
          const games: GameRow[] = teamMap
            ? Array.from(teamMap.values()).sort((a, b) => a.game_date.localeCompare(b.game_date))
            : []

          const visibleStats: StatKey[] | 'all' = statFilter === 'all'
            ? 'all'
            : [statFilter as StatKey]

          return (
            <TeamSection
              key={teamName}
              teamName={teamName}
              games={games}
              lines={lines}
              setLine={setLine}
              isPro={isPro}
              visibleStats={visibleStats}
              onSave={() => showToast('Custom chart saving coming soon — this will let you name and share this chart.')}
            />
          )
        })}
      </div>
    </div>
  )
}
