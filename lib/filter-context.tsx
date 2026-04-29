'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { GameEntry } from './leagues-data'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Filters {
  showHome:      boolean
  showAway:      boolean
  showFavorite:  boolean
  showUnderdog:  boolean
  divisionOnly:  boolean
  restDays:      'all' | 'b2b' | '1+' | '2+' | '3+'
  showOver:      boolean
  showUnder:     boolean
}

export const DEFAULT_FILTERS: Filters = {
  showHome:     true,
  showAway:     true,
  showFavorite: true,
  showUnderdog: true,
  divisionOnly: false,
  restDays:     'all',
  showOver:     true,
  showUnder:    true,
}

export interface FilterContextValue {
  filters: Filters
  setFilters: (f: Filters) => void
  resetFilters: () => void
  isFiltered: boolean
  activeCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function gameMatchesFilter(game: GameEntry, f: Filters): boolean {
  if (game.isHome  && !f.showHome)     return false
  if (!game.isHome && !f.showAway)     return false
  if (game.isFavorite  && !f.showFavorite)  return false
  if (!game.isFavorite && !f.showUnderdog)  return false
  if (f.divisionOnly && !game.isDivisionGame) return false
  if (f.restDays === 'b2b' && game.restDays !== 0)  return false
  if (f.restDays === '1+'  && game.restDays < 1)     return false
  if (f.restDays === '2+'  && game.restDays < 2)     return false
  if (f.restDays === '3+'  && game.restDays < 3)     return false
  if (game.ouResult === 'over'  && !f.showOver)  return false
  if (game.ouResult === 'under' && !f.showUnder) return false
  return true
}

export function countActiveFilters(f: Filters): number {
  let n = 0
  if (!f.showHome || !f.showAway)         n++
  if (!f.showFavorite || !f.showUnderdog) n++
  if (f.divisionOnly)                     n++
  if (f.restDays !== 'all')               n++
  if (!f.showOver || !f.showUnder)        n++
  return n
}

export function filterChips(f: Filters): string[] {
  const chips: string[] = []
  if (f.showHome && !f.showAway)     chips.push('Home Only')
  if (!f.showHome && f.showAway)     chips.push('Away Only')
  if (!f.showHome && !f.showAway)    chips.push('No Home/Away')
  if (f.showFavorite && !f.showUnderdog)  chips.push('Favorites Only')
  if (!f.showFavorite && f.showUnderdog)  chips.push('Underdogs Only')
  if (!f.showFavorite && !f.showUnderdog) chips.push('No Fav/Dog')
  if (f.divisionOnly)                chips.push('Division Only')
  if (f.restDays === 'b2b')          chips.push('Back-to-Back')
  if (f.restDays === '1+')           chips.push('1+ Day Rest')
  if (f.restDays === '2+')           chips.push('2+ Days Rest')
  if (f.restDays === '3+')           chips.push('3+ Days Rest')
  if (f.showOver && !f.showUnder)    chips.push('Over Only')
  if (!f.showOver && f.showUnder)    chips.push('Under Only')
  if (!f.showOver && !f.showUnder)   chips.push('No O/U')
  return chips
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FilterContext = createContext<FilterContextValue>({
  filters:     DEFAULT_FILTERS,
  setFilters:  () => {},
  resetFilters: () => {},
  isFiltered:  false,
  activeCount: 0,
})

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS)

  const setFilters = (f: Filters) => setFiltersState(f)
  const resetFilters = () => setFiltersState(DEFAULT_FILTERS)
  const activeCount = countActiveFilters(filters)
  const isFiltered = activeCount > 0

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters, isFiltered, activeCount }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  return useContext(FilterContext)
}
