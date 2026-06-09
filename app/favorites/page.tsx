'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { slugify } from '@/lib/leagues-data'
import type { GameEntry, BetResult } from '@/lib/leagues-data'
import { fetchTeamOutcomesByMonth, fetchTeamSeasonOutcomes, computeStreak } from '@/lib/chart-data'
import ChartLegend from '@/components/ChartLegend'
import {
  Favorite, BetType, BET_TYPE_LABELS, BET_TYPE_ACCENTS,
  fetchFavorites, removeFavorite, reorderFavorites,
} from '@/lib/favorites'
import {
  FavoriteCard, FavoriteCardRow, CardSlot,
  fetchCards, ensureCard, updateCardName, addRowToCard, removeRowFromCard, setRowInChop,
} from '@/lib/favorite-cards'
import { TEAM_COLORS } from '@/lib/teamColors'

// ─── Palette ──────────────────────────────────────────────────────────────────

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const GREEN  = '#22c55e'
const PURPLE = '#8b5cf6'
const AMBER  = '#f59e0b'

const C = {
  green:  '#22c55e', red:    '#ef4444', gold:   '#eab308', orange: '#f97316',
  royal:  '#2563eb', purple: '#9333ea', teal:   '#14b8a6', silver: '#94a3b8',
  violet: '#8b5cf6', brown:  '#b45309', white:  '#f4f4f5', empty:  '#131318',
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const TOTAL_LABEL_W   = 256
const COL_W           = 40
const SCROLL_WEEK     = 7 * COL_W
const FREE_COLS       = 3
const DOW             = ['S','M','T','W','T','F','S']
const MONTH_NAMES     = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const MAX_CARD_ROWS   = 32
const MAX_CHOP        = 16
const DEFAULT_CARD_NAME = 'My Favorites'

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortMode = 'selected' | 'az' | 'za' | 'wtl' | 'ltw' | 'league'

const SORT_LABELS: Record<SortMode, string> = {
  selected: 'Selected', az: 'A-Z', za: 'Z-A',
  wtl: 'W → L', ltw: 'L → W', league: 'League A-Z',
}
const SORT_LS_KEY = 'gambchop-favorites-sort'

// ─── Record helpers ───────────────────────────────────────────────────────────

function mlRec(g: GameEntry[]) {
  return { w: g.filter(x => x.moneylineResult === 'win').length, l: g.filter(x => x.moneylineResult === 'loss').length }
}
function spRec(g: GameEntry[]) {
  return { w: g.filter(x => x.spreadResult === 'win').length, l: g.filter(x => x.spreadResult === 'loss').length }
}

function getRecord(games: GameEntry[], bt: BetType): { w: number; l: number } {
  switch (bt) {
    case 'moneyline':       return mlRec(games)
    case 'spread':          return spRec(games)
    case 'ml_favorite':     return mlRec(games.filter(g =>  g.isFavorite))
    case 'ml_underdog':     return mlRec(games.filter(g => !g.isFavorite))
    case 'spread_favorite': return spRec(games.filter(g =>  g.isSpreadFavorite))
    case 'spread_dog':      return spRec(games.filter(g => !g.isSpreadFavorite))
    case 'home':            return mlRec(games.filter(g =>  g.isHome))
    case 'away':            return mlRec(games.filter(g => !g.isHome))
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

// ─── cardRowToFav ─────────────────────────────────────────────────────────────

function cardRowToFav(row: FavoriteCardRow): Favorite {
  return {
    id:            row.id,
    user_id:       row.user_id,
    team_name:     row.team_name,
    league_id:     (row.league_name ?? '').toLowerCase(),
    league_name:   row.league_name ?? '',
    bet_type:      row.bet_type as BetType,
    display_order: row.display_order,
    created_at:    row.created_at,
  }
}

// ─── Cell components ──────────────────────────────────────────────────────────

function WLCell({ result, winLabel = 'W', lossLabel = 'L' }: { result: BetResult; winLabel?: string; lossLabel?: string }) {
  if (!result) return <div className="fav-cell" style={{ background: C.empty, opacity: 0.3 }} />
  const s = {
    win:  { bg: C.green, color: '#000', glow: `0 0 12px ${C.green}80`, label: winLabel  },
    loss: { bg: C.red,   color: '#fff', glow: `0 0 12px ${C.red}80`,   label: lossLabel },
    push: { bg: C.white, color: '#111', glow: 'none',                   label: 'P'       },
  }[result]
  return <div className="fav-cell" style={{ background: s.bg, color: s.color, boxShadow: s.glow, fontWeight: 800, fontSize: result === 'push' ? 10 : 11 }}>{s.label}</div>
}

function ConditionCell({ active, result, color, glow }: { active: boolean; result: BetResult; color: string; glow: string }) {
  if (!active) return <div className="fav-cell" style={{ background: C.empty }} />
  if (!result) return <div className="fav-cell" style={{ background: C.empty, opacity: 0.3 }} />
  if (result === 'push') return <div className="fav-cell" style={{ background: C.white, color: '#111', fontWeight: 800, fontSize: 10 }}>P</div>
  const won = result === 'win'
  return (
    <div className="fav-cell" style={{
      background: won ? color : C.red, color: won ? '#000' : '#fff',
      boxShadow: won ? glow : `0 0 12px ${C.red}80`, fontWeight: 800, fontSize: 11,
    }}>
      {won ? 'W' : 'L'}
    </div>
  )
}

function OUCell({ r }: { r: 'over' | 'under' | 'push' | null }) {
  if (!r) return <div className="fav-cell" style={{ background: C.empty, opacity: 0.3 }} />
  const s = {
    over:  { bg: C.violet, glow: `0 0 14px ${C.violet}90` },
    under: { bg: C.brown,  glow: `0 0 14px ${C.brown}90`  },
    push:  { bg: C.white,  glow: 'none' },
  }[r]
  return <div className="fav-cell" style={{ background: s.bg, boxShadow: s.glow }} />
}

function GameCell({ bt, game }: { bt: BetType; game: GameEntry }) {
  switch (bt) {
    case 'moneyline':       return <WLCell result={game.moneylineResult} />
    case 'spread':          return <WLCell result={game.spreadResult} winLabel="COV" lossLabel="L" />
    case 'ml_favorite':     return <ConditionCell active={game.isFavorite}        result={game.moneylineResult} color={C.gold}   glow={`0 0 10px ${C.gold}80`}   />
    case 'ml_underdog':     return <ConditionCell active={!game.isFavorite}       result={game.moneylineResult} color={C.orange} glow={`0 0 10px ${C.orange}80`} />
    case 'spread_favorite': return <ConditionCell active={game.isSpreadFavorite}  result={game.spreadResult}    color={C.royal}  glow={`0 0 10px ${C.royal}80`}  />
    case 'spread_dog':      return <ConditionCell active={!game.isSpreadFavorite} result={game.spreadResult}    color={C.purple} glow={`0 0 10px ${C.purple}80`} />
    case 'home':            return <ConditionCell active={game.isHome}            result={game.moneylineResult} color={C.teal}   glow={`0 0 10px ${C.teal}80`}   />
    case 'away':            return <ConditionCell active={!game.isHome}           result={game.moneylineResult} color={C.silver} glow={`0 0 10px ${C.silver}60`}  />
    case 'over_under':      return <OUCell r={game.ouResult} />
  }
}

function DHCell({ bt, g1, g2 }: { bt: BetType; g1: GameEntry; g2: GameEntry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 34, margin: '0 3px', gap: 1, borderRadius: 5, overflow: 'hidden' }}>
      <div className="fav-cell-half"><GameCell bt={bt} game={g1} /></div>
      <div className="fav-cell-half"><GameCell bt={bt} game={g2} /></div>
    </div>
  )
}

// ─── DateHeader ───────────────────────────────────────────────────────────────

function DateHeader({ year, month, daysInMonth, populatedDays }: {
  year: number; month: number; daysInMonth: number; populatedDays: Set<number>
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: `1px solid ${BORDER}`, padding: '8px 0 6px', background: BG }}>
      <div style={{ width: TOTAL_LABEL_W, minWidth: TOTAL_LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: BG, paddingLeft: 46, zIndex: 20 }}>
        <span style={{ fontSize: 9, color: '#ffffff', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Team / Metric</span>
      </div>
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const dow = new Date(year, month - 1, day).getDay()
        const hasGame = populatedDays.has(day)
        return (
          <div key={day} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 7, color: '#2a2a34' }}>{DOW[dow]}</span>
            <span style={{ fontSize: 8, color: hasGame ? '#d4d4d8' : '#2a2a34', fontWeight: hasGame ? 700 : 400 }}>
              {month}/{day}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── MonthNav ─────────────────────────────────────────────────────────────────

function MonthNav({ year, month, onPrev, onNext, canPrev, canNext }: {
  year: number; month: number
  onPrev: () => void; onNext: () => void
  canPrev: boolean; canNext: boolean
}) {
  const btn: React.CSSProperties = {
    background: 'none', border: `1px solid ${BORDER}`, borderRadius: 5,
    color: SUB, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, lineHeight: '1', padding: '4px 10px',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '10px 20px 8px', borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={onPrev} disabled={!canPrev} style={{ ...btn, opacity: canPrev ? 1 : 0.25, cursor: canPrev ? 'pointer' : 'default' }}>←</button>
      <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.18em', minWidth: 90, textAlign: 'center' }}>
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button onClick={onNext} disabled={!canNext} style={{ ...btn, opacity: canNext ? 1 : 0.25, cursor: canNext ? 'pointer' : 'default' }}>→</button>
    </div>
  )
}

// ─── ScrollArrow ──────────────────────────────────────────────────────────────

function ScrollArrow({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      className="fav-scroll-arrow"
      onClick={onClick}
      aria-label={dir === 'left' ? 'Scroll left one week' : 'Scroll right one week'}
      style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        ...(dir === 'left' ? { left: TOTAL_LABEL_W + 8 } : { right: 8 }),
        zIndex: 30, width: 34, height: 34, borderRadius: '50%', padding: 0,
        border: `1px solid ${C.green}55`, background: '#0c0c12ee',
        color: C.green, fontSize: 22, lineHeight: '1', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)', fontFamily: 'inherit',
        boxShadow: '0 0 12px #00000088',
      }}
    >
      {dir === 'left' ? '‹' : '›'}
    </button>
  )
}

// ─── FavoriteRow ──────────────────────────────────────────────────────────────

function FavoriteRow({
  fav, idx, total, games, seasonGames, daysInMonth, month, isPro,
  onRemove, onMoveUp, onMoveDown,
}: {
  fav:         Favorite
  idx:         number
  total:       number
  games:       GameEntry[]
  seasonGames: GameEntry[]
  daysInMonth: number
  month:       number
  isPro:       boolean
  onRemove:    () => void
  onMoveUp:    () => void
  onMoveDown:  () => void
}) {
  const dayMap = useMemo(() => {
    const m = new Map<number, GameEntry[]>()
    for (const g of games) {
      const day = parseInt(g.rawDate.split('-')[2] ?? '0', 10)
      if (day > 0) {
        if (!m.has(day)) m.set(day, [])
        m.get(day)!.push(g)
      }
    }
    return m
  }, [games])

  const populatedDays = useMemo(
    () => Array.from(dayMap.keys()).sort((a, b) => a - b),
    [dayMap],
  )

  const visibleDaySet = useMemo(
    () => isPro ? new Set(populatedDays) : new Set(populatedDays.slice(-FREE_COLS)),
    [isPro, populatedDays],
  )

  const record  = getRecord(seasonGames, fav.bet_type)
  const accent  = BET_TYPE_ACCENTS[fav.bet_type]
  const rowBg   = idx % 2 === 0 ? BG : '#0d0d14'
  const wlColor = record.w > record.l ? C.green : record.w < record.l ? C.red : MUTED

  const streakMetric: 'moneyline' | 'spread' | 'over_under' | null =
    fav.bet_type === 'moneyline' ? 'moneyline'
    : fav.bet_type === 'spread'  ? 'spread'
    : fav.bet_type === 'over_under' ? 'over_under'
    : null
  const streak = streakMetric ? computeStreak(seasonGames, streakMetric) : null

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: rowBg }}>

      {/* Sticky label */}
      <div style={{
        width: TOTAL_LABEL_W, minWidth: TOTAL_LABEL_W, flexShrink: 0,
        position: 'sticky', left: 0, zIndex: 10, background: rowBg,
        height: 34, display: 'flex', alignItems: 'center',
      }}>
        {/* Reorder arrows */}
        <div style={{ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <button
            onClick={onMoveUp} disabled={idx === 0} title="Move up"
            style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#2a2a34' : MUTED, fontSize: 8, padding: '1px 4px', lineHeight: 1 }}
          >▲</button>
          <button
            onClick={onMoveDown} disabled={idx === total - 1} title="Move down"
            style={{ background: 'none', border: 'none', cursor: idx === total - 1 ? 'default' : 'pointer', color: idx === total - 1 ? '#2a2a34' : MUTED, fontSize: 8, padding: '1px 4px', lineHeight: 1 }}
          >▼</button>
        </div>

        {/* Accent bar */}
        <div style={{ width: 2, height: 14, background: accent, borderRadius: 2, marginRight: 8, flexShrink: 0, opacity: 0.85 }} />

        {/* Team name + bet type + record + streak */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
              {fav.team_name.split(' ').slice(-1)[0]}
            </span>
            <span style={{ fontSize: 7, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>
              {fav.league_id.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
            <span style={{ fontSize: 8, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {BET_TYPE_LABELS[fav.bet_type]}
            </span>
            <span style={{ fontSize: 9, color: wlColor, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0 }}>
              {record.w}-{record.l}
            </span>
            {streak && (
              <span style={{ fontSize: 8, color: (streak.type === 'W' || streak.type === 'O') ? C.green : C.red, fontWeight: 800, flexShrink: 0 }}>
                · {streak.type}{streak.count}
              </span>
            )}
          </div>
        </div>

        {/* Remove from CHOP */}
        <button
          onClick={onRemove} title="Remove from The CHOP"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: GREEN, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
        >★</button>
      </div>

      {/* Calendar day columns */}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day    = i + 1
        const dGames = (dayMap.get(day) ?? []).sort((a, b) => a.rawTime.localeCompare(b.rawTime))
        const locked = !isPro && dGames.length > 0 && !visibleDaySet.has(day)
        return (
          <div key={day} style={{
            width: COL_W, minWidth: COL_W, flexShrink: 0, background: rowBg,
            filter:        locked ? 'blur(3px)' : 'none',
            opacity:       locked ? 0.35 : 1,
            pointerEvents: locked ? 'none' : 'auto',
          }}>
            {dGames.length === 0
              ? <div style={{ height: 34 }} />
              : dGames.length === 1
                ? <GameCell bt={fav.bet_type} game={dGames[0]} />
                : <DHCell bt={fav.bet_type} g1={dGames[0]} g2={dGames[1]} />
            }
          </div>
        )
      })}
    </div>
  )
}

// ─── FavoriteCards ────────────────────────────────────────────────────────────

function FavoriteCards({
  userId, favorites, isPro, onUpgrade,
  slots, setSlots, loadingCards,
  chopRowIds, onToggleChop, chopCount,
}: {
  userId:       string
  favorites:    Favorite[]
  isPro:        boolean
  onUpgrade:    () => void
  slots:        CardSlot[]
  setSlots:     React.Dispatch<React.SetStateAction<CardSlot[]>>
  loadingCards: boolean
  chopRowIds:   Set<string>
  onToggleChop: (rowId: string, currentlyInChop: boolean) => void
  chopCount:    number
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [nameInputs, setNameInputs] = useState<string[]>(() => slots.map(s => s.card?.card_name ?? DEFAULT_CARD_NAME))
  const [addingTo,   setAddingTo]   = useState<number | null>(null)
  const [chopError,  setChopError]  = useState<string | null>(null)

  useEffect(() => {
    setNameInputs(slots.map(s => s.card?.card_name ?? DEFAULT_CARD_NAME))
  }, [slots])

  async function handleNameBlur(idx: number) {
    if (editingIdx !== idx) return
    setEditingIdx(null)
    const trimmed = nameInputs[idx].trim() || DEFAULT_CARD_NAME
    let card = slots[idx].card
    if (!card?.id) {
      card = await ensureCard(userId, idx + 1)
      if (!card) return
    }
    await updateCardName(card.id, trimmed)
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, card: { ...card!, card_name: trimmed } } : s))
  }

  async function handleAddRow(cardIdx: number, favId: string) {
    const fav = favorites.find(f => f.id === favId)
    if (!fav) return
    setAddingTo(null)
    let slot = slots[cardIdx]
    let card = slot.card
    if (!card?.id) {
      card = await ensureCard(userId, cardIdx + 1)
      if (!card) return
      setSlots(prev => prev.map((s, i) => i === cardIdx ? { ...s, card: card! } : s))
    }
    if (slot.rows.length >= 8) return
    const row = await addRowToCard(userId, card.id, fav.team_name, fav.league_name, fav.bet_type)
    if (row) setSlots(prev => prev.map((s, i) => i === cardIdx ? { ...s, rows: [...s.rows, row] } : s))
  }

  async function handleRemoveRow(cardIdx: number, rowId: string) {
    const ok = await removeRowFromCard(rowId)
    if (ok) setSlots(prev => prev.map((s, i) =>
      i === cardIdx ? { ...s, rows: s.rows.filter(r => r.id !== rowId) } : s
    ))
  }

  function handleStarCard(rowId: string, currentlyInChop: boolean) {
    if (!currentlyInChop && chopCount >= MAX_CHOP) {
      setChopError('The CHOP is full — remove a row below to make room')
      setTimeout(() => setChopError(null), 3500)
      return
    }
    onToggleChop(rowId, currentlyInChop)
  }

  if (!isPro) {
    return (
      <div style={{ margin: '0 24px 28px', position: 'relative' }}>
        <div style={{ filter: 'blur(3px)', pointerEvents: 'none', opacity: 0.35 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ background: CARD, border: `1px solid ${GREEN}22`, borderRadius: 12, padding: '14px 16px', minHeight: 110 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{DEFAULT_CARD_NAME}</div>
                <div style={{ fontSize: 9, color: MUTED }}>Add up to 8 rows to this card</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: '#c4b5fd', letterSpacing: '0.06em' }}>Pick Cards are a Pro feature</div>
          <button onClick={onUpgrade} style={{
            background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, border: 'none', borderRadius: 7,
            color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', padding: '9px 18px', fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
            boxShadow: `0 0 16px ${PURPLE}44`,
          }}>🔒 Go Pro</button>
        </div>
      </div>
    )
  }

  if (loadingCards) {
    return <div style={{ margin: '0 24px 20px', fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>Loading cards…</div>
  }

  return (
    <div style={{ margin: '0 24px 28px' }}>
      {chopError && (
        <div style={{ marginBottom: 10, padding: '8px 14px', background: `${AMBER}11`, border: `1px solid ${AMBER}44`, borderRadius: 8, fontSize: 11, color: AMBER }}>
          {chopError}
        </div>
      )}
      <div className="fav-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {slots.map((slot, idx) => {
          const cardName = slot.card?.card_name ?? nameInputs[idx]
          const isEditing = editingIdx === idx
          const isAdding  = addingTo  === idx

          return (
            <div key={idx} style={{
              background: CARD, border: `1px solid ${GREEN}33`, borderRadius: 12,
              padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
              boxShadow: `0 0 18px ${GREEN}08`,
            }}>
              {/* Editable card name */}
              {isEditing ? (
                <input
                  autoFocus
                  value={nameInputs[idx]}
                  onChange={e => setNameInputs(prev => prev.map((n, i) => i === idx ? e.target.value : n))}
                  onBlur={() => handleNameBlur(idx)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNameBlur(idx) }}
                  maxLength={32}
                  style={{
                    background: 'transparent', border: 'none', borderBottom: `1px solid ${GREEN}`,
                    color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', padding: '2px 0', outline: 'none', width: '100%',
                    fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
                  }}
                />
              ) : (
                <button
                  onClick={() => setEditingIdx(idx)}
                  title="Click to rename"
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.1em',
                    textTransform: 'uppercase', textAlign: 'left',
                    fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {cardName}<span style={{ fontSize: 9, opacity: 0.5 }}>✎</span>
                </button>
              )}

              {/* Rows */}
              {slot.rows.length === 0 ? (
                <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.06em', padding: '4px 0' }}>
                  Add up to 8 rows to this card
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {slot.rows.map(row => {
                    const color    = TEAM_COLORS[row.team_name]?.primary ?? GREEN
                    const lastName = row.team_name.split(' ').slice(-1)[0]
                    const betLabel = BET_TYPE_LABELS[row.bet_type as BetType] ?? row.bet_type
                    const inChop   = chopRowIds.has(row.id)
                    return (
                      <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Star to promote/demote from The CHOP */}
                        <button
                          onClick={() => handleStarCard(row.id, inChop)}
                          title={inChop ? 'Remove from The CHOP' : 'Add to The CHOP'}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, color: inChop ? GREEN : MUTED,
                            padding: '0 1px', lineHeight: 1, flexShrink: 0,
                          }}
                        >{inChop ? '★' : '☆'}</button>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: TEXT, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lastName}
                        </span>
                        <span style={{ fontSize: 8, color: SUB, letterSpacing: '0.07em', flexShrink: 0 }}>{betLabel}</span>
                        <button
                          onClick={() => handleRemoveRow(idx, row.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                        >×</button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add row */}
              {slot.rows.length < 8 && (
                isAdding ? (
                  <select
                    autoFocus defaultValue=""
                    onChange={e => { if (e.target.value) handleAddRow(idx, e.target.value) }}
                    onBlur={() => setAddingTo(null)}
                    style={{
                      background: '#13131e', border: `1px solid ${BORDER}`, borderRadius: 6,
                      color: TEXT, fontSize: 10, padding: '6px 10px', width: '100%', outline: 'none',
                      fontFamily: 'var(--font-oswald), "Oswald", sans-serif', cursor: 'pointer',
                    }}
                  >
                    <option value="" disabled>Select a favorite…</option>
                    {favorites.map(fav => (
                      <option key={fav.id} value={fav.id}>
                        {fav.team_name} — {BET_TYPE_LABELS[fav.bet_type]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setAddingTo(idx)}
                    style={{
                      background: 'none', border: `1px dashed ${GREEN}44`, borderRadius: 6,
                      color: GREEN, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                      cursor: 'pointer', padding: '6px 12px', width: '100%',
                      fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
                    }}
                  >+ ADD ROW</button>
                )
              )}
            </div>
          )
        })}
      </div>
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
          The Chop
        </h1>
        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.8, margin: '0 0 28px', fontFamily: 'var(--font-oswald), "Oswald", sans-serif' }}>
          Build your 32, then cut it to your best 16. Sign in to get started.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => openModal('join')} style={{
            background: `linear-gradient(135deg, ${GREEN}, #16a34a)`, border: 'none', borderRadius: 8,
            color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', padding: '12px 24px', fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
            boxShadow: `0 0 20px ${GREEN}35`,
          }}>Join Free</button>
          <button onClick={() => openModal('login')} style={{
            background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8,
            color: SUB, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer', padding: '12px 24px', fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
          }}>Sign In</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const { user, isMember, isPro, loading: authLoading, openModal } = useAuth()

  const [mounted,      setMounted]      = useState(false)
  const [favorites,    setFavorites]    = useState<Favorite[]>([])
  const [slots,        setSlots]        = useState<CardSlot[]>(() => Array.from({ length: 4 }, () => ({ card: null, rows: [] })))
  const [loadingCards, setLoadingCards] = useState(true)
  const [loading,      setLoading]      = useState(true)
  const [gamesLoading, setGamesLoading] = useState(false)
  const [sortMode,     setSortMode]     = useState<SortMode>('selected')
  const [toast,        setToast]        = useState<string | null>(null)

  const [monthGames,  setMonthGames]  = useState<Record<string, GameEntry[]>>({})
  const [seasonGames, setSeasonGames] = useState<Record<string, GameEntry[]>>({})

  // ── Derived chop data ────────────────────────────────────────────────────────

  const chopRowIds = useMemo(() => {
    const s = new Set<string>()
    for (const slot of slots) {
      for (const row of slot.rows) {
        if (row.in_chop) s.add(row.id)
      }
    }
    return s
  }, [slots])

  const chopFavs = useMemo(() => {
    const rows: FavoriteCardRow[] = []
    for (const slot of slots) for (const row of slot.rows) if (row.in_chop) rows.push(row)
    rows.sort((a, b) => a.display_order - b.display_order)
    return rows.map(cardRowToFav)
  }, [slots])

  const totalCardRows = useMemo(() => slots.reduce((acc, s) => acc + s.rows.length, 0), [slots])
  const chopCount     = chopRowIds.size

  // ── Month navigation ─────────────────────────────────────────────────────────

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)

  const todayYM      = today.getFullYear() * 12 + (today.getMonth() + 1)
  const minYM        = (today.getFullYear() - 1) * 12 + (today.getMonth() + 1)
  const viewYM       = viewYear * 12 + viewMonth
  const canPrevMonth = viewYM > minYM
  const canNextMonth = viewYM < todayYM

  function handlePrevMonth() {
    if (!canPrevMonth) return
    setViewMonth(m => { if (m === 1) { setViewYear(y => y - 1); return 12 } return m - 1 })
  }
  function handleNextMonth() {
    if (!canNextMonth) return
    setViewMonth(m => { if (m === 12) { setViewYear(y => y + 1); return 1 } return m + 1 })
  }

  const daysInMonth     = new Date(viewYear, viewMonth, 0).getDate()
  const contentMinWidth = TOTAL_LABEL_W + daysInMonth * COL_W

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchMonthData = useCallback(async (favs: Favorite[], y: number, m: number) => {
    if (!favs.length) { setMonthGames({}); return }
    setGamesLoading(true)
    const entries = await Promise.all(
      favs.map(fav =>
        fetchTeamOutcomesByMonth(fav.league_id, slugify(fav.team_name), y, m)
          .then(games => [fav.id, games] as const),
      ),
    )
    setMonthGames(Object.fromEntries(entries))
    setGamesLoading(false)
  }, [])

  const fetchSeasonData = useCallback(async (favs: Favorite[]) => {
    if (!favs.length) { setSeasonGames({}); return }
    const entries = await Promise.all(
      favs.map(fav =>
        fetchTeamSeasonOutcomes(fav.league_id, slugify(fav.team_name))
          .then(games => [fav.id, games] as const),
      ),
    )
    setSeasonGames(Object.fromEntries(entries))
  }, [])

  const loadAll = useCallback(async () => {
    if (!user?.id) { setLoading(false); setLoadingCards(false); return }
    setLoading(true)
    const [favData, cardData] = await Promise.all([
      fetchFavorites(user.id),
      fetchCards(user.id),
    ])
    setFavorites(favData)
    setSlots(cardData)
    setLoadingCards(false)

    const initialChopRows: FavoriteCardRow[] = []
    for (const slot of cardData) for (const row of slot.rows) if (row.in_chop) initialChopRows.push(row)
    initialChopRows.sort((a, b) => a.display_order - b.display_order)
    const initial = initialChopRows.map(cardRowToFav)
    await fetchMonthData(initial, viewYear, viewMonth)
    fetchSeasonData(initial)
    setLoading(false)
  }, [user?.id, viewYear, viewMonth, fetchMonthData, fetchSeasonData]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const saved = localStorage.getItem(SORT_LS_KEY) as SortMode | null
    if (saved && saved in SORT_LABELS) setSortMode(saved)
  }, [])

  useEffect(() => {
    if (mounted && !authLoading) loadAll()
  }, [mounted, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted || authLoading || chopFavs.length === 0) return
    fetchMonthData(chopFavs, viewYear, viewMonth)
  }, [viewYear, viewMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when chop membership changes
  useEffect(() => {
    if (!mounted || loading) return
    fetchMonthData(chopFavs, viewYear, viewMonth)
    fetchSeasonData(chopFavs)
  }, [chopRowIds.size]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle in_chop ───────────────────────────────────────────────────────────

  async function handleToggleChop(rowId: string, currentlyInChop: boolean) {
    const newValue = !currentlyInChop
    const ok = await setRowInChop(rowId, newValue)
    if (ok) {
      setSlots(prev => prev.map(s => ({
        ...s,
        rows: s.rows.map(r => r.id === rowId ? { ...r, in_chop: newValue } : r),
      })))
    }
  }

  // ── Scroll sync ──────────────────────────────────────────────────────────────

  const scrollRef    = useRef<HTMLDivElement | null>(null)
  const scrollPosRef = useRef(0)
  const syncTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [atStart, setAtStart] = useState(true)
  const [atEnd,   setAtEnd]   = useState(false)

  function updateEdges(pos: number, el: HTMLElement | null) {
    const newStart = pos <= 0
    const newEnd   = el ? pos >= el.scrollWidth - el.clientWidth - 2 : false
    if (newStart !== atStart) setAtStart(newStart)
    if (newEnd   !== atEnd)   setAtEnd(newEnd)
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const pos = el.scrollLeft
    scrollPosRef.current = pos
    updateEdges(pos, el)
  }

  function scrollWeek(dir: -1 | 1) {
    const el = scrollRef.current
    if (!el) return
    const targetPos = Math.max(0, scrollPosRef.current + dir * SCROLL_WEEK)
    scrollPosRef.current = targetPos
    el.scrollTo({ left: targetPos, behavior: 'smooth' })
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => updateEdges(el.scrollLeft, el), 450)
  }

  const allPopulatedDays = useMemo(() => {
    const s = new Set<number>()
    for (const games of Object.values(monthGames)) {
      for (const g of games) {
        const day = parseInt(g.rawDate.split('-')[2] ?? '0', 10)
        if (day > 0) s.add(day)
      }
    }
    return s
  }, [monthGames])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || allPopulatedDays.size === 0) return
    const raf = requestAnimationFrame(() => {
      const now = new Date()
      const isCurrent = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1
      let targetPos = 0
      if (isCurrent) {
        const lastDay = Math.max(...allPopulatedDays)
        targetPos = Math.max(0, (lastDay - 1) * COL_W - (el.clientWidth - TOTAL_LABEL_W) / 2)
      }
      scrollPosRef.current = targetPos
      el.scrollTo({ left: targetPos, behavior: 'smooth' })
      clearTimeout(syncTimer.current)
      syncTimer.current = setTimeout(() => updateEdges(el.scrollLeft, el), 450)
    })
    return () => cancelAnimationFrame(raf)
  }, [viewYear, viewMonth, allPopulatedDays.size]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scrollRef.current
    if (el) updateEdges(scrollPosRef.current, el)
  }, [daysInMonth, chopFavs.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sort ─────────────────────────────────────────────────────────────────────

  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode)
    localStorage.setItem(SORT_LS_KEY, mode)
  }

  const displayChopFavs = useMemo(() => {
    if (sortMode === 'selected') return chopFavs
    const withData = chopFavs.map(f => ({ fav: f, sg: seasonGames[f.id] ?? [] }))
    switch (sortMode) {
      case 'az':     return [...withData].sort((a, b) => a.fav.team_name.localeCompare(b.fav.team_name)).map(x => x.fav)
      case 'za':     return [...withData].sort((a, b) => b.fav.team_name.localeCompare(a.fav.team_name)).map(x => x.fav)
      case 'wtl':    return [...withData].sort((a, b) => winRate(b.sg, b.fav.bet_type) - winRate(a.sg, a.fav.bet_type)).map(x => x.fav)
      case 'ltw':    return [...withData].sort((a, b) => winRate(a.sg, a.fav.bet_type) - winRate(b.sg, b.fav.bet_type)).map(x => x.fav)
      case 'league': return [...withData].sort((a, b) => a.fav.league_name.localeCompare(b.fav.league_name)).map(x => x.fav)
      default:       return chopFavs
    }
  }, [chopFavs, sortMode, seasonGames])

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!mounted || authLoading) return null

  if (!isMember) return (
    <div style={{ paddingLeft: 80, paddingTop: 80, minHeight: '100vh' }}>
      <LoginGate />
    </div>
  )

  return (
    <div style={{ paddingLeft: 80, paddingTop: 80, paddingRight: 0, paddingBottom: 56, minHeight: '100vh' }}>

      {/* ─── Page header ──────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 8, color: PURPLE, letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            {isPro ? '⚡ Pro Feature' : 'Member Feature'}
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 900, margin: 0, lineHeight: 1,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            background: `linear-gradient(135deg, ${TEXT} 40%, ${GREEN})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
          }}>
            The Chop
          </h1>
          <p style={{ fontSize: 10, color: MUTED, marginTop: 8, marginBottom: 0, maxWidth: 560 }}>
            Build your 32 — then cut it to your best 16. The CHOP is your sharpest rows, all in one chart.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Two pill counters */}
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
            padding: '7px 12px', fontSize: 10, letterSpacing: '0.08em',
            color: totalCardRows >= MAX_CARD_ROWS ? '#ef4444' : SUB,
            fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
          }}>
            CARDS: {totalCardRows}/{MAX_CARD_ROWS}
          </div>
          <div style={{
            background: CARD, border: `1px solid ${GREEN}44`, borderRadius: 8,
            padding: '7px 12px', fontSize: 10, letterSpacing: '0.08em',
            color: chopCount >= MAX_CHOP ? '#ef4444' : GREEN,
            fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
          }}>
            CHOP: {chopCount}/{MAX_CHOP}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em' }}>Sort:</span>
            <select
              value={sortMode}
              onChange={e => handleSortChange(e.target.value as SortMode)}
              style={{
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
                color: SUB, fontSize: 10, padding: '7px 10px',
                fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
                cursor: 'pointer', outline: 'none',
              }}
            >
              {(Object.keys(SORT_LABELS) as SortMode[]).map(k => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <Link href="/teams" style={{
            textDecoration: 'none', fontSize: 10, fontWeight: 700,
            color: GREEN, border: `1px solid ${GREEN}44`, borderRadius: 8,
            padding: '8px 16px', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            + Browse Teams
          </Link>
        </div>
      </div>

      {/* ─── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a24', border: `1px solid ${BORDER}`, borderRadius: 10,
          padding: '12px 24px', fontSize: 11, color: SUB,
          zIndex: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-oswald), "Oswald", sans-serif', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {/* ─── Free-tier banner ─────────────────────────────────────────────── */}
      {!isPro && (
        <div style={{
          margin: '0 24px 20px',
          background: `${PURPLE}0a`, border: `1px solid ${PURPLE}33`, borderRadius: 10,
          padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, color: '#c4b5fd', letterSpacing: '0.06em' }}>
            Free plan shows the last 3 game days only. Go Pro to unlock the full month.
          </span>
          <button onClick={() => openModal('pro')} style={{
            background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, border: 'none', borderRadius: 7,
            color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', padding: '9px 18px', fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
            boxShadow: `0 0 16px ${PURPLE}44`, whiteSpace: 'nowrap',
          }}>🔒 Go Pro</button>
        </div>
      )}

      {/* ─── Pick Cards ───────────────────────────────────────────────────── */}
      {user && (
        <FavoriteCards
          userId={user.id}
          favorites={favorites}
          isPro={!!isPro}
          onUpgrade={() => openModal('pro')}
          slots={slots}
          setSlots={setSlots}
          loadingCards={loadingCards}
          chopRowIds={chopRowIds}
          onToggleChop={handleToggleChop}
          chopCount={chopCount}
        />
      )}

      {/* ─── THE CHOP section header ──────────────────────────────────────── */}
      <div style={{ padding: '0 24px 10px', marginTop: 16 }}>
        <h2 style={{
          fontSize: 26, fontWeight: 900, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase',
          margin: '0 0 6px', fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
        }}>
          The Chop
        </h2>
        <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
          Your best 16 rows — selected from your cards above. Click ☆ on any card row to add it here.
        </p>
      </div>

      {/* ─── Main chart area ──────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.1em' }}>
          Loading…
        </div>
      ) : chopFavs.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>☆</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            The CHOP is empty
          </div>
          <div style={{ fontSize: 11, color: MUTED }}>
            Add rows to your cards above, then click ☆ on any row to promote it to The CHOP.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 16, padding: '0 0 24px' }}>

          {/* Legend sidebar — flush left, aligned with chart top */}
          <div style={{ paddingLeft: 24, flexShrink: 0 }}>
            <ChartLegend />
          </div>

          {/* Chart column */}
          <div style={{ flex: 1, minWidth: 0 }}>

            <MonthNav
              year={viewYear} month={viewMonth}
              onPrev={handlePrevMonth} onNext={handleNextMonth}
              canPrev={canPrevMonth} canNext={canNextMonth}
            />

            {gamesLoading && (
              <div style={{ padding: '10px 20px', fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>
                Loading game data…
              </div>
            )}

            <div style={{ position: 'relative' }}>
              {!atStart && (
                <div style={{ position: 'absolute', left: TOTAL_LABEL_W, top: 0, bottom: 0, width: 48, zIndex: 25, pointerEvents: 'none', background: `linear-gradient(to right, ${BG}, transparent)` }} />
              )}
              {!atEnd && (
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 64, zIndex: 25, pointerEvents: 'none', background: `linear-gradient(to left, ${BG}, transparent)` }} />
              )}
              {!atStart && <ScrollArrow dir="left"  onClick={() => scrollWeek(-1)} />}
              {!atEnd   && <ScrollArrow dir="right" onClick={() => scrollWeek(1)}  />}

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="chart-scroll-hidden"
                style={{ overflowX: 'auto' }}
              >
                <div style={{ minWidth: contentMinWidth, position: 'relative' }}>
                  <DateHeader
                    year={viewYear} month={viewMonth}
                    daysInMonth={daysInMonth} populatedDays={allPopulatedDays}
                  />
                  {displayChopFavs.map((fav, idx) => (
                    <FavoriteRow
                      key={fav.id}
                      fav={fav}
                      idx={idx}
                      total={displayChopFavs.length}
                      games={monthGames[fav.id] ?? []}
                      seasonGames={seasonGames[fav.id] ?? []}
                      daysInMonth={daysInMonth}
                      month={viewMonth}
                      isPro={!!isPro}
                      onRemove={() => handleToggleChop(fav.id, true)}
                      onMoveUp={() => {}}
                      onMoveDown={() => {}}
                    />
                  ))}
                  {!isPro && Object.values(monthGames).some(g => g.length > FREE_COLS) && (
                    <div style={{ position: 'sticky', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 5, paddingTop: 8 }}>
                      <button onClick={() => openModal('pro')} style={{
                        pointerEvents: 'all',
                        background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`,
                        border: 'none', borderRadius: 8, padding: '10px 22px',
                        color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
                        textTransform: 'uppercase', cursor: 'pointer',
                        boxShadow: `0 0 24px ${PURPLE}55`, fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
                      }}>
                        🔒 Go Pro — Unlock Full Month
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fav-cell       { display:flex; align-items:center; justify-content:center; height:34px; margin:0 3px; border-radius:5px; font-size:11px; letter-spacing:0.1em; }
        .fav-cell-half  { flex:1; display:flex; align-items:stretch; }
        .fav-cell-half .fav-cell { height:100%; border-radius:0; margin:0; flex:1; }
        .chart-scroll-hidden { scrollbar-width: none; -ms-overflow-style: none; }
        .chart-scroll-hidden::-webkit-scrollbar { display: none; }
        .fav-scroll-arrow:hover { border-color: #22c55e99 !important; box-shadow: 0 0 14px #22c55e44 !important; }
        @media (max-width: 600px) { .fav-scroll-arrow { display: none !important; } }
        @media (max-width: 900px) { .fav-cards-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
