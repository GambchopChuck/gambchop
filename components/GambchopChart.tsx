'use client'

import type { TeamChartData, GameEntry } from '@/lib/mock-data'

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

// ─── Record Helpers ───────────────────────────────────────────────────────────

interface WL { w: number; l: number }

const rec = {
  ml:       (g: GameEntry[]): WL => ({ w: g.filter(x => x.moneylineResult === 'win').length,   l: g.filter(x => x.moneylineResult === 'loss').length }),
  spread:   (g: GameEntry[]): WL => ({ w: g.filter(x => x.spreadResult === 'win').length,      l: g.filter(x => x.spreadResult === 'loss').length }),
  mlFav:    (g: GameEntry[]): WL => rec.ml(g.filter(x =>  x.isFavorite)),
  mlDog:    (g: GameEntry[]): WL => rec.ml(g.filter(x => !x.isFavorite)),
  spFav:    (g: GameEntry[]): WL => rec.spread(g.filter(x =>  x.isSpreadFavorite)),
  spDog:    (g: GameEntry[]): WL => rec.spread(g.filter(x => !x.isSpreadFavorite)),
  home:     (g: GameEntry[]): WL => rec.ml(g.filter(x =>  x.isHome)),
  away:     (g: GameEntry[]): WL => rec.ml(g.filter(x => !x.isHome)),
  ou:       (g: GameEntry[])      => ({ o: g.filter(x => x.ouResult === 'over').length,  u: g.filter(x => x.ouResult === 'under').length }),
}

function wlColor(r: WL) { return r.w > r.l ? '#4ade80' : r.w < r.l ? '#f87171' : '#52525b' }

function RecordBadge({ r }: { r: WL }) {
  return <span style={{ color: wlColor(r), fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0 }}>&nbsp;({r.w}-{r.l})</span>
}
function OUBadge({ o, u }: { o: number; u: number }) {
  const color = o > u ? C.violet : o < u ? C.brown : '#52525b'
  return <span style={{ color, fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0 }}>&nbsp;({o}-{u})</span>
}

// ─── Cells ────────────────────────────────────────────────────────────────────

function Blank() {
  return <div className="cell" style={{ background: C.empty, opacity: 0.4 }} />
}

function WLCell({ result, winLabel = 'W', lossLabel = 'L' }: { result: 'win' | 'loss' | 'push' | null; winLabel?: string; lossLabel?: string }) {
  if (!result) return <Blank />
  const s = {
    win:  { bg: C.green,  color: '#000', glow: `0 0 12px ${C.green}80`,  label: winLabel  },
    loss: { bg: C.red,    color: '#fff', glow: `0 0 12px ${C.red}80`,    label: lossLabel },
    push: { bg: C.white,  color: '#111', glow: 'none',                    label: 'P'       },
  }[result]
  return (
    <div className="cell" style={{ background: s.bg, color: s.color, boxShadow: s.glow, fontWeight: 800, fontSize: result === 'push' ? 10 : 11 }}>
      {s.label}
    </div>
  )
}

function PillCell({ active, color, glow }: { active: boolean; color: string; glow: string }) {
  return <div className="cell" style={{ background: active ? color : C.empty, boxShadow: active ? glow : 'none' }} />
}

function OUCell({ r }: { r: GameEntry['ouResult'] }) {
  const isO = r === 'over', isU = r === 'under', isP = r === 'push'
  return (
    <div style={{ display: 'flex', height: 34, margin: '0 3px', borderRadius: 5, overflow: 'hidden', border: '1px solid #1e1e2e' }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
        background: isO ? C.violet : isP ? '#2e1a5a' : '#110c1e',
        color: isO ? '#fff' : '#2e1a5a',
        boxShadow: isO ? `inset 0 0 10px ${C.violet}60` : 'none',
      }}>O</div>
      <div style={{ width: 1, background: '#1e1e2e' }} />
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
        background: isU ? C.brown : isP ? '#2a1500' : '#150a00',
        color: isU ? '#fff' : '#2a1500',
        boxShadow: isU ? `inset 0 0 8px ${C.brown}60` : 'none',
      }}>U</div>
    </div>
  )
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

function GameCell({ rowKey, game }: { rowKey: RowKey; game: GameEntry }) {
  switch (rowKey) {
    case 'moneyline': return <WLCell result={game.moneylineResult} />
    case 'spread':    return <WLCell result={game.spreadResult} winLabel="COV" lossLabel="MIS" />
    case 'ml-fav':    return <PillCell active={game.isFavorite}         color={C.gold}   glow={`0 0 10px ${C.gold}80`}   />
    case 'ml-dog':    return <PillCell active={!game.isFavorite}        color={C.orange} glow={`0 0 10px ${C.orange}80`} />
    case 'sp-fav':    return <PillCell active={game.isSpreadFavorite}   color={C.royal}  glow={`0 0 10px ${C.royal}80`}  />
    case 'sp-dog':    return <PillCell active={!game.isSpreadFavorite}  color={C.purple} glow={`0 0 10px ${C.purple}80`} />
    case 'home':      return <PillCell active={game.isHome}             color={C.teal}   glow={`0 0 10px ${C.teal}80`}   />
    case 'away':      return <PillCell active={!game.isHome}            color={C.silver} glow={`0 0 10px ${C.silver}60`} />
    case 'ou':        return <OUCell r={game.ouResult} />
  }
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND = [
  { bg: C.green,  label: 'ML Win / Cover'    },
  { bg: C.red,    label: 'ML Loss / Miss'    },
  { bg: C.white,  label: 'Push'              },
  { bg: C.gold,   label: 'ML Favorite'       },
  { bg: C.orange, label: 'ML Underdog'       },
  { bg: C.royal,  label: 'Spread Favorite'   },
  { bg: C.purple, label: 'Spread Dog'        },
  { bg: C.teal,   label: 'Home'              },
  { bg: C.silver, label: 'Away'              },
  { bg: C.violet, label: 'Over'              },
  { bg: C.brown,  label: 'Under'             },
]

function Legend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', padding: '12px 20px 14px', borderBottom: '1px solid #1a1a24' }}>
      {LEGEND.map(({ bg, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 10, height: 10, background: bg, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Date Header Row ─────────────────────────────────────────────────────────

const LABEL_W = 220
const COL_W   = 64

function DateHeader({ dates }: { dates: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #1a1a24', padding: '12px 0 8px', background: '#0c0c10' }}>
      <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: '#0c0c10', paddingLeft: 20, zIndex: 20 }}>
        <span style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Team / Metric</span>
      </div>
      {dates.map(d => (
        <div key={d} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, textAlign: 'center' }}>
          <span style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>{d}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Chart ───────────────────────────────────────────────────────────────

export default function GambchopChart({ data }: { data: TeamChartData[] }) {
  const dates = data[0]?.games.map(g => g.date) ?? []

  return (
    <div style={{ width: '100%', fontFamily: 'var(--font-geist-mono), monospace' }}>
      <Legend />

      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ minWidth: LABEL_W + dates.length * COL_W + 24 }}>

          {/* Initial date header */}
          <DateHeader dates={dates} />

          {data.map((team, ti) => (
            <div key={team.teamName}>
              {/* Repeat header every 5 teams */}
              {ti > 0 && ti % 5 === 0 && <DateHeader dates={dates} />}

              {/* Team header */}
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 20, background: '#0c0c10', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 3, alignSelf: 'stretch', background: C.green, marginRight: 16, borderRadius: '0 2px 2px 0', minHeight: 46 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.3 }}>
                      {team.teamName}
                    </div>
                    <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                      2026 · {team.games.length} Games
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, height: 46, alignSelf: 'center', background: `linear-gradient(to right, ${C.green}0d 0%, transparent 60%)`, borderTop: '1px solid #1a1a24', borderBottom: '1px solid #1a1a24', marginTop: 8 }} />
              </div>

              {/* 9 metric rows */}
              {ROWS.map((row, ri) => {
                const rowBg = ri % 2 === 0 ? '#0c0c10' : '#0e0e15'
                return (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', background: rowBg }}>
                    <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, background: rowBg, height: 34, display: 'flex', alignItems: 'center', paddingLeft: 19 }}>
                      <div style={{ width: 2, height: 12, background: row.accent, borderRadius: 2, marginRight: 10, flexShrink: 0, opacity: 0.85 }} />
                      <span style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {row.label}
                      </span>
                      {row.record(team.games)}
                    </div>
                    {team.games.map(game => (
                      <div key={game.date} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, background: rowBg }}>
                        <GameCell rowKey={row.key} game={game} />
                      </div>
                    ))}
                  </div>
                )
              })}

              <div style={{ height: 10, borderBottom: ti < data.length - 1 ? '1px solid #16161e' : 'none' }} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .cell {
          display: flex; align-items: center; justify-content: center;
          height: 34px; margin: 0 3px; border-radius: 5px;
          font-size: 11px; letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  )
}
