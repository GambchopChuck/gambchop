import { Calendar } from 'lucide-react'
import type { LeaderboardCategory } from '@/lib/mockLeaderboard'
import LeaderboardRow from './LeaderboardRow'

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  pri:     '#F5F5F4',
  sec:     '#A1A1AA',
  faint:   '#C5F84A',
  hairline:'#1F1F23',
}
const SERIF = 'var(--font-fraunces), Georgia, serif'
const SANS  = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO  = 'var(--font-jetbrains), "JetBrains Mono", monospace'

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      height: 200,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 0,
    }}>
      <Calendar size={24} color={T.faint} />
      <div style={{ height: 16 }} />
      <h3 style={{
        fontFamily: SERIF, fontSize: 22, fontWeight: 400,
        color: T.pri, margin: 0, lineHeight: 1.2,
      }}>
        Leaderboard returns at month-end.
      </h3>
      <div style={{ height: 12 }} />
      <p style={{
        fontFamily: SANS, fontSize: 14, fontWeight: 400,
        color: T.sec, margin: 0, textAlign: 'center',
      }}>
        May 2026 results freeze on June 1. Check back then.
      </p>
    </div>
  )
}

// ─── LeaderboardList ──────────────────────────────────────────────────────────

interface Props {
  category: LeaderboardCategory
}

export default function LeaderboardList({ category }: Props) {
  return (
    <div>
      {/* Column header strip */}
      <div className="lb-row-grid" style={{ marginBottom: 16 }}>
        <div /> {/* rank column — no label */}
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 500,
          color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          TEAM
        </div>
        <div className="lb-count-desktop" style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 500,
            color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>
            {category.countUnit}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 500,
            color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase',
            marginTop: 2,
          }}>
            MAY 2026
          </div>
        </div>
      </div>

      {/* Hairline under header */}
      <div style={{ height: 1, background: T.hairline, marginBottom: 0 }} />

      {/* Rows or empty state */}
      {category.rows.length === 0 ? (
        <EmptyState />
      ) : (
        category.rows.map((row) => (
          <LeaderboardRow
            key={`${row.team}-${row.rank}`}
            row={row}
            metaUnit={category.metaUnit}
          />
        ))
      )}
    </div>
  )
}
