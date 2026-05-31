'use client'

import type { LeaderboardCategory, LeaderboardRow, Outcome } from '@/lib/mockLeaderboard'

const T = {
  pri:      '#F5F5F4',
  sec:      '#A1A1AA',
  faint:    '#52525B',
  elevated: '#18181C',
  hairline: '#1F1F23',
  accent:   '#C5F84A',
  gold:     '#FACC15',
  silver:   '#94A3B8',
  bronze:   '#EA580C',
}
const SERIF = 'var(--font-fraunces), Georgia, serif'
const MONO  = 'var(--font-jetbrains), "JetBrains Mono", monospace'

const CELL_COLOR: Record<Outcome, string | null> = {
  win:   '#22C55E',
  loss:  '#EF4444',
  over:  '#A855F7',
  under: '#7DD3FC',
  push:  '#FACC15',
  bonus: '#F472B6',
  none:  null,
}

interface ChartStripProps {
  outcomes: Outcome[]
  cellWidth: number
  cellHeight: number
  gap?: number
}

function ChartStrip({ outcomes, cellWidth, cellHeight, gap = 2 }: ChartStripProps) {
  return (
    <div style={{ display: 'flex', gap, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {outcomes.map((o, i) => {
        const bg = CELL_COLOR[o]
        return (
          <div
            key={i}
            style={{
              width: cellWidth,
              height: cellHeight,
              borderRadius: 2,
              flexShrink: 0,
              background: bg ?? T.elevated,
              border: bg === null ? `1px solid ${T.hairline}` : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

interface MedalConfig {
  rank: string
  label: string
  borderColor: string
  glow: string
  hoverGlow: string
  squareSize: number
  nameFontSize: number
  countFontSize: number
  padding: number
  height: number
  tagColor: string
}

const GOLD_CFG: MedalConfig = {
  rank: '01', label: 'GOLD',
  borderColor: T.gold,
  glow: `0 0 100px rgba(250,204,21,0.4), inset 0 0 50px rgba(250,204,21,0.06)`,
  hoverGlow: `0 0 130px rgba(250,204,21,0.55), inset 0 0 60px rgba(250,204,21,0.10)`,
  squareSize: 56, nameFontSize: 32, countFontSize: 56,
  padding: 32, height: 400, tagColor: T.gold,
}

const SILVER_CFG: MedalConfig = {
  rank: '02', label: 'SILVER',
  borderColor: T.silver,
  glow: `0 0 60px rgba(148,163,184,0.25), inset 0 0 30px rgba(148,163,184,0.04)`,
  hoverGlow: `0 0 78px rgba(148,163,184,0.38), inset 0 0 40px rgba(148,163,184,0.08)`,
  squareSize: 44, nameFontSize: 24, countFontSize: 44,
  padding: 24, height: 340, tagColor: T.silver,
}

const BRONZE_CFG: MedalConfig = {
  rank: '03', label: 'BRONZE',
  borderColor: T.bronze,
  glow: `0 0 60px rgba(234,88,12,0.22)`,
  hoverGlow: `0 0 78px rgba(234,88,12,0.34)`,
  squareSize: 44, nameFontSize: 24, countFontSize: 44,
  padding: 24, height: 340, tagColor: T.bronze,
}

interface PodiumCardProps {
  row: LeaderboardRow
  cfg: MedalConfig
  countUnit: string
  isCenter?: boolean
}

function PodiumCard({ row, cfg, countUnit, isCenter = false }: PodiumCardProps) {
  return (
    <div
      className={isCenter ? 'podium-card podium-card-center' : 'podium-card'}
      style={{
        height: cfg.height,
        background: '#121215',
        border: `1px solid ${cfg.borderColor}`,
        borderRadius: 12,
        padding: cfg.padding,
        boxShadow: cfg.glow,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
        transition: 'box-shadow 250ms ease-out, transform 250ms ease-out',
        '--hover-glow': cfg.hoverGlow,
      } as React.CSSProperties}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = cfg.hoverGlow
        el.style.transform = 'translateY(-4px)'
        const nameEl = el.querySelector<HTMLElement>('.podium-team-name')
        if (nameEl) nameEl.style.color = T.accent
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = cfg.glow
        el.style.transform = ''
        const nameEl = el.querySelector<HTMLElement>('.podium-team-name')
        if (nameEl) nameEl.style.color = T.pri
      }}
    >
      {/* Rank badge */}
      <div>
        <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, color: T.faint, letterSpacing: '0.12em' }}>
          {cfg.rank}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 600,
          color: cfg.tagColor, letterSpacing: '0.18em', textTransform: 'uppercase',
          marginTop: 4,
        }}>
          {cfg.label}
        </div>
      </div>

      {/* Team identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
        <div style={{
          width: cfg.squareSize, height: cfg.squareSize, borderRadius: 4,
          background: row.teamColor, flexShrink: 0,
        }} />
        <span className="podium-team-name" style={{
          fontFamily: SERIF, fontSize: cfg.nameFontSize, fontWeight: 400,
          color: T.pri, lineHeight: 1.15, fontStyle: 'normal',
          transition: 'color 250ms ease-out',
        }}>
          {row.team}
        </span>
      </div>

      {/* Count */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          fontFamily: MONO, fontSize: cfg.countFontSize, fontWeight: 500,
          color: T.pri, lineHeight: 1,
        }}>
          {row.count}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 11, fontWeight: 500,
          color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
          marginTop: 6,
        }}>
          {countUnit}
        </div>
      </div>

      {/* Chart strip — pushed to bottom */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 500,
          color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          MAY GAME-BY-GAME
        </div>
        <ChartStrip
          outcomes={row.outcomes}
          cellWidth={isCenter ? 14 : 12}
          cellHeight={isCenter ? 20 : 18}
        />
      </div>
    </div>
  )
}

// Empty bronze placeholder card
function EmptyBronzeCard() {
  return (
    <div style={{
      height: 340,
      background: '#121215',
      border: `1px solid ${T.hairline}`,
      borderRadius: 12,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, color: T.faint }}>03</div>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: T.faint, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
        BRONZE
      </div>
      <div style={{
        marginTop: 'auto', marginBottom: 'auto',
        fontFamily: MONO, fontSize: 22, fontWeight: 500, color: T.faint,
        textAlign: 'center',
      }}>
        —
      </div>
    </div>
  )
}

interface PodiumProps {
  category: LeaderboardCategory
}

export default function Podium({ category }: PodiumProps) {
  const rows = category.rows
  if (rows.length === 0) return null

  const rank1 = rows.filter(r => r.rank === 1)
  const rank2 = rows.filter(r => r.rank === 2)
  const rank3 = rows.filter(r => r.rank === 3)

  // Detect tie at rank 2 (bronze empty case from spec)
  const isTieAt2 = rank2.length > 1 && rank3.length === 0
  // Detect tie at rank 1
  const isTieAt1 = rank1.length > 1

  const gold1 = rank1[0]
  const gold2 = rank1[1] // exists on tie at 1

  // Left slot = rank 2 (first entry)
  const leftRow = rank2[0] ?? null
  // Right slot = rank 3 OR second rank2 on tie
  const rightRow = isTieAt2 ? rank2[1] : (rank3[0] ?? null)

  const leftCfg  = SILVER_CFG
  const rightCfg = isTieAt2 ? { ...SILVER_CFG } : BRONZE_CFG

  return (
    <div>
      <style>{`
        @media (max-width: 1099px) {
          .podium-grid { }
          .podium-card-center { height: 360px !important; }
          .podium-card:not(.podium-card-center) { height: 320px !important; }
          .podium-card-center .podium-team-name { font-size: 28px !important; }
          .podium-card:not(.podium-card-center) .podium-team-name { font-size: 22px !important; }
        }
        @media (max-width: 767px) {
          .podium-grid {
            display: flex !important;
            flex-direction: column !important;
          }
          .podium-card, .podium-card-center {
            height: 320px !important;
          }
          .podium-card-center .podium-team-name { font-size: 28px !important; }
          .podium-card:not(.podium-card-center) .podium-team-name { font-size: 22px !important; }
        }
        @media (max-width: 479px) {
          .podium-card, .podium-card-center {
            padding: 16px !important;
          }
          .lb-chart-strip {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
        }
      `}</style>

      {/* Olympic 3-column grid — center column bottom-aligned */}
      <div
        className="podium-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.15fr 1fr',
          gap: 32,
          alignItems: 'end',
        }}
      >
        {/* Left — #2 Silver */}
        {leftRow ? (
          <PodiumCard row={leftRow} cfg={leftCfg} countUnit={category.countUnit} />
        ) : (
          <EmptyBronzeCard />
        )}

        {/* Center — #1 Gold */}
        {isTieAt1 && gold2 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PodiumCard row={gold1} cfg={GOLD_CFG} countUnit={category.countUnit} isCenter />
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>
              TIE AT #1
            </div>
            <PodiumCard row={gold2} cfg={GOLD_CFG} countUnit={category.countUnit} isCenter />
          </div>
        ) : (
          <PodiumCard row={gold1} cfg={GOLD_CFG} countUnit={category.countUnit} isCenter />
        )}

        {/* Right — #3 Bronze or tied #2 Silver */}
        {rightRow ? (
          <PodiumCard row={rightRow} cfg={rightCfg} countUnit={category.countUnit} />
        ) : (
          <EmptyBronzeCard />
        )}
      </div>

      {/* Tie note */}
      {isTieAt2 && (
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 500,
          color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
          textAlign: 'center', marginTop: 16,
        }}>
          TIE AT #2 — NO BRONZE POSITION THIS MONTH
        </div>
      )}
    </div>
  )
}
