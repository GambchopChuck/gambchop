'use client'

import { useRef, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import type { LeaderboardCategory, LeaderboardRow, Outcome } from '@/lib/mockLeaderboard'
import { TEAM_COLORS } from '@/lib/teamColors'

const T = {
  pri:      '#F5F5F4',
  sec:      '#ffffff',
  faint:    '#ffffff',
  elevated: '#18181C',
  hairline: '#1F1F23',
  accent:   '#C5F84A',
}
const SERIF = 'var(--font-fraunces), Georgia, serif'
const SANS  = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
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

function ChartStrip({ outcomes }: { outcomes: Outcome[] }) {
  return (
    <div className="rl-chart-strip" style={{ display: 'flex', gap: 2, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {outcomes.map((o, i) => {
        const bg = CELL_COLOR[o]
        return (
          <div
            key={i}
            style={{
              width: 12,
              height: 18,
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

// Empty state
function EmptyState() {
  return (
    <div style={{
      height: 200,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 0,
    }}>
      <Calendar size={24} color={T.accent} />
      <div style={{ height: 16 }} />
      <h3 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, color: T.pri, margin: 0, lineHeight: 1.2 }}>
        Leaderboard returns at month-end.
      </h3>
      <div style={{ height: 12 }} />
      <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 400, color: T.sec, margin: 0, textAlign: 'center' }}>
        May 2026 results freeze on June 1. Check back then.
      </p>
    </div>
  )
}

interface RowItemProps {
  row:        LeaderboardRow
  countUnit:  string
  rangeLabel: string
  isLast:     boolean
}

function RowItem({ row, countUnit, rangeLabel, isLast }: RowItemProps) {
  const rankStr = String(row.rank).padStart(2, '0')
  const isZero  = row.count === 0
  const rowRef  = useRef<HTMLDivElement>(null)
  const colors  = TEAM_COLORS[row.team]

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => entry.target.classList.toggle('team-glow-active', entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={rowRef}
      className="rl-row team-glow-border"
      style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr 100px',
        gap: 16,
        alignItems: 'start',
        padding: '20px 16px',
        marginBottom: isLast ? 0 : 8,
        cursor: 'default',
        transition: 'background 200ms ease-out',
        '--team-primary':   colors?.primary   ?? '#39ff9a',
        '--team-secondary': colors?.secondary ?? '#ffffff',
      } as React.CSSProperties}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.background = T.elevated
        const nameEl = el.querySelector<HTMLElement>('.rl-team-name')
        if (nameEl) nameEl.style.color = T.accent
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.background = 'transparent'
        const nameEl = el.querySelector<HTMLElement>('.rl-team-name')
        if (nameEl) nameEl.style.color = T.pri
      }}
    >
      {/* Cell 1 — Rank */}
      <div style={{
        fontFamily: MONO, fontSize: 20, fontWeight: 700,
        color: T.faint, lineHeight: 1,
      }}>
        {rankStr}
      </div>

      {/* Cell 2 — Team identity + chart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 2,
            background: row.teamColor, flexShrink: 0,
          }} />
          <span className="rl-team-name" style={{
            fontFamily: SANS, fontSize: 16, fontWeight: 500,
            color: T.pri, letterSpacing: '-0.01em',
            transition: 'color 200ms ease-out',
          }}>
            {row.team}
          </span>
        </div>
        <div>
          <div style={{
            fontFamily: MONO, fontSize: 8, fontWeight: 500,
            color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            {rangeLabel.toUpperCase()}
          </div>
          <ChartStrip outcomes={row.outcomes} />
        </div>
      </div>

      {/* Cell 3 — Count */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: MONO, fontSize: 22, fontWeight: 500,
          color: isZero ? T.sec : T.pri, lineHeight: 1,
        }}>
          {row.count}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 500,
          color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
          marginTop: 4,
        }}>
          {countUnit}
        </div>
      </div>
    </div>
  )
}

interface RankedListProps {
  category:    LeaderboardCategory
  rangeLabel?: string
}

export default function RankedList({ category, rangeLabel = 'This Season' }: RankedListProps) {
  // Rows 4–30: skip the first 3 ranked positions (rank 1, 2, 3)
  // Find the cutoff index: skip all rows that belong to rank 1, 2, or 3
  const topRanks = new Set([1, 2, 3])
  const listRows = category.rows.filter(r => !topRanks.has(r.rank))

  if (category.rows.length === 0) return <EmptyState />

  return (
    <div style={{ marginTop: 48 }}>
      <style>{`
        @media (max-width: 1099px) {
          .rl-chart-strip div { width: 10px !important; }
        }
        @media (max-width: 767px) {
          .rl-row {
            grid-template-columns: 32px 1fr !important;
            grid-template-rows: auto auto !important;
          }
          .rl-row > *:last-child {
            grid-column: 1 / -1;
            text-align: left !important;
          }
          .rl-chart-strip {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .rl-chart-strip::-webkit-scrollbar { display: none; }
        }
      `}</style>

      {/* FULL RANKINGS header */}
      <div style={{
        fontFamily: MONO, fontSize: 11, fontWeight: 500,
        color: T.sec, letterSpacing: '0.18em', textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        FULL RANKINGS
      </div>
      <div style={{ height: 1, background: T.hairline, marginBottom: 16 }} />

      {/* Column header strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr 100px',
        gap: 16,
        paddingBottom: 12,
      }}>
        <div />
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 500,
          color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          TEAM
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 500,
          color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
          textAlign: 'right',
        }}>
          {category.countUnit}
        </div>
      </div>
      <div style={{ height: 1, background: T.hairline }} />

      {/* Rows */}
      {listRows.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          ALL TEAMS IN PODIUM
        </div>
      ) : (
        listRows.map((row, i) => (
          <RowItem
            key={`${row.team}-${row.rank}`}
            row={row}
            countUnit={category.countUnit}
            rangeLabel={rangeLabel}
            isLast={i === listRows.length - 1}
          />
        ))
      )}
    </div>
  )
}
