'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisibleRows {
  moneyline:       boolean
  spread:          boolean
  ml_favorite:     boolean
  ml_underdog:     boolean
  spread_favorite: boolean
  spread_dog:      boolean
  home:            boolean
  away:            boolean
  over_under:      boolean
}

export const ROW_LABELS: Record<keyof VisibleRows, string> = {
  moneyline:       'Moneyline',
  spread:          'Spread',
  ml_favorite:     'ML Favorite',
  ml_underdog:     'ML Underdog',
  spread_favorite: 'Spread Favorite',
  spread_dog:      'Spread Dog',
  home:            'Home',
  away:            'Away',
  over_under:      'Over / Under',
}

export const DEFAULT_VISIBLE_ROWS: VisibleRows = {
  moneyline:       true,
  spread:          true,
  ml_favorite:     true,
  ml_underdog:     true,
  spread_favorite: true,
  spread_dog:      true,
  home:            true,
  away:            true,
  over_under:      true,
}

const LS_KEY = 'gambchop-row-visibility'

// ─── Context value ────────────────────────────────────────────────────────────

export interface FilterContextValue {
  visibleRows:    VisibleRows
  setVisibleRows: (v: VisibleRows) => void
  resetFilters:   () => void
  isFiltered:     boolean
  activeCount:    number                                // rows currently hidden
  filterChips:    Array<{ key: keyof VisibleRows; label: string }>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FilterContext = createContext<FilterContextValue>({
  visibleRows:    DEFAULT_VISIBLE_ROWS,
  setVisibleRows: () => {},
  resetFilters:   () => {},
  isFiltered:     false,
  activeCount:    0,
  filterChips:    [],
})

export function FilterProvider({ children }: { children: ReactNode }) {
  const [visibleRows, setVisibleRowsState] = useState<VisibleRows>(DEFAULT_VISIBLE_ROWS)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<VisibleRows>
        setVisibleRowsState({ ...DEFAULT_VISIBLE_ROWS, ...parsed })
      }
    } catch {}
  }, [])

  const setVisibleRows = (v: VisibleRows) => {
    setVisibleRowsState(v)
    try { localStorage.setItem(LS_KEY, JSON.stringify(v)) } catch {}
  }

  const resetFilters = () => setVisibleRows(DEFAULT_VISIBLE_ROWS)

  const hiddenKeys = (Object.keys(visibleRows) as Array<keyof VisibleRows>).filter(k => !visibleRows[k])
  const activeCount = hiddenKeys.length
  const isFiltered  = activeCount > 0
  const filterChips = hiddenKeys.map(k => ({ key: k, label: ROW_LABELS[k] }))

  return (
    <FilterContext.Provider value={{ visibleRows, setVisibleRows, resetFilters, isFiltered, activeCount, filterChips }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  return useContext(FilterContext)
}
