'use client'

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
}

const ITEMS = [
  { bg: C.green,  label: 'Win / Cover' },
  { bg: C.red,    label: 'Loss' },
  { bg: C.white,  label: 'Push' },
  { bg: C.gold,   label: 'ML Favorite' },
  { bg: C.orange, label: 'ML Underdog' },
  { bg: C.royal,  label: 'Spread Favorite' },
  { bg: C.purple, label: 'Spread Dog' },
  { bg: C.teal,   label: 'Home' },
  { bg: C.silver, label: 'Away' },
  { bg: C.violet, label: 'Over' },
  { bg: C.brown,  label: 'Under' },
]

export default function ChartLegend() {
  return (
    <aside style={{
      position: 'sticky',
      top: 16,
      alignSelf: 'flex-start',
      width: 180,
      flexShrink: 0,
      background: '#0f0f14',
      border: '1px solid #1a1a24',
      borderRadius: 10,
      padding: '14px 14px 12px',
      fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      <div style={{
        fontSize: 9,
        color: '#3f3f46',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        fontWeight: 700,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: '1px solid #1a1a24',
      }}>
        Legend
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {ITEMS.map(({ bg, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, background: bg, borderRadius: 3, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.04em' }}>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}