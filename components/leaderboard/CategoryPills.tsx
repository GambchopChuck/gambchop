'use client'

import { useState } from 'react'
import { LEADERBOARD } from '@/lib/mockLeaderboard'
import Podium from './Podium'
import RankedList from './RankedList'

const T = {
  sec:      '#A1A1AA',
  pri:      '#F5F5F4',
  hairline: '#1F1F23',
  green:    '#22C55E',
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
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0A0A0B' : T.sec,
                background: isActive ? T.green : 'transparent',
                border: isActive ? `1.5px solid ${T.green}` : `1px solid ${T.hairline}`,
                borderRadius: isActive ? 8 : 6,
                padding: isActive ? '10px 18px' : '8px 14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 200ms ease-out',
                lineHeight: 1,
                boxShadow: isActive
                  ? '0 0 24px rgba(34,197,94,0.45), inset 0 0 12px rgba(34,197,94,0.15)'
                  : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = T.pri
                  el.style.borderColor = 'rgba(34,197,94,0.4)'
                  el.style.background = 'rgba(34,197,94,0.04)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = T.sec
                  el.style.borderColor = T.hairline
                  el.style.background = 'transparent'
                }
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Podium — 48px below pills */}
      <div style={{ marginTop: 48, overflow: 'visible' }}>
        <Podium category={activeCategory} />
      </div>

      {/* Ranked list (rows 4–30) with its own internal headers */}
      <RankedList category={activeCategory} />
    </div>
  )
}
