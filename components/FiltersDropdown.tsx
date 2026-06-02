'use client'

import { useFilters, ROW_LABELS } from '@/lib/filter-context'
import type { VisibleRows } from '@/lib/filter-context'

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const MUTED  = '#52525b'
const TEXT   = '#f4f4f5'
const GREEN  = '#22c55e'

function Checkbox({ checked, onChange, label, color = GREEN }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; color?: string
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          background: checked ? color : 'transparent',
          border: `1.5px solid ${checked ? color : BORDER}`,
          boxShadow: checked ? `0 0 8px ${color}66` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {checked && <span style={{ fontSize: 9, color: '#000', fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 10, color: checked ? TEXT : MUTED, letterSpacing: '0.06em', transition: 'color 0.15s' }}>{label}</span>
    </label>
  )
}

export default function FiltersDropdown({ onClose }: { onClose: () => void }) {
  const { visibleRows, setVisibleRows, resetFilters, activeCount } = useFilters()

  const toggle = (key: keyof VisibleRows) =>
    setVisibleRows({ ...visibleRows, [key]: !visibleRows[key] })

  return (
    <div style={{
      background: BG,
      borderTop: '1px solid #14141c',
      borderBottom: '1px solid #14141c',
      padding: '16px 24px 20px',
      fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, color: GREEN, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 800 }}>
              ◧ Visible Rows
            </span>
            {activeCount > 0 && (
              <span style={{
                background: `${GREEN}22`, border: `1px solid ${GREEN}55`,
                borderRadius: 4, padding: '2px 7px',
                fontSize: 9, color: GREEN, fontWeight: 700, letterSpacing: '0.1em',
              }}>
                {activeCount} hidden
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeCount > 0 && (
              <button
                onClick={resetFilters}
                style={{
                  background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6,
                  color: MUTED, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', cursor: 'pointer', padding: '4px 12px',
                  fontFamily: 'inherit',
                }}
              >
                Show All
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6,
                color: MUTED, fontSize: 12, cursor: 'pointer', padding: '2px 10px',
                fontFamily: 'inherit', lineHeight: 1.2,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* 9 row checkboxes in a responsive grid */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
          padding: '14px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10,
        }}>
          {(Object.keys(visibleRows) as Array<keyof VisibleRows>).map(key => (
            <Checkbox
              key={key as string}
              checked={visibleRows[key]}
              onChange={() => toggle(key)}
              label={ROW_LABELS[key]}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
