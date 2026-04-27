'use client'

import type { TeamChartData, GameEntry } from '@/lib/mock-data'

// ─── Record Helpers ───────────────────────────────────────────────────────────

interface WL { w: number; l: number }

const rec = {
  ml:     (g: GameEntry[]): WL => ({ w: g.filter(x => x.moneylineResult === 'win').length,  l: g.filter(x => x.moneylineResult === 'loss').length }),
  spread: (g: GameEntry[]): WL => ({ w: g.filter(x => x.spreadResult    === 'win').length,  l: g.filter(x => x.spreadResult    === 'loss').length }),
  fav:    (g: GameEntry[]): WL => rec.ml(g.filter(x =>  x.isFavorite)),
  dog:    (g: GameEntry[]): WL => rec.ml(g.filter(x => !x.isFavorite)),
  home:   (g: GameEntry[]): WL => rec.ml(g.filter(x =>  x.isHome)),
  away:   (g: GameEntry[]): WL => rec.ml(g.filter(x => !x.isHome)),
  ou:     (g: GameEntry[])      => ({ o: g.filter(x => x.ouResult === 'over').length, u: g.filter(x => x.ouResult === 'under').length }),
}

function wlColor(r: WL) {
  return r.w > r.l ? '#4ade80' : r.w < r.l ? '#f87171' : '#52525b'
}

function RecordBadge({ r }: { r: WL }) {
  return (
    <span style={{ color: wlColor(r), fontSize: 10, fontFamily: 'monospace', letterSpacing: 0, fontWeight: 600 }}>
      &nbsp;({r.w}-{r.l})
    </span>
  )
}

function OUBadge({ o, u }: { o: number; u: number }) {
  const color = o > u ? '#93c5fd' : o < u ? '#f87171' : '#52525b'
  return (
    <span style={{ color, fontSize: 10, fontFamily: 'monospace', letterSpacing: 0, fontWeight: 600 }}>
      &nbsp;({o}-{u})
    </span>
  )
}

// ─── Cells ────────────────────────────────────────────────────────────────────

function MoneylineCell({ r }: { r: GameEntry['moneylineResult'] }) {
  if (!r) return <Blank />
  const s = {
    win:  { bg: '#65a30d', glow: '0 0 12px rgba(101,163,13,0.6)',   label: 'W' },
    loss: { bg: '#dc2626', glow: '0 0 12px rgba(220,38,38,0.6)',    label: 'L' },
    push: { bg: '#3f3f46', glow: 'none',                             label: 'P' },
  }[r]
  return (
    <div className="cell" style={{ background: s.bg, boxShadow: s.glow, color: '#fff', fontWeight: 800 }}>
      {s.label}
    </div>
  )
}

function SpreadCell({ r }: { r: GameEntry['spreadResult'] }) {
  if (!r) return <Blank />
  const s = {
    win:  { bg: '#166534', glow: '0 0 12px rgba(22,101,52,0.7)',    label: 'COV' },
    loss: { bg: '#dc2626', glow: '0 0 12px rgba(220,38,38,0.6)',    label: 'MIS' },
    push: { bg: '#3f3f46', glow: 'none',                             label: 'PSH' },
  }[r]
  return (
    <div className="cell" style={{ background: s.bg, boxShadow: s.glow, color: '#fff', fontWeight: 800, fontSize: 9, letterSpacing: '0.08em' }}>
      {s.label}
    </div>
  )
}

function PillCell({ active, bg, glow }: { active: boolean; bg: string; glow: string }) {
  return (
    <div className="cell" style={{ background: active ? bg : '#18181f', boxShadow: active ? glow : 'none' }} />
  )
}

function OUCell({ r }: { r: GameEntry['ouResult'] }) {
  const isO = r === 'over', isU = r === 'under', isP = r === 'push'
  return (
    <div style={{ display: 'flex', height: 34, margin: '0 3px', borderRadius: 5, overflow: 'hidden', border: '1px solid #1e1e2e' }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
        background: isO ? '#1d4ed8' : isP ? 'rgba(29,78,216,0.25)' : '#0c0c1e',
        color: isO ? '#fff' : '#1e3a6e',
        boxShadow: isO ? 'inset 0 0 10px rgba(29,78,216,0.5)' : 'none',
      }}>O</div>
      <div style={{ width: 1, background: '#1e1e2e' }} />
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
        background: isU ? '#7dd3fc' : isP ? 'rgba(125,211,252,0.15)' : '#0a1020',
        color: isU ? '#0c4a6e' : '#0c2040',
        boxShadow: isU ? 'inset 0 0 8px rgba(125,211,252,0.35)' : 'none',
      }}>U</div>
    </div>
  )
}

function Blank() {
  return <div className="cell" style={{ background: '#131318', opacity: 0.5 }} />
}

// ─── Row Config ───────────────────────────────────────────────────────────────

type RowKey = 'moneyline' | 'spread' | 'favorite' | 'underdog' | 'home' | 'away' | 'ou'

interface RowMeta {
  key: RowKey
  label: string
  accentColor: string
  getRecord: (g: GameEntry[]) => React.ReactNode
}

const ROWS: RowMeta[] = [
  {
    key: 'moneyline', label: 'Moneyline', accentColor: '#65a30d',
    getRecord: g => <RecordBadge r={rec.ml(g)} />,
  },
  {
    key: 'spread', label: 'Spread', accentColor: '#166534',
    getRecord: g => <RecordBadge r={rec.spread(g)} />,
  },
  {
    key: 'favorite', label: 'Favorite', accentColor: '#db2777',
    getRecord: g => <RecordBadge r={rec.fav(g)} />,
  },
  {
    key: 'underdog', label: 'Underdog', accentColor: '#c2410c',
    getRecord: g => <RecordBadge r={rec.dog(g)} />,
  },
  {
    key: 'home', label: 'Home', accentColor: '#b45309',
    getRecord: g => <RecordBadge r={rec.home(g)} />,
  },
  {
    key: 'away', label: 'Away', accentColor: '#475569',
    getRecord: g => <RecordBadge r={rec.away(g)} />,
  },
  {
    key: 'ou', label: 'Over / Under', accentColor: '#1d4ed8',
    getRecord: g => { const { o, u } = rec.ou(g); return <OUBadge o={o} u={u} /> },
  },
]

function GameCell({ rowKey, game }: { rowKey: RowKey; game: GameEntry }) {
  switch (rowKey) {
    case 'moneyline': return <MoneylineCell r={game.moneylineResult} />
    case 'spread':    return <SpreadCell r={game.spreadResult} />
    case 'favorite':  return <PillCell active={game.isFavorite}   bg="#be185d" glow="0 0 10px rgba(190,24,93,0.65)" />
    case 'underdog':  return <PillCell active={!game.isFavorite}  bg="#c2410c" glow="0 0 10px rgba(194,65,12,0.65)" />
    case 'home':      return <PillCell active={game.isHome}       bg="#b45309" glow="0 0 10px rgba(180,83,9,0.65)" />
    case 'away':      return <PillCell active={!game.isHome}      bg="#475569" glow="0 0 10px rgba(71,85,105,0.5)" />
    case 'ou':        return <OUCell r={game.ouResult} />
  }
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND = [
  { bg: '#65a30d', label: 'ML Win'       },
  { bg: '#dc2626', label: 'ML/Spread L'  },
  { bg: '#166534', label: 'Spread Cover' },
  { bg: '#be185d', label: 'Favorite'     },
  { bg: '#c2410c', label: 'Underdog'     },
  { bg: '#b45309', label: 'Home'         },
  { bg: '#475569', label: 'Away'         },
  { bg: '#1d4ed8', label: 'Over'         },
  { bg: '#7dd3fc', label: 'Under'        },
]

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3 border-b border-[#1a1a24]">
      {LEGEND.map(({ bg, label }) => (
        <div key={label} className="flex items-center gap-2">
          <div style={{ width: 10, height: 10, background: bg, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Chart ───────────────────────────────────────────────────────────────

const LABEL_W = 210
const COL_W   = 64

export default function GambchopChart({ data }: { data: TeamChartData[] }) {
  const dates = data[0]?.games.map(g => g.date) ?? []

  return (
    <div style={{ width: '100%', fontFamily: 'var(--font-geist-mono), monospace' }}>
      <Legend />

      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ minWidth: LABEL_W + dates.length * COL_W + 24 }}>

          {/* Date header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #1a1a24', paddingBottom: 10, paddingTop: 14 }}>
            <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: '#0c0c10', paddingLeft: 20, zIndex: 20 }}>
              <span style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Team / Metric</span>
            </div>
            {dates.map(d => (
              <div key={d} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>{d}</span>
              </div>
            ))}
          </div>

          {/* Teams */}
          {data.map((team, ti) => (
            <div key={team.teamName} style={{ borderBottom: ti < data.length - 1 ? '1px solid #16161e' : 'none', marginBottom: 4 }}>

              {/* Team name header */}
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{
                  width: LABEL_W, minWidth: LABEL_W, flexShrink: 0,
                  position: 'sticky', left: 0, zIndex: 20,
                  background: '#0c0c10',
                  display: 'flex', alignItems: 'center',
                  paddingLeft: 0,
                }}>
                  <div style={{ width: 3, alignSelf: 'stretch', background: '#65a30d', marginRight: 16, borderRadius: '0 2px 2px 0', minHeight: 44 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.3 }}>
                      {team.teamName}
                    </div>
                    <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                      2026 Season · {team.games.length} Games
                    </div>
                  </div>
                </div>
                {/* Decorative gradient bar across columns */}
                <div style={{
                  flex: 1, height: 44, alignSelf: 'center',
                  background: 'linear-gradient(to right, rgba(101,163,13,0.06) 0%, transparent 60%)',
                  borderTop: '1px solid #1a1a24', borderBottom: '1px solid #1a1a24',
                  marginTop: 8,
                }} />
              </div>

              {/* 7 metric rows */}
              {ROWS.map((row, ri) => {
                const rowBg = ri % 2 === 0 ? '#0c0c10' : '#0e0e15'
                return (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', background: rowBg }}>

                    {/* Sticky label */}
                    <div style={{
                      width: LABEL_W, minWidth: LABEL_W, flexShrink: 0,
                      position: 'sticky', left: 0, zIndex: 10,
                      background: rowBg,
                      height: 34, display: 'flex', alignItems: 'center',
                      paddingLeft: 19,
                      borderLeft: `3px solid ${rowBg}`,
                    }}>
                      <div style={{ width: 2, height: 12, background: row.accentColor, borderRadius: 2, marginRight: 10, flexShrink: 0, opacity: 0.8 }} />
                      <span style={{ fontSize: 11, color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {row.label}
                      </span>
                      {row.getRecord(team.games)}
                    </div>

                    {/* Game cells */}
                    {team.games.map(game => (
                      <div key={game.date} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, padding: '0 0', background: rowBg }}>
                        <GameCell rowKey={row.key} game={game} />
                      </div>
                    ))}
                  </div>
                )
              })}

              <div style={{ height: 12 }} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .cell {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 34px;
          margin: 0 3px;
          border-radius: 5px;
          font-size: 11px;
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  )
}
