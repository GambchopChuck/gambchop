import type { LeaderboardRow as LBRow, Outcome } from '@/lib/mockLeaderboard'

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  pri:     '#F5F5F4',
  faint:   '#C5F84A',
  elevated:'#18181C',
  hairline:'#1F1F23',
}
const SANS = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO = 'var(--font-jetbrains), "JetBrains Mono", monospace'

// ─── Outcome → color ─────────────────────────────────────────────────────────

const CELL_COLOR: Record<Outcome, string | null> = {
  win:   '#22C55E',
  loss:  '#EF4444',
  over:  '#A855F7',
  under: '#7DD3FC',
  push:  '#FACC15',
  bonus: '#F472B6',
  none:  null,  // null = bg-elevated with border
}

// ─── Inline chart strip ───────────────────────────────────────────────────────
// TODO: Replace with the canonical ChartRow component when built.
//       This is a placeholder inline implementation.

function ChartStrip({ outcomes }: { outcomes: Outcome[] }) {
  return (
    <div>
      <div style={{
        fontFamily: MONO, fontSize: 9, fontWeight: 500,
        color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        MAY GAME-BY-GAME
      </div>
      <div className="lb-chart-strip">
        {outcomes.map((outcome, i) => {
          const bg = CELL_COLOR[outcome]
          return (
            <div
              key={i}
              style={{
                width: 16,
                height: 22,
                borderRadius: 2,
                flexShrink: 0,
                background: bg ?? T.elevated,
                border: bg === null ? `1px solid ${T.hairline}` : 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── LeaderboardRow ───────────────────────────────────────────────────────────

interface Props {
  row: LBRow
  metaUnit: string
}

export default function LeaderboardRow({ row, metaUnit }: Props) {
  const rankStr = String(row.rank).padStart(2, '0')

  return (
    <div className="lb-row">
      {/* 3-column grid: rank | team+chart | count */}
      <div className="lb-row-grid">

        {/* Cell 1 — Rank */}
        <div style={{
          fontFamily: MONO, fontSize: 14, fontWeight: 500,
          color: T.faint, paddingTop: 2, lineHeight: 1,
        }}>
          {rankStr}
        </div>

        {/* Cell 2 — Team identity + chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Team identity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 2,
              background: row.teamColor, flexShrink: 0,
            }} />
            <span className="lb-team-name" style={{
              fontFamily: SANS, fontSize: 18, fontWeight: 500,
              color: T.pri, letterSpacing: '-0.01em',
            }}>
              {row.team}
            </span>
          </div>

          {/* Chart strip */}
          <ChartStrip outcomes={row.outcomes} />

          {/* Count — visible only on mobile */}
          <div className="lb-count-mobile">
            <div style={{
              fontFamily: MONO, fontSize: 28, fontWeight: 500,
              color: T.pri, lineHeight: 1,
            }}>
              {row.count}
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 500,
              color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
              marginTop: 6,
            }}>
              {metaUnit}
            </div>
          </div>

        </div>

        {/* Cell 3 — Count (desktop) */}
        <div className="lb-count-desktop" style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: MONO, fontSize: 32, fontWeight: 500,
            color: T.pri, lineHeight: 1,
          }}>
            {row.count}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 500,
            color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
            marginTop: 8,
          }}>
            {metaUnit}
          </div>
        </div>

      </div>
    </div>
  )
}
