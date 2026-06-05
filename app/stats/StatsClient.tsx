'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { TeamBatRow, TeamPitRow, PlayerBatRow, PlayerPitRow } from './page'
import { TEAM_COLORS } from '@/lib/teamColors'
import { TEAM_ROUTES } from '@/lib/teamRoutes'

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT  = '#39ff9a'
const MONO    = 'var(--font-jetbrains), "JetBrains Mono", monospace'
const OSWALD  = 'var(--font-oswald), "Oswald", sans-serif'
const CARD    = '#0f0f14'
const BORDER  = '#1a1a24'
const MUTED   = '#52525b'
const TEXT    = '#f4f4f5'
const ROW_ALT = '#0d0d14'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type MainTab = 'team' | 'player'
type SubTab  = 'batting' | 'pitching'

// ─── Sort helpers ─────────────────────────────────────────────────────────────
type SortDir = 'asc' | 'desc'

function parseStat(v: string | number): number {
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return isNaN(n) ? -Infinity : n
}

function sortRows<T>(rows: T[], col: string, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const av = parseStat((a as Record<string, unknown>)[col] as string | number)
    const bv = parseStat((b as Record<string, unknown>)[col] as string | number)
    if (av === -Infinity && bv === -Infinity) return 0
    if (av === -Infinity) return 1
    if (bv === -Infinity) return -1
    return dir === 'asc' ? av - bv : bv - av
  })
}

// ─── Column configs ───────────────────────────────────────────────────────────

type ColDef<T> = { key: keyof T & string; label: string; title?: string; defaultDir?: SortDir }

const TEAM_BAT_COLS: ColDef<TeamBatRow>[] = [
  { key: 'gp',  label: 'GP',  title: 'Games Played' },
  { key: 'ab',  label: 'AB',  title: 'At Bats' },
  { key: 'r',   label: 'R',   title: 'Runs' },
  { key: 'h',   label: 'H',   title: 'Hits' },
  { key: 'd',   label: '2B',  title: 'Doubles' },
  { key: 't',   label: '3B',  title: 'Triples' },
  { key: 'hr',  label: 'HR',  title: 'Home Runs' },
  { key: 'rbi', label: 'RBI', title: 'Runs Batted In' },
  { key: 'tb',  label: 'TB',  title: 'Total Bases' },
  { key: 'bb',  label: 'BB',  title: 'Walks' },
  { key: 'so',  label: 'SO',  title: 'Strikeouts', defaultDir: 'asc' },
  { key: 'sb',  label: 'SB',  title: 'Stolen Bases' },
  { key: 'avg', label: 'AVG', title: 'Batting Average' },
  { key: 'obp', label: 'OBP', title: 'On Base Percentage' },
  { key: 'slg', label: 'SLG', title: 'Slugging Percentage' },
  { key: 'ops', label: 'OPS', title: 'OBP + SLG' },
]

const TEAM_PIT_COLS: ColDef<TeamPitRow>[] = [
  { key: 'gp',   label: 'GP',   title: 'Games Played' },
  { key: 'w',    label: 'W',    title: 'Wins' },
  { key: 'l',    label: 'L',    title: 'Losses', defaultDir: 'asc' },
  { key: 'era',  label: 'ERA',  title: 'Earned Run Average', defaultDir: 'asc' },
  { key: 'sv',   label: 'SV',   title: 'Saves' },
  { key: 'cg',   label: 'CG',   title: 'Complete Games' },
  { key: 'sho',  label: 'SHO',  title: 'Shutouts' },
  { key: 'qs',   label: 'QS',   title: 'Quality Starts' },
  { key: 'ip',   label: 'IP',   title: 'Innings Pitched' },
  { key: 'pc',   label: 'PC',   title: 'Pitch Count' },
  { key: 'h',    label: 'H',    title: 'Hits Allowed', defaultDir: 'asc' },
  { key: 'er',   label: 'ER',   title: 'Earned Runs', defaultDir: 'asc' },
  { key: 'hr',   label: 'HR',   title: 'Home Runs Allowed', defaultDir: 'asc' },
  { key: 'bb',   label: 'BB',   title: 'Walks Allowed', defaultDir: 'asc' },
  { key: 'so',   label: 'SO',   title: 'Strikeouts' },
  { key: 'oba',  label: 'OBA',  title: 'Opponent Batting Average', defaultDir: 'asc' },
  { key: 'whip', label: 'WHIP', title: 'Walks + Hits Per Inning Pitched', defaultDir: 'asc' },
]

// ─── Glossary ─────────────────────────────────────────────────────────────────
const GLOSSARY_BAT = [
  { abbr: 'GP',  def: 'Games Played' },
  { abbr: 'AB',  def: 'At Bats' },
  { abbr: 'R',   def: 'Runs Scored' },
  { abbr: 'H',   def: 'Hits' },
  { abbr: '2B',  def: 'Doubles' },
  { abbr: '3B',  def: 'Triples' },
  { abbr: 'HR',  def: 'Home Runs' },
  { abbr: 'RBI', def: 'Runs Batted In' },
  { abbr: 'TB',  def: 'Total Bases' },
  { abbr: 'BB',  def: 'Walks (Base on Balls)' },
  { abbr: 'SO',  def: 'Strikeouts' },
  { abbr: 'SB',  def: 'Stolen Bases' },
  { abbr: 'AVG', def: 'Batting Average — Hits ÷ At Bats' },
  { abbr: 'OBP', def: 'On Base Percentage — how often a batter reaches base' },
  { abbr: 'SLG', def: 'Slugging Percentage — Total Bases ÷ At Bats' },
  { abbr: 'OPS', def: 'On Base Plus Slugging — OBP + SLG' },
]

const GLOSSARY_PIT = [
  { abbr: 'PC',   def: 'Pitch Count — total pitches thrown' },
  { abbr: 'ERA',  def: 'Earned Run Average — (Earned Runs × 9) ÷ Innings Pitched' },
  { abbr: 'SV',   def: 'Saves' },
  { abbr: 'CG',   def: 'Complete Games — pitcher finishes the entire game' },
  { abbr: 'SHO',  def: 'Shutouts — complete game with no runs allowed' },
  { abbr: 'QS',   def: 'Quality Starts — at least 6 innings, 3 or fewer earned runs' },
  { abbr: 'IP',   def: 'Innings Pitched' },
  { abbr: 'ER',   def: 'Earned Runs — runs scored without the aid of an error' },
  { abbr: 'OBA',  def: 'Opponent Batting Average — Hits Allowed ÷ Batters Faced' },
  { abbr: 'WHIP', def: 'Walks + Hits Per Inning Pitched — (BB + H) ÷ IP' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabPill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background:    active ? ACCENT : 'transparent',
        color:         active ? '#000' : '#ffffff',
        border:        active ? 'none' : `1px solid ${BORDER}`,
        borderRadius:  6, padding: '5px 16px',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', cursor: 'pointer',
        fontFamily: MONO, transition: 'all 0.15s',
        boxShadow: active ? `0 0 12px ${ACCENT}55` : 'none',
      }}
    >
      {children}
    </button>
  )
}

function SortArrow({ dir }: { dir: SortDir }) {
  return <span style={{ marginLeft: 4, fontSize: 9 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

function TeamColorDot({ team }: { team: string }) {
  const color = TEAM_COLORS[team]?.primary ?? BORDER
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: 2,
      background: color, marginRight: 8, flexShrink: 0, verticalAlign: 'middle',
    }} />
  )
}

// ─── Generic sortable table ───────────────────────────────────────────────────

function StatsTable<T>({
  rows,
  cols,
  getLabel,
  getLink,
  sortCol,
  sortDir,
  onSort,
  showTeam = false,
}: {
  rows:      T[]
  cols:      ColDef<T>[]
  getLabel:  (row: T) => string
  getLink:   (row: T) => string | null
  sortCol:   string
  sortDir:   SortDir
  onSort:    (col: string) => void
  showTeam?: boolean
}) {
  const sorted = useMemo(() => sortRows(rows, sortCol, sortDir), [rows, sortCol, sortDir])

  const thStyle: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'right', fontSize: 9, fontWeight: 700,
    color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase',
    fontFamily: MONO, cursor: 'pointer', whiteSpace: 'nowrap',
    userSelect: 'none', transition: 'color 0.1s',
    position: 'sticky', top: 0, background: '#0a0a0f', zIndex: 2,
    borderBottom: `1px solid ${BORDER}`,
  }
  const tdStyle: React.CSSProperties = {
    padding: '7px 10px', textAlign: 'right', fontSize: 12,
    fontFamily: MONO, color: TEXT, whiteSpace: 'nowrap',
    borderBottom: `1px solid ${BORDER}`,
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${BORDER}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
        <thead>
          <tr>
            {/* Sticky name column header */}
            <th
              style={{
                ...thStyle, textAlign: 'left',
                position: 'sticky', left: 0, zIndex: 3,
                minWidth: showTeam ? 220 : 200,
                paddingLeft: 16,
              }}
            >
              {showTeam ? 'PLAYER' : 'TEAM'}
            </th>
            {showTeam && (
              <th style={{ ...thStyle, textAlign: 'left', minWidth: 140 }}>TEAM</th>
            )}
            {cols.map(col => (
              <th
                key={String(col.key)}
                title={col.title}
                onClick={() => onSort(String(col.key))}
                style={{
                  ...thStyle,
                  color: sortCol === col.key ? ACCENT : MUTED,
                }}
                onMouseEnter={e => { if (sortCol !== col.key) (e.currentTarget as HTMLElement).style.color = TEXT }}
                onMouseLeave={e => { if (sortCol !== col.key) (e.currentTarget as HTMLElement).style.color = MUTED }}
              >
                {col.label}
                {sortCol === col.key && <SortArrow dir={sortDir} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const label = getLabel(row)
            const href  = getLink(row)
            const isPlayer = 'player' in (row as object)
            const teamName = isPlayer ? (row as { team: string }).team : label
            return (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? CARD : ROW_ALT }}
                onMouseEnter={e => (e.currentTarget.style.background = '#12121c')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? CARD : ROW_ALT)}
              >
                {/* Sticky name cell */}
                <td style={{
                  ...tdStyle, textAlign: 'left', paddingLeft: 16,
                  position: 'sticky', left: 0, zIndex: 1,
                  background: i % 2 === 0 ? CARD : ROW_ALT,
                  fontWeight: 600, maxWidth: showTeam ? 220 : 200,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    {!isPlayer && <TeamColorDot team={label} />}
                    {href ? (
                      <Link href={href} style={{ color: TEXT, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = ACCENT)}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = TEXT)}
                      >
                        {label}
                      </Link>
                    ) : (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    )}
                  </span>
                </td>
                {/* Team column for player rows */}
                {showTeam && (
                  <td style={{ ...tdStyle, textAlign: 'left', fontSize: 11, color: MUTED }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TeamColorDot team={teamName} />
                      {teamName}
                    </span>
                  </td>
                )}
                {cols.map(col => (
                  <td key={String(col.key)} style={{
                    ...tdStyle,
                    color: sortCol === col.key ? ACCENT : TEXT,
                    fontWeight: sortCol === col.key ? 700 : 400,
                  }}>
                    {String(row[col.key])}
                  </td>
                ))}
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={cols.length + (showTeam ? 2 : 1)} style={{ ...tdStyle, textAlign: 'center', color: MUTED, padding: '40px 0' }}>
                No data available — stats update every 3 hours during the season.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Glossary accordion ───────────────────────────────────────────────────────

function Glossary() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 48, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 20px',
          background: CARD, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: MONO, fontSize: 11, fontWeight: 700,
          color: TEXT, letterSpacing: '0.12em', textTransform: 'uppercase',
        }}
      >
        <span>📖 Stat Glossary</span>
        <span style={{ color: MUTED, fontSize: 14 }}>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div style={{ background: '#0a0a0f', padding: '20px 24px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0 40px' }}>
            <div>
              <div style={{ fontSize: 9, color: ACCENT, fontFamily: MONO, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                BATTING
              </div>
              {GLOSSARY_BAT.map(({ abbr, def }) => (
                <div key={abbr} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, fontFamily: MONO, minWidth: 40 }}>{abbr}</span>
                  <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{def}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 9, color: ACCENT, fontFamily: MONO, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                PITCHING
              </div>
              {GLOSSARY_PIT.map(({ abbr, def }) => (
                <div key={abbr} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, fontFamily: MONO, minWidth: 44 }}>{abbr}</span>
                  <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{def}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  teamBat:   TeamBatRow[]
  teamPit:   TeamPitRow[]
  playerBat: PlayerBatRow[]
  playerPit: PlayerPitRow[]
  season:    number
}

export default function StatsClient({ teamBat, teamPit, playerBat, playerPit, season }: Props) {
  const [mainTab, setMainTab]     = useState<MainTab>('team')
  const [subTab,  setSubTab]      = useState<SubTab>('batting')

  // Sort state — separate for each table (stored as plain strings)
  const [tbSortCol, setTbSortCol] = useState('avg')
  const [tbSortDir, setTbSortDir] = useState<SortDir>('desc')
  const [tpSortCol, setTpSortCol] = useState('era')
  const [tpSortDir, setTpSortDir] = useState<SortDir>('asc')
  const [pbSortCol, setPbSortCol] = useState('avg')
  const [pbSortDir, setPbSortDir] = useState<SortDir>('desc')
  const [ppSortCol, setPpSortCol] = useState('era')
  const [ppSortDir, setPpSortDir] = useState<SortDir>('asc')

  function makeSort<T>(
    col: string, setCol: (c: string) => void,
    dir: SortDir, setDir: (d: SortDir) => void,
    colDefs: ColDef<T>[],
  ) {
    return (newCol: string) => {
      if (newCol === col) {
        setDir(dir === 'asc' ? 'desc' : 'asc')
      } else {
        setCol(newCol)
        const def = colDefs.find(c => c.key === newCol)
        setDir(def?.defaultDir ?? 'desc')
      }
    }
  }

  const handleTbSort = makeSort(tbSortCol, setTbSortCol, tbSortDir, setTbSortDir, TEAM_BAT_COLS)
  const handleTpSort = makeSort(tpSortCol, setTpSortCol, tpSortDir, setTpSortDir, TEAM_PIT_COLS)
  const handlePbSort = makeSort(pbSortCol, setPbSortCol, pbSortDir, setPbSortDir, TEAM_BAT_COLS as ColDef<PlayerBatRow>[])
  const handlePpSort = makeSort(ppSortCol, setPpSortCol, ppSortDir, setPpSortDir, TEAM_PIT_COLS as ColDef<PlayerPitRow>[])

  const playerBatCols = TEAM_BAT_COLS as unknown as ColDef<PlayerBatRow>[]
  const playerPitCols = TEAM_PIT_COLS as unknown as ColDef<PlayerPitRow>[]

  return (
    <div style={{
      paddingLeft: 64, minHeight: '100vh',
      background: `radial-gradient(ellipse at 50% -10%, rgba(57,255,154,0.06) 0%, transparent 55%), #08080d`,
    }}>
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 30,
        background: 'rgba(8,8,13,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        {/* Main tabs */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 4, height: 52,
          borderBottom: '1px solid #12121a',
        }}>
          <TabPill active={mainTab === 'team'}   onClick={() => setMainTab('team')}>   Team Stats   </TabPill>
          <TabPill active={mainTab === 'player'} onClick={() => setMainTab('player')}> Player Stats </TabPill>
        </div>

        {/* Sub-category pills */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 4, height: 44,
        }}>
          <TabPill active={subTab === 'batting'}  onClick={() => setSubTab('batting')}>  Batting  </TabPill>
          <TabPill active={subTab === 'pitching'} onClick={() => setSubTab('pitching')}> Pitching </TabPill>
          <span style={{ marginLeft: 'auto', fontSize: 9, color: MUTED, fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {season} Season · Click column to sort
          </span>
        </div>
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{
          fontSize: 10, color: MUTED, letterSpacing: '0.26em',
          textTransform: 'uppercase', margin: '0 0 6px', fontFamily: MONO,
        }}>
          {season} MLB {mainTab === 'team' ? 'Team' : 'Player'} Statistics
        </p>
        <h1 style={{
          fontSize: 34, fontWeight: 700, color: TEXT,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          margin: 0, fontFamily: OSWALD,
        }}>
          STATS
        </h1>
      </div>

      {/* ── Tables ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px 80px' }}>

        {mainTab === 'team' && subTab === 'batting' && (
          <StatsTable
            rows={teamBat}
            cols={TEAM_BAT_COLS}
            getLabel={r => (r as TeamBatRow).team}
            getLink={r  => TEAM_ROUTES[(r as TeamBatRow).team] ?? null}
            sortCol={tbSortCol}
            sortDir={tbSortDir}
            onSort={handleTbSort}
          />
        )}

        {mainTab === 'team' && subTab === 'pitching' && (
          <StatsTable
            rows={teamPit}
            cols={TEAM_PIT_COLS}
            getLabel={r => (r as TeamPitRow).team}
            getLink={r  => TEAM_ROUTES[(r as TeamPitRow).team] ?? null}
            sortCol={tpSortCol}
            sortDir={tpSortDir}
            onSort={handleTpSort}
          />
        )}

        {mainTab === 'player' && subTab === 'batting' && (
          <StatsTable
            rows={playerBat}
            cols={playerBatCols}
            getLabel={r => (r as PlayerBatRow).player}
            getLink={() => null}
            sortCol={pbSortCol}
            sortDir={pbSortDir}
            onSort={handlePbSort}
            showTeam
          />
        )}

        {mainTab === 'player' && subTab === 'pitching' && (
          <StatsTable
            rows={playerPit}
            cols={playerPitCols}
            getLabel={r => (r as PlayerPitRow).player}
            getLink={() => null}
            sortCol={ppSortCol}
            sortDir={ppSortDir}
            onSort={handlePpSort}
            showTeam
          />
        )}

        <Glossary />
      </div>
    </div>
  )
}
