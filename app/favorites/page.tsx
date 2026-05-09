'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { generateMockGames } from '@/lib/leagues-data'
import type { GameEntry } from '@/lib/leagues-data'
import {
  Favorite, BetType, BET_TYPE_LABELS, BET_TYPE_ACCENTS,
  fetchFavorites, addFavorite, removeFavorite, reorderFavorites,
} from '@/lib/favorites'

// ─── Palette ──────────────────────────────────────────────────────────────────

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const GREEN  = '#22c55e'
const PURPLE = '#8b5cf6'
const GOLD   = '#eab308'

const C = {
  green: '#22c55e', red: '#ef4444', white: '#f4f4f5',
  gold: '#eab308', orange: '#f97316', royal: '#2563eb',
  purple: '#9333ea', teal: '#14b8a6', silver: '#94a3b8',
  violet: '#8b5cf6', brown: '#b45309', empty: '#131318',
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortMode = 'selected' | 'az' | 'za' | 'wtl' | 'ltw' | 'league'

const SORT_LABELS: Record<SortMode, string> = {
  selected: 'Selected',
  az:       'A-Z',
  za:       'Z-A',
  wtl:      'W → L',
  ltw:      'L → W',
  league:   'League A-Z',
}
const SORT_LS_KEY = 'gambchop-favorites-sort'

// ─── Record helpers ───────────────────────────────────────────────────────────

function getRecord(games: GameEntry[], bt: BetType): { w: number; l: number } {
  const ml  = (g: GameEntry[]) => ({ w: g.filter(x => x.moneylineResult === 'win').length, l: g.filter(x => x.moneylineResult === 'loss').length })
  const sp  = (g: GameEntry[]) => ({ w: g.filter(x => x.spreadResult   === 'win').length, l: g.filter(x => x.spreadResult   === 'loss').length })
  switch (bt) {
    case 'moneyline':       return ml(games)
    case 'spread':          return sp(games)
    case 'ml_favorite':     return ml(games.filter(g => g.isFavorite))
    case 'ml_underdog':     return ml(games.filter(g => !g.isFavorite))
    case 'spread_favorite': return sp(games.filter(g => g.isSpreadFavorite))
    case 'spread_dog':      return sp(games.filter(g => !g.isSpreadFavorite))
    case 'home':            return ml(games.filter(g => g.isHome))
    case 'away':            return ml(games.filter(g => !g.isHome))
    case 'over_under':      return {
      w: games.filter(g => g.ouResult === 'over').length,
      l: games.filter(g => g.ouResult === 'under').length,
    }
  }
}

function winRate(games: GameEntry[], bt: BetType): number {
  const r = getRecord(games, bt)
  const t = r.w + r.l
  return t === 0 ? 0 : r.w / t
}

// ─── Cell rendering ───────────────────────────────────────────────────────────

type CellInfo = { bg: string; label?: string; textColor?: string; glow?: string; opacity?: number }

function getCellInfo(game: GameEntry, bt: BetType): CellInfo {
  const empty = { bg: C.empty, opacity: 0.3 }
  const dim   = { bg: C.empty, opacity: 0.12 }

  const wlp = (result: 'win' | 'loss' | 'push' | null, wL = 'W', lL = 'L'): CellInfo => {
    if (!result)           return empty
    if (result === 'win')  return { bg: C.green,  label: wL, textColor: '#000', glow: `0 0 12px ${C.green}80`  }
    if (result === 'loss') return { bg: C.red,    label: lL, textColor: '#fff', glow: `0 0 12px ${C.red}80`    }
    return                        { bg: C.white,  label: 'P', textColor: '#111' }
  }

  const pill = (active: boolean | null, color: string): CellInfo => {
    if (active === null) return empty
    return active ? { bg: color, glow: `0 0 10px ${color}80` } : dim
  }

  const hasML = game.moneylineResult !== null
  const hasSP = game.spreadResult    !== null

  switch (bt) {
    case 'moneyline':       return wlp(game.moneylineResult)
    case 'spread':          return wlp(game.spreadResult, 'COV', 'MIS')
    case 'ml_favorite':     return pill(hasML ? game.isFavorite       : null, C.gold)
    case 'ml_underdog':     return pill(hasML ? !game.isFavorite      : null, C.orange)
    case 'spread_favorite': return pill(hasSP ? game.isSpreadFavorite : null, C.royal)
    case 'spread_dog':      return pill(hasSP ? !game.isSpreadFavorite : null, C.purple)
    case 'home':            return pill(hasML ? game.isHome            : null, C.teal)
    case 'away':            return pill(hasML ? !game.isHome           : null, C.silver)
    case 'over_under': {
      if (!game.ouResult) return empty
      if (game.ouResult === 'over')  return { bg: C.violet, glow: `0 0 14px ${C.violet}90` }
      if (game.ouResult === 'under') return { bg: C.brown,  glow: `0 0 14px ${C.brown}90`  }
      return { bg: C.white, label: 'P', textColor: '#111' }
    }
  }
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const LABEL_W  = 268
const COL_W    = 52
const FREE_COLS = 3
const DATES    = ['G1','G2','G3','G4','G5','G6','G7','G8','G9','G10']

// ─── Date header ──────────────────────────────────────────────────────────────

function DateHeader({ visibleCols }: { visibleCols: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: `1px solid ${BORDER}`, padding: '10px 0 6px', background: BG }}>
      <div style={{ width: 36, minWidth: 36, flexShrink: 0 }} /> {/* arrows gutter */}
      <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, paddingLeft: 12 }}>
        <span style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Team / Metric</span>
      </div>
      {DATES.map((d, i) => (
        <div key={d} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, textAlign: 'center', position: 'relative' }}>
          <span style={{ fontSize: 10, color: i < visibleCols ? '#52525b' : '#2a2a34', letterSpacing: '0.12em', fontWeight: 600 }}>{d}</span>
          {i === visibleCols && (
            <div style={{ position: 'absolute', top: -2, left: 0, width: 1, height: 26, background: `${PURPLE}55` }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Favorite row ─────────────────────────────────────────────────────────────

function FavoriteRow({
  fav, idx, total, visibleCols, onRemove, onMoveUp, onMoveDown,
}: {
  fav:         Favorite
  idx:         number
  total:       number
  visibleCols: number
  onRemove:    () => void
  onMoveUp:    () => void
  onMoveDown:  () => void
}) {
  const games   = useMemo(() => generateMockGames(fav.team_name, 10), [fav.team_name])
  const record  = getRecord(games, fav.bet_type)
  const accent  = BET_TYPE_ACCENTS[fav.bet_type]
  const rowBg   = idx % 2 === 0 ? BG : '#0d0d14'
  const wlColor = record.w > record.l ? C.green : record.w < record.l ? C.red : '#52525b'

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: rowBg }}>

      {/* ── Reorder arrows (outside scroll) ── */}
      <div style={{
        width: 36, minWidth: 36, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 1, background: rowBg,
      }}>
        <button
          onClick={onMoveUp} disabled={idx === 0}
          title="Move up"
          style={{
            background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer',
            color: idx === 0 ? '#2a2a34' : MUTED, fontSize: 8, padding: '1px 4px', lineHeight: 1,
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >▲</button>
        <button
          onClick={onMoveDown} disabled={idx === total - 1}
          title="Move down"
          style={{
            background: 'none', border: 'none', cursor: idx === total - 1 ? 'default' : 'pointer',
            color: idx === total - 1 ? '#2a2a34' : MUTED, fontSize: 8, padding: '1px 4px', lineHeight: 1,
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >▼</button>
      </div>

      {/* ── Sticky label column ── */}
      <div style={{
        width: LABEL_W, minWidth: LABEL_W, flexShrink: 0,
        position: 'sticky', left: 36, zIndex: 10, background: rowBg,
        height: 38, display: 'flex', alignItems: 'center', paddingLeft: 2, paddingRight: 6,
      }}>
        {/* Accent bar */}
        <div style={{ width: 2, height: 14, background: accent, borderRadius: 2, marginRight: 8, flexShrink: 0, opacity: 0.85 }} />

        {/* Team + league + bet type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 128 }}>
              {fav.team_name.split(' ').slice(-1)[0]}
            </span>
            <span style={{ fontSize: 7, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>
              {fav.league_id.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 8, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {BET_TYPE_LABELS[fav.bet_type]}
            </span>
            <span style={{ fontSize: 9, color: wlColor, fontWeight: 700, fontFamily: 'monospace' }}>
              {record.w}-{record.l}
            </span>
          </div>
        </div>

        {/* Remove star */}
        <button
          onClick={onRemove}
          title="Remove from favorites"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: GOLD, padding: '0 2px', lineHeight: 1, flexShrink: 0,
            transition: 'opacity 0.15s',
          }}
        >★</button>
      </div>

      {/* ── Game cells ── */}
      {games.map((game, gi) => {
        const locked = gi >= visibleCols
        const cell   = getCellInfo(game, fav.bet_type)
        return (
          <div
            key={gi}
            style={{
              width: COL_W, minWidth: COL_W, flexShrink: 0, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: rowBg,
              filter:  locked ? 'blur(4px)' : 'none',
              opacity: locked ? 0.3 : (cell.opacity ?? 1),
              pointerEvents: locked ? 'none' : 'auto',
              transition: 'opacity 0.2s, filter 0.2s',
            }}
          >
            <div style={{
              width: COL_W - 8, height: 28, borderRadius: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cell.bg,
              boxShadow: cell.glow,
              fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
              color: cell.textColor,
            }}>
              {cell.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Login gate ───────────────────────────────────────────────────────────────

function LoginGate() {
  const { openModal } = useAuth()
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Favorites
        </h1>
        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.8, margin: '0 0 28px', fontFamily: 'var(--font-geist-mono), monospace' }}>
          Track any team × bet type combination across all supported leagues.
          Sign in to get started.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => openModal('join')}
            style={{
              background: `linear-gradient(135deg, ${GREEN}, #16a34a)`, border: 'none', borderRadius: 8,
              color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer', padding: '12px 24px', fontFamily: 'var(--font-geist-mono), monospace',
              boxShadow: `0 0 20px ${GREEN}35`,
            }}
          >
            Join Free
          </button>
          <button
            onClick={() => openModal('login')}
            style={{
              background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8,
              color: SUB, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer', padding: '12px 24px', fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const { user, isMember, isPro, memberTier, loading: authLoading, openModal } = useAuth()

  const [mounted,    setMounted]    = useState(false)
  const [favorites,  setFavorites]  = useState<Favorite[]>([])
  const [loading,    setLoading]    = useState(true)
  const [sortMode,   setSortMode]   = useState<SortMode>('selected')
  const [toast,      setToast]      = useState<string | null>(null)

  const visibleCols = isPro ? 10 : FREE_COLS

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(SORT_LS_KEY) as SortMode | null
    if (saved && saved in SORT_LABELS) setSortMode(saved)
  }, [])

  const loadFavorites = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    const data = await fetchFavorites(user.id)
    setFavorites(data)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (mounted && !authLoading) loadFavorites()
  }, [mounted, authLoading, loadFavorites])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode)
    localStorage.setItem(SORT_LS_KEY, mode)
  }

  const handleRemove = async (fav: Favorite) => {
    const ok = await removeFavorite(fav.id)
    if (ok) setFavorites(prev => prev.filter(f => f.id !== fav.id))
  }

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return
    const next = [...favorites]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setFavorites(next)
    await reorderFavorites(next.map(f => f.id))
  }

  const handleMoveDown = async (idx: number) => {
    if (idx === favorites.length - 1) return
    const next = [...favorites]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setFavorites(next)
    await reorderFavorites(next.map(f => f.id))
  }

  // Sort favorites for display (only affects render order, not DB order for "selected")
  const displayFavorites = useMemo(() => {
    if (sortMode === 'selected') return favorites
    const withGames = favorites.map(f => ({
      fav: f,
      games: generateMockGames(f.team_name, 10),
    }))
    switch (sortMode) {
      case 'az':     return withGames.sort((a, b) => a.fav.team_name.localeCompare(b.fav.team_name)).map(x => x.fav)
      case 'za':     return withGames.sort((a, b) => b.fav.team_name.localeCompare(a.fav.team_name)).map(x => x.fav)
      case 'wtl':    return withGames.sort((a, b) => winRate(b.games, b.fav.bet_type) - winRate(a.games, a.fav.bet_type)).map(x => x.fav)
      case 'ltw':    return withGames.sort((a, b) => winRate(a.games, a.fav.bet_type) - winRate(b.games, b.fav.bet_type)).map(x => x.fav)
      case 'league': return withGames.sort((a, b) => a.fav.league_name.localeCompare(b.fav.league_name)).map(x => x.fav)
      default:       return favorites
    }
  }, [favorites, sortMode])

  if (!mounted || authLoading) return null

  if (!isMember) return (
    <div style={{ paddingLeft: 80, paddingTop: 80, minHeight: '100vh', background: BG, fontFamily: 'var(--font-geist-mono), monospace' }}>
      <LoginGate />
    </div>
  )

  return (
    <div style={{
      paddingLeft: 80, paddingTop: 80, paddingRight: 0, paddingBottom: 56,
      minHeight: '100vh', background: BG,
      fontFamily: 'var(--font-geist-mono), monospace',
    }}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 8, color: PURPLE, letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            {isPro ? '⚡ Pro Feature' : 'Member Feature'}
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 900, margin: 0, lineHeight: 1,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            background: `linear-gradient(135deg, ${TEXT} 40%, ${PURPLE})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Favorites
          </h1>
          <p style={{ fontSize: 10, color: MUTED, marginTop: 8, marginBottom: 0 }}>
            Track any team × bet type across all leagues.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Cap indicator */}
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
            padding: '8px 14px', fontSize: 10, color: favorites.length >= 16 ? '#ef4444' : SUB,
            fontFamily: 'var(--font-geist-mono), monospace',
          }}>
            {favorites.length} <span style={{ color: MUTED }}>/</span> 16
          </div>

          {/* Sort dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em' }}>Sort:</span>
            <select
              value={sortMode}
              onChange={e => handleSortChange(e.target.value as SortMode)}
              style={{
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
                color: SUB, fontSize: 10, padding: '7px 10px',
                fontFamily: 'var(--font-geist-mono), monospace',
                cursor: 'pointer', outline: 'none',
              }}
            >
              {(Object.keys(SORT_LABELS) as SortMode[]).map(k => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>

          {/* Browse Teams link */}
          <Link href="/teams" style={{
            textDecoration: 'none', fontSize: 10, fontWeight: 700,
            color: GREEN, border: `1px solid ${GREEN}44`, borderRadius: 8,
            padding: '8px 16px', letterSpacing: '0.1em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            + Browse Teams
          </Link>
        </div>
      </div>

      {/* ─── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a24', border: `1px solid ${BORDER}`, borderRadius: 10,
          padding: '12px 24px', fontSize: 11, color: SUB,
          zIndex: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {/* ─── Free-tier upgrade banner ────────────────────────────────────── */}
      {!isPro && (
        <div style={{
          margin: '0 24px 20px',
          background: `${PURPLE}0a`, border: `1px solid ${PURPLE}33`, borderRadius: 10,
          padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, color: '#c4b5fd', letterSpacing: '0.06em' }}>
            Free plan shows G1-G3 only. Go Pro to unlock the full 10-game history.
          </span>
          <button
            onClick={() => openModal('pro')}
            style={{
              background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, border: 'none', borderRadius: 7,
              color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer', padding: '9px 18px', fontFamily: 'var(--font-geist-mono), monospace',
              boxShadow: `0 0 16px ${PURPLE}44`, whiteSpace: 'nowrap',
            }}
          >
            🔒 Go Pro
          </button>
        </div>
      )}

      {/* ─── Chart area ─────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.1em' }}>
          Loading favorites…
        </div>
      ) : favorites.length === 0 ? (
        // Empty state
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            No favorites yet
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 28 }}>
            Add any team × bet type combination from any team page
          </div>
          <Link href="/teams" style={{
            textDecoration: 'none',
            background: `linear-gradient(135deg, ${GREEN}, #16a34a)`, borderRadius: 8,
            color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '13px 28px', display: 'inline-block',
          }}>
            Browse Teams →
          </Link>
        </div>
      ) : (
        // Chart grid
        <div style={{ overflowX: 'auto', paddingBottom: 24, paddingLeft: 0, paddingRight: 0 }}>
          <div style={{ minWidth: 36 + LABEL_W + DATES.length * COL_W + 8, position: 'relative' }}>

            {/* Date header */}
            <DateHeader visibleCols={visibleCols} />

            {/* Rows */}
            {displayFavorites.map((fav, idx) => (
              <FavoriteRow
                key={fav.id}
                fav={fav}
                idx={idx}
                total={displayFavorites.length}
                visibleCols={visibleCols}
                onRemove={() => handleRemove(fav)}
                onMoveUp={() => {
                  const realIdx = favorites.findIndex(f => f.id === fav.id)
                  handleMoveUp(realIdx)
                }}
                onMoveDown={() => {
                  const realIdx = favorites.findIndex(f => f.id === fav.id)
                  handleMoveDown(realIdx)
                }}
              />
            ))}

            {/* Pro upgrade overlay over locked columns */}
            {!isPro && DATES.length > FREE_COLS && (
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: 36 + LABEL_W + FREE_COLS * COL_W, right: 0,
                pointerEvents: 'none',
                background: `linear-gradient(to right, transparent 0%, ${BG}88 20%, ${BG}cc 60%, ${BG} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                zIndex: 5,
              }}>
                <div style={{ pointerEvents: 'all', textAlign: 'center', padding: '12px 20px', marginRight: 8 }}>
                  <button
                    onClick={() => openModal('pro')}
                    style={{
                      background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, border: 'none', borderRadius: 8,
                      padding: '10px 18px', color: '#fff', fontSize: 10, fontWeight: 900,
                      letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                      boxShadow: `0 0 20px ${PURPLE}50`, fontFamily: 'var(--font-geist-mono), monospace',
                    }}
                  >
                    🔒 Go Pro — Full Season
                  </button>
                  <p style={{ fontSize: 9, color: MUTED, marginTop: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Free: G1-G{FREE_COLS} only
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
