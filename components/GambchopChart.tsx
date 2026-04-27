'use client'

import type { TeamChartData, GameEntry } from '@/lib/mock-data'

// ─── Cell Components ─────────────────────────────────────────────────────────

function MoneylineCell({ result }: { result: GameEntry['moneylineResult'] }) {
  if (!result) return <BlankCell />
  const cfg = {
    win:  { cls: 'bg-lime-400 text-black',    glow: '0 0 10px rgba(163,230,53,0.75)',  label: 'W' },
    loss: { cls: 'bg-red-500 text-white',      glow: '0 0 10px rgba(239,68,68,0.75)',   label: 'L' },
    push: { cls: 'bg-zinc-600 text-zinc-300',  glow: 'none',                            label: 'P' },
  }[result]
  return (
    <div className={`cell-base ${cfg.cls}`} style={{ boxShadow: cfg.glow }}>
      {cfg.label}
    </div>
  )
}

function SpreadCell({ result }: { result: GameEntry['spreadResult'] }) {
  if (!result) return <BlankCell />
  const cfg = {
    win:  { cls: 'bg-[#15803d] text-white',   glow: '0 0 10px rgba(21,128,61,0.8)',    label: 'COV' },
    loss: { cls: 'bg-red-500 text-white',      glow: '0 0 10px rgba(239,68,68,0.75)',   label: 'MIS' },
    push: { cls: 'bg-zinc-600 text-zinc-300',  glow: 'none',                            label: 'PSH' },
  }[result]
  return (
    <div className={`cell-base text-[9px] tracking-widest ${cfg.cls}`} style={{ boxShadow: cfg.glow }}>
      {cfg.label}
    </div>
  )
}

function IndicatorCell({ active, bg, glow }: { active: boolean; bg: string; glow: string }) {
  return (
    <div
      className={`cell-base ${active ? bg : 'bg-[#0c0c1a]'}`}
      style={{ boxShadow: active ? glow : 'none' }}
    />
  )
}

function OUCell({ result }: { result: GameEntry['ouResult'] }) {
  const isOver  = result === 'over'
  const isUnder = result === 'under'
  const isPush  = result === 'push'
  return (
    <div className="flex h-8 mx-[3px] rounded overflow-hidden border border-[#1a1a2e]">
      <div
        className={`flex-1 flex items-center justify-center text-[9px] font-black tracking-wider
          ${isOver  ? 'bg-blue-700 text-white' :
            isPush  ? 'bg-blue-900/60 text-blue-500' :
                      'bg-[#0a0a20] text-[#1a2040]'}`}
        style={{ boxShadow: isOver ? 'inset 0 0 8px rgba(29,78,216,0.6)' : 'none' }}
      >
        O
      </div>
      <div className="w-px bg-[#1a1a2e]" />
      <div
        className={`flex-1 flex items-center justify-center text-[9px] font-black tracking-wider
          ${isUnder ? 'bg-sky-300 text-sky-900' :
            isPush  ? 'bg-sky-900/40 text-sky-600' :
                      'bg-[#0a0a20] text-[#0a1530]'}`}
        style={{ boxShadow: isUnder ? 'inset 0 0 8px rgba(125,211,252,0.4)' : 'none' }}
      >
        U
      </div>
    </div>
  )
}

function BlankCell() {
  return <div className="h-8 mx-[3px] rounded bg-[#0c0c1a] opacity-40" />
}

// ─── Row Renderer ─────────────────────────────────────────────────────────────

const ROW_CONFIG = [
  { label: 'Moneyline',   key: 'moneyline'   },
  { label: 'Spread',      key: 'spread'      },
  { label: 'Favorite',    key: 'favorite'    },
  { label: 'Underdog',    key: 'underdog'    },
  { label: 'Home',        key: 'home'        },
  { label: 'Away',        key: 'away'        },
  { label: 'Over / Under',key: 'ou'          },
] as const

type RowKey = typeof ROW_CONFIG[number]['key']

function GameCell({ rowKey, game }: { rowKey: RowKey; game: GameEntry }) {
  switch (rowKey) {
    case 'moneyline': return <MoneylineCell result={game.moneylineResult} />
    case 'spread':    return <SpreadCell result={game.spreadResult} />
    case 'favorite':  return (
      <IndicatorCell
        active={game.isFavorite}
        bg="bg-pink-500"
        glow="0 0 10px rgba(236,72,153,0.7)"
      />
    )
    case 'underdog':  return (
      <IndicatorCell
        active={!game.isFavorite}
        bg="bg-[#c2410c]"
        glow="0 0 10px rgba(194,65,12,0.7)"
      />
    )
    case 'home':      return (
      <IndicatorCell
        active={game.isHome}
        bg="bg-amber-500"
        glow="0 0 10px rgba(245,158,11,0.7)"
      />
    )
    case 'away':      return (
      <IndicatorCell
        active={!game.isHome}
        bg="bg-slate-400"
        glow="0 0 10px rgba(148,163,184,0.6)"
      />
    )
    case 'ou':        return <OUCell result={game.ouResult} />
  }
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: 'bg-lime-400',   label: 'ML Win'   },
    { color: 'bg-red-500',    label: 'ML Loss'  },
    { color: 'bg-[#15803d]',  label: 'Covered'  },
    { color: 'bg-pink-500',   label: 'Favorite' },
    { color: 'bg-[#c2410c]',  label: 'Underdog' },
    { color: 'bg-amber-500',  label: 'Home'     },
    { color: 'bg-slate-400',  label: 'Away'     },
    { color: 'bg-blue-700',   label: 'Over'     },
    { color: 'bg-sky-300',    label: 'Under'    },
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 pb-4 pt-1">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm ${color}`} />
          <span className="text-[10px] text-zinc-500 tracking-widest uppercase">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Chart ───────────────────────────────────────────────────────────────

const LABEL_W  = 'w-[130px] min-w-[130px]'
const COL_W    = 'w-[72px]  min-w-[72px]'

export default function GambchopChart({ data }: { data: TeamChartData[] }) {
  const dates = data[0]?.games.map(g => g.date) ?? []

  return (
    <div className="w-full">
      {/* Legend */}
      <Legend />

      {/* Chart */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max">

          {/* Date header row */}
          <div className="flex items-end mb-1 border-b border-[#1a1a2e]">
            <div className={`${LABEL_W} flex-shrink-0 sticky left-0 z-20 bg-[#05050f] px-3 pb-2`}>
              <span className="text-[9px] tracking-[0.2em] text-zinc-600 uppercase">Team / Metric</span>
            </div>
            {dates.map(date => (
              <div key={date} className={`${COL_W} flex-shrink-0 pb-2 text-center`}>
                <span className="text-[10px] tracking-widest text-zinc-500 uppercase">{date}</span>
              </div>
            ))}
          </div>

          {/* Team sections */}
          {data.map((team, ti) => (
            <div
              key={team.abbreviation}
              className={`mb-1 ${ti < data.length - 1 ? 'border-b border-[#12121f]' : ''}`}
            >
              {/* Team name header */}
              <div className="flex items-center mb-[3px]">
                <div
                  className={`${LABEL_W} flex-shrink-0 sticky left-0 z-20 px-3 py-2`}
                  style={{ background: '#05050f' }}
                >
                  <span
                    className="text-[11px] font-black tracking-[0.15em] uppercase"
                    style={{ color: '#c8d6f0', textShadow: '0 0 12px rgba(148,163,220,0.4)' }}
                  >
                    {team.abbreviation}
                  </span>
                </div>
                {/* Opponent labels */}
                {team.games.map(game => (
                  <div key={game.date} className={`${COL_W} flex-shrink-0 text-center py-2`}>
                    <span className="text-[9px] tracking-widest text-zinc-600 uppercase">
                      {game.isHome ? '' : '@'}{game.opponent}
                    </span>
                  </div>
                ))}
              </div>

              {/* 7 metric rows */}
              {ROW_CONFIG.map((row, ri) => (
                <div key={row.key} className="flex items-center">
                  {/* Sticky row label */}
                  <div
                    className={`${LABEL_W} flex-shrink-0 sticky left-0 z-20 px-3 h-8 flex items-center`}
                    style={{
                      background: ri % 2 === 0 ? '#06060f' : '#07071a',
                    }}
                  >
                    <span className="text-[9px] tracking-[0.15em] text-zinc-600 uppercase whitespace-nowrap">
                      {row.label}
                    </span>
                  </div>

                  {/* Game cells */}
                  {team.games.map(game => (
                    <div
                      key={game.date}
                      className={`${COL_W} flex-shrink-0 py-[3px]`}
                      style={{ background: ri % 2 === 0 ? '#06060f' : '#07071a' }}
                    >
                      <GameCell rowKey={row.key} game={game} />
                    </div>
                  ))}
                </div>
              ))}

              {/* Spacer row between teams */}
              <div className="h-3" />
            </div>
          ))}
        </div>
      </div>

      {/* Inline styles for shared cell class */}
      <style>{`
        .cell-base {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 2rem;
          margin: 0 3px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }
      `}</style>
    </div>
  )
}
