'use client'

import { useState } from 'react'
import type { TeamChartData, GameEntry } from '@/lib/leagues-data'

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
  return <span style={{ color: wlColor(r), fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>&nbsp;({r.w}-{r.l})</span>
}
function OUBadge({ o, u }: { o: number; u: number }) {
  const color = o > u ? C.violet : o < u ? C.brown : '#52525b'
  return <span style={{ color, fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>&nbsp;({o}-{u})</span>
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
  if (!r) return <Blank />
  const s = {
    over:  { bg: C.violet, color: '#fff', label: 'O', glow: `0 0 12px ${C.violet}80` },
    under: { bg: C.brown,  color: '#fff', label: 'U', glow: `0 0 12px ${C.brown}80`  },
    push:  { bg: C.white,  color: '#111', label: 'P', glow: 'none'                    },
  }[r]
  return (
    <div className="cell" style={{ background: s.bg, color: s.color, boxShadow: s.glow, fontWeight: 800 }}>
      {s.label}
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
    case 'ml-fav':    return <PillCell active={game.isFavorite}        color={C.gold}   glow={`0 0 10px ${C.gold}80`}   />
    case 'ml-dog':    return <PillCell active={!game.isFavorite}       color={C.orange} glow={`0 0 10px ${C.orange}80`} />
    case 'sp-fav':    return <PillCell active={game.isSpreadFavorite}  color={C.royal}  glow={`0 0 10px ${C.royal}80`}  />
    case 'sp-dog':    return <PillCell active={!game.isSpreadFavorite} color={C.purple} glow={`0 0 10px ${C.purple}80`} />
    case 'home':      return <PillCell active={game.isHome}            color={C.teal}   glow={`0 0 10px ${C.teal}80`}   />
    case 'away':      return <PillCell active={!game.isHome}           color={C.silver} glow={`0 0 10px ${C.silver}60`} />
    case 'ou':        return <OUCell r={game.ouResult} />
  }
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND = [
  { bg: C.green,  label: 'ML Win / Cover'  },
  { bg: C.red,    label: 'ML Loss / Miss'  },
  { bg: C.white,  label: 'Push'            },
  { bg: C.gold,   label: 'ML Favorite'     },
  { bg: C.orange, label: 'ML Underdog'     },
  { bg: C.royal,  label: 'Spread Favorite' },
  { bg: C.purple, label: 'Spread Dog'      },
  { bg: C.teal,   label: 'Home'            },
  { bg: C.silver, label: 'Away'            },
  { bg: C.violet, label: 'Over'            },
  { bg: C.brown,  label: 'Under'           },
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

// ─── Date Header ─────────────────────────────────────────────────────────────

const LABEL_W = 220
const COL_W   = 64

function DateHeader({ dates }: { dates: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #1a1a24', padding: '12px 0 8px', background: '#0a0a0f' }}>
      <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: '#0a0a0f', paddingLeft: 20, zIndex: 20 }}>
        <span style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Team / Metric</span>
      </div>
      {dates.map((d, i) => (
        <div key={d} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, textAlign: 'center', position: 'relative' }}>
          <span style={{ fontSize: 10, color: i < FREE_COLS ? '#52525b' : '#3a3a46', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>{d}</span>
          {i === FREE_COLS && (
            <div style={{ position: 'absolute', top: -2, left: 0, width: 1, height: 28, background: '#8b5cf644' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Pro Blur Overlay ─────────────────────────────────────────────────────────

function ProOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(to right, transparent 0%, #0a0a0f88 20%, #0a0a0fcc 60%, #0a0a0f 100%)',
      zIndex: 5, pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'all', textAlign: 'center', padding: '12px 20px', marginRight: 16 }}>
        <button
          onClick={onUpgrade}
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            border: 'none', borderRadius: 8, padding: '10px 20px',
            color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
            textTransform: 'uppercase', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(139,92,246,0.5)',
            fontFamily: 'inherit',
          }}
        >
          🔒 Go Pro — Unlock All Games
        </button>
        <p style={{ fontSize: 9, color: '#52525b', marginTop: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Free preview: first {FREE_COLS} games only
        </p>
      </div>
    </div>
  )
}

// ─── Main Chart ───────────────────────────────────────────────────────────────

interface Props {
  data: TeamChartData[]
  isPro?: boolean
  onUpgrade?: () => void
  accent?: string
}

export default function GambchopChart({ data, isPro = false, onUpgrade, accent = C.green }: Props) {
  const [showProBanner, setShowProBanner] = useState(false)
  const dates = data[0]?.games.map(g => g.date) ?? []
  const visibleCount = isPro ? dates.length : FREE_COLS
  const visibleDates = isPro ? dates : dates.slice(0, visibleCount)

  const handleUpgrade = () => {
    if (onUpgrade) onUpgrade()
    else setShowProBanner(true)
  }

  return (
    <div style={{ width: '100%', fontFamily: 'var(--font-geist-mono), monospace' }}>
      <Legend />

      {!isPro && showProBanner && (
        <div style={{ background: '#8b5cf60d', border: '1px solid #8b5cf633', borderRadius: 10, padding: '14px 20px', margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Go Pro to unlock all games</div>
            <div style={{ fontSize: 10, color: '#52525b', marginTop: 4 }}>You&apos;re seeing the first {FREE_COLS} games. Pro unlocks full season data for every team.</div>
          </div>
          <button style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: 8,
            padding: '10px 18px', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
            textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
          }}>
            Go Pro →
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ minWidth: LABEL_W + (isPro ? dates.length : dates.length) * COL_W + 24, position: 'relative' }}>

          <DateHeader dates={dates} />

          {data.map((team, ti) => (
            <div key={team.teamName}>
              {ti > 0 && ti % 5 === 0 && <DateHeader dates={dates} />}

              {/* Team header */}
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 20, background: '#0a0a0f', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 3, alignSelf: 'stretch', background: accent, marginRight: 16, borderRadius: '0 2px 2px 0', minHeight: 46 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.3 }}>
                      {team.teamName}
                    </div>
                    <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                      {team.games.length} Games
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, height: 46, alignSelf: 'center', background: `linear-gradient(to right, ${accent}0d 0%, transparent 60%)`, borderTop: '1px solid #1a1a24', borderBottom: '1px solid #1a1a24', marginTop: 8 }} />
              </div>

              {/* 9 metric rows */}
              {ROWS.map((row, ri) => {
                const rowBg = ri % 2 === 0 ? '#0a0a0f' : '#0d0d14'
                return (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', background: rowBg }}>
                    <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, background: rowBg, height: 34, display: 'flex', alignItems: 'center', paddingLeft: 19 }}>
                      <div style={{ width: 2, height: 12, background: row.accent, borderRadius: 2, marginRight: 10, flexShrink: 0, opacity: 0.85 }} />
                      <span style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {row.label}
                      </span>
                      {row.record(team.games)}
                    </div>
                    {team.games.map((game, gi) => {
                      const locked = !isPro && gi >= FREE_COLS
                      return (
                        <div key={game.date} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, background: rowBg, filter: locked ? 'blur(4px)' : 'none', opacity: locked ? 0.35 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
                          <GameCell rowKey={row.key} game={game} />
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              <div style={{ height: 10, borderBottom: ti < data.length - 1 ? '1px solid #16161e' : 'none' }} />
            </div>
          ))}

          {/* Pro blur overlay — covers locked columns */}
          {!isPro && dates.length > FREE_COLS && (
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: LABEL_W + FREE_COLS * COL_W, right: 0, pointerEvents: 'none' }}>
              <ProOverlay onUpgrade={handleUpgrade} />
            </div>
          )}
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
