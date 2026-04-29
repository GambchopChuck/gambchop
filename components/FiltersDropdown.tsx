'use client'

import { useFilters, DEFAULT_FILTERS, Filters } from '@/lib/filter-context'

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const TEXT   = '#f4f4f5'
const GREEN  = '#22c55e'

type RestDays = Filters['restDays']

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 8, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
      {children}
    </div>
  )
}

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

function RadioRow({ value, current, onChange, label }: {
  value: RestDays; current: RestDays; onChange: (v: RestDays) => void; label: string
}) {
  const active = value === current
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(value)}
        style={{
          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
          background: active ? GREEN : 'transparent',
          border: `1.5px solid ${active ? GREEN : BORDER}`,
          boxShadow: active ? `0 0 8px ${GREEN}66` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#000' }} />}
      </div>
      <span style={{ fontSize: 10, color: active ? TEXT : MUTED, letterSpacing: '0.06em', transition: 'color 0.15s' }}>{label}</span>
    </label>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
      padding: '14px 16px', flex: '1 1 180px', minWidth: 160,
    }}>
      <SectionLabel>{title}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {children}
      </div>
    </div>
  )
}

export default function FiltersDropdown({ onClose }: { onClose: () => void }) {
  const { filters, setFilters, resetFilters, activeCount } = useFilters()

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters({ ...filters, [key]: val })

  return (
    <div style={{
      background: BG,
      borderTop: '1px solid #14141c',
      borderBottom: '1px solid #14141c',
      padding: '16px 24px 20px',
      fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, color: GREEN, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 800 }}>
              ◧ Chart Filters
            </span>
            {activeCount > 0 && (
              <span style={{
                background: `${GREEN}22`, border: `1px solid ${GREEN}55`,
                borderRadius: 4, padding: '2px 7px',
                fontSize: 9, color: GREEN, fontWeight: 700, letterSpacing: '0.1em',
              }}>
                {activeCount} active
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
                Clear All
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

        {/* Filter sections grid */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

          {/* Home / Away */}
          <FilterSection title="Home / Away">
            <Checkbox
              checked={filters.showHome}
              onChange={v => set('showHome', v)}
              label="Home Games"
              color={GREEN}
            />
            <Checkbox
              checked={filters.showAway}
              onChange={v => set('showAway', v)}
              label="Away Games"
              color='#94a3b8'
            />
          </FilterSection>

          {/* Favorite / Underdog */}
          <FilterSection title="Fav / Underdog">
            <Checkbox
              checked={filters.showFavorite}
              onChange={v => set('showFavorite', v)}
              label="As Favorite"
              color='#eab308'
            />
            <Checkbox
              checked={filters.showUnderdog}
              onChange={v => set('showUnderdog', v)}
              label="As Underdog"
              color='#f97316'
            />
          </FilterSection>

          {/* Division */}
          <FilterSection title="Opponent">
            <Checkbox
              checked={filters.divisionOnly}
              onChange={v => set('divisionOnly', v)}
              label="Division Games Only"
              color='#8b5cf6'
            />
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.06em', lineHeight: 1.5, marginTop: 2 }}>
              Filter to rivalry &amp; divisional matchups
            </div>
          </FilterSection>

          {/* Over / Under */}
          <FilterSection title="Over / Under">
            <Checkbox
              checked={filters.showOver}
              onChange={v => set('showOver', v)}
              label="Over Results"
              color='#8b5cf6'
            />
            <Checkbox
              checked={filters.showUnder}
              onChange={v => set('showUnder', v)}
              label="Under Results"
              color='#b45309'
            />
          </FilterSection>

          {/* Rest Days */}
          <FilterSection title="Rest Days">
            <RadioRow value="all"  current={filters.restDays} onChange={v => set('restDays', v)} label="All Games" />
            <RadioRow value="b2b"  current={filters.restDays} onChange={v => set('restDays', v)} label="Back-to-Back (0 rest)" />
            <RadioRow value="1+"   current={filters.restDays} onChange={v => set('restDays', v)} label="1+ Day Rest" />
            <RadioRow value="2+"   current={filters.restDays} onChange={v => set('restDays', v)} label="2+ Days Rest" />
            <RadioRow value="3+"   current={filters.restDays} onChange={v => set('restDays', v)} label="3+ Days Rest" />
          </FilterSection>

        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 8, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>
              Applied:
            </span>
            {buildChips(filters).map(chip => (
              <div key={chip} style={{
                background: `${GREEN}11`, border: `1px solid ${GREEN}33`,
                borderRadius: 4, padding: '2px 9px',
                fontSize: 9, color: GREEN, letterSpacing: '0.08em', fontWeight: 600,
              }}>
                {chip}
              </div>
            ))}
            <button
              onClick={resetFilters}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 9, color: '#ef444488', letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: 'inherit', padding: '2px 6px', textDecoration: 'underline',
              }}
            >
              Clear All
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function buildChips(f: Filters): string[] {
  const chips: string[] = []
  if (f.showHome  && !f.showAway)     chips.push('Home Only')
  if (!f.showHome && f.showAway)      chips.push('Away Only')
  if (!f.showHome && !f.showAway)     chips.push('No Location')
  if (f.showFavorite && !f.showUnderdog)  chips.push('Favorites Only')
  if (!f.showFavorite && f.showUnderdog)  chips.push('Underdogs Only')
  if (!f.showFavorite && !f.showUnderdog) chips.push('No Role Filter')
  if (f.divisionOnly)                 chips.push('Division Only')
  if (f.restDays === 'b2b')           chips.push('Back-to-Back')
  if (f.restDays === '1+')            chips.push('1+ Day Rest')
  if (f.restDays === '2+')            chips.push('2+ Days Rest')
  if (f.restDays === '3+')            chips.push('3+ Days Rest')
  if (f.showOver  && !f.showUnder)    chips.push('Over Only')
  if (!f.showOver && f.showUnder)     chips.push('Under Only')
  if (!f.showOver && !f.showUnder)    chips.push('No O/U')
  return chips
}
