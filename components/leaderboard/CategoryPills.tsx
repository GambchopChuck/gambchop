'use client'

import { useState } from 'react'
import { LEADERBOARD } from '@/lib/mockLeaderboard'
import Podium from './Podium'
import RankedList from './RankedList'

const T = {
  sec:      '#A1A1AA',
  pri:      '#F5F5F4',
  hairline: '#1F1F23',
  strong:   '#2A2A30',
  accent:   '#C5F84A',
}
const SANS = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'

export default function CategoryPills() {
  const [activeCategoryId, setActiveCategoryId] = useState(LEADERBOARD[0].id)

  const activeCategory = LEADERBOARD.find(c => c.id === activeCategoryId) ?? LEADERBOARD[0]

  return (
    <div>
      {/* Pills row */}
      <div className="lb-pills-row">
        {LEADERBOARD.map(cat => {
          const isActive = cat.id === activeCategoryId
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              style={{
                fontFamily: SANS,
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? T.accent : T.sec,
                background: 'transparent',
                border: `1px solid ${isActive ? T.accent : T.hairline}`,
                borderRadius: 6,
                padding: '8px 14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 200ms ease-out, border-color 200ms ease-out',
                lineHeight: 1,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLButtonElement).style.color = T.pri
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.strong
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLButtonElement).style.color = T.sec
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.hairline
                }
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Podium — 48px below pills */}
      <div style={{ marginTop: 48 }}>
        <Podium category={activeCategory} />
      </div>

      {/* Ranked list (rows 4–30) with its own internal headers */}
      <RankedList category={activeCategory} />
    </div>
  )
}
