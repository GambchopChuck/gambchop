'use client'

// Shared stat card used on /compare and /leaderboard

const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const MUTED  = '#52525b'
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'

export interface StatCardData {
  label: string
  value: string
  color: string
}

export function StatCard({ label, value, color }: StatCardData) {
  return (
    <div
      className="stat-card"
      style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
        padding: '14px 18px', textAlign: 'center', flex: '1 1 0', minWidth: 0,
      }}
    >
      <div style={{
        fontSize: 22, fontWeight: 700, color,
        letterSpacing: '0.02em', lineHeight: 1, fontFamily: OSWALD,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, color: MUTED, letterSpacing: '0.2em',
        textTransform: 'uppercase', marginTop: 6,
      }}>
        {label}
      </div>
    </div>
  )
}
