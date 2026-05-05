'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { LEAGUES } from '@/lib/leagues-data'
import {
  FavoriteGroup, FavoriteItem, BetType, UpcomingEvent, HotFavoriteTeam,
  getUserId, fetchFavoriteGroups, createFavoriteGroup,
  addItemToGroup, removeItemFromGroup, deleteFavoriteGroup,
  renameFavoriteGroup, generateUpcomingEvents, getSpreadLabel,
  getHotFavoriteTeams, checkAndCompleteGroups,
} from '@/lib/favorites'

// ─── Palette ──────────────────────────────────────────────────────────────────

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const GREEN  = '#22c55e'
const RED    = '#ef4444'
const PURPLE = '#9333ea'
const BLUE   = '#60a5fa'
const AMBER  = '#eab308'

function outcomeColor(outcome: ItemOutcome): string {
  switch (outcome) {
    case 'win':   return GREEN
    case 'loss':  return RED
    case 'over':  return PURPLE
    case 'under': return BLUE
    case 'push':  return AMBER
    default:      return BORDER
  }
}

function outcomeIcon(outcome: ItemOutcome): string {
  switch (outcome) {
    case 'win':   return '✓'
    case 'loss':  return '✗'
    case 'over':  return '▲'
    case 'under': return '▼'
    case 'push':  return '~'
    default:      return '●'
  }
}

type ItemOutcome = FavoriteItem['outcome']

// ─── Pro Gate ─────────────────────────────────────────────────────────────────

function ProGate() {
  const { openModal, setIsPro } = useAuth()

  const btnPrimary: React.CSSProperties = {
    background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`,
    border: 'none', borderRadius: 8, color: TEXT,
    fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
    textTransform: 'uppercase', cursor: 'pointer', padding: '13px 32px',
    fontFamily: 'var(--font-geist-mono), monospace',
    boxShadow: `0 0 20px ${PURPLE}55`, width: 300,
  }

  const btnGhost: React.CSSProperties = {
    background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8,
    color: SUB, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer', padding: '10px 18px',
    fontFamily: 'var(--font-geist-mono), monospace', width: 300,
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div style={{ fontSize: 52, marginBottom: 18 }}>⭐</div>
        <div style={{ fontSize: 9, color: PURPLE, letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
          Pro Feature
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 900, color: TEXT,
          letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px',
          background: `linear-gradient(135deg, ${TEXT}, ${PURPLE})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Favorites
        </h1>
        <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.8, margin: '0 0 28px', fontFamily: 'var(--font-geist-mono), monospace' }}>
          Track the teams and players you care about across every supported league.
          Color-coded outcomes, hot favorite alerts, and full history — all in one premium tool.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 28 }}>
          <button onClick={() => openModal('pro')} style={btnPrimary}>
            Go Pro — Unlock Favorites
          </button>
          <button onClick={() => openModal('join')} style={btnGhost}>
            Join Free (Limited Access)
          </button>
        </div>
        <div style={{ padding: '18px 22px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'var(--font-geist-mono), monospace' }}>
            Favorites Includes
          </div>
          {[
            'Create unlimited favorites groups',
            'Color-coded win / loss / push / over / under cells',
            'Auto-saves as you track — no manual save required',
            '"Hot Favorites" — surface your best-performing teams',
            'Full tracking history with outcome data',
            'Multi-league across all Gambchop-supported sports',
          ].map(f => (
            <div key={f} style={{ fontSize: 11, color: SUB, display: 'flex', gap: 8, marginBottom: 7, textAlign: 'left', fontFamily: 'var(--font-geist-mono), monospace' }}>
              <span style={{ color: GREEN, flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
        </div>
        <button
          onClick={() => setIsPro(true)}
          style={{ marginTop: 22, background: 'none', border: 'none', color: '#1a1a24', fontSize: 9, cursor: 'pointer', fontFamily: 'var(--font-geist-mono), monospace' }}
        >
          [Dev: Enable Pro]
        </button>
      </div>
    </div>
  )
}

// ─── Color Legend ─────────────────────────────────────────────────────────────

function ColorLegend() {
  const items = [
    { label: 'Win',     color: GREEN  },
    { label: 'Loss',    color: RED    },
    { label: 'Over',    color: PURPLE },
    { label: 'Under',   color: BLUE   },
    { label: 'Push',    color: AMBER  },
    { label: 'Pending', color: BORDER },
  ]
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
      {items.map(({ label, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 8, height: 8, borderRadius: 2, background: color,
            boxShadow: color !== BORDER ? `0 0 5px ${color}88` : 'none',
          }} />
          <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Item Cell ────────────────────────────────────────────────────────────────

function ItemCell({
  item,
  onRemove,
  canRemove = false,
}: {
  item:       FavoriteItem
  onRemove?:  () => void
  canRemove?: boolean
}) {
  const isPending = item.outcome === 'pending'
  const color     = outcomeColor(item.outcome)
  const icon      = outcomeIcon(item.outcome)
  const shortTeam = item.team_name.split(' ').pop() ?? item.team_name
  const shortOpp  = item.opponent ? (item.opponent.split(' ').pop() ?? item.opponent) : '?'

  return (
    <div style={{
      position: 'relative',
      minWidth: 114, maxWidth: 114,
      background: isPending ? '#0c0c14' : `${color}12`,
      border: `1px solid ${isPending ? BORDER : `${color}44`}`,
      borderRadius: 10, padding: '10px 12px',
      boxShadow: isPending ? 'none' : `0 0 14px ${color}28`,
      transition: 'all 0.2s',
      fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      {canRemove && (
        <button
          onClick={onRemove}
          title="Remove"
          style={{
            position: 'absolute', top: 5, right: 6,
            background: 'none', border: 'none', color: MUTED,
            cursor: 'pointer', fontSize: 9, padding: 2, lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
      <div style={{ fontSize: 7, letterSpacing: '0.18em', textTransform: 'uppercase', color: isPending ? MUTED : color, marginBottom: 5, fontWeight: 700 }}>
        {item.bet_type}
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: isPending ? SUB : TEXT, letterSpacing: '0.02em', lineHeight: 1.2, marginBottom: 2 }}>
        {shortTeam}
      </div>
      <div style={{ fontSize: 9, color: MUTED, marginBottom: 3 }}>
        vs {shortOpp}
      </div>
      <div style={{ fontSize: 8, color: '#2e2e3e', marginBottom: 8 }}>
        {item.event_date}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '3px 6px', borderRadius: 4,
        background: isPending ? '#13131d' : `${color}1a`,
        border: `1px solid ${isPending ? '#1a1a2e' : `${color}30`}`,
      }}>
        <span style={{ fontSize: 9, color: isPending ? MUTED : color }}>{icon}</span>
        <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: isPending ? MUTED : color }}>
          {item.outcome}
        </span>
      </div>
    </div>
  )
}

// ─── Favorites Group Card ─────────────────────────────────────────────────────

function FavoritesGroupCard({
  group,
  onAddItem,
  onRemoveItem,
  onDelete,
  onRename,
}: {
  group:        FavoriteGroup
  onAddItem:    () => void
  onRemoveItem: (itemId: string) => void
  onDelete:     () => void
  onRename:     (name: string) => void
}) {
  const [renaming,       setRenaming]       = useState(false)
  const [draft,          setDraft]          = useState(group.name)
  const [hoverDelete,    setHoverDelete]    = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)

  const settled    = group.items.filter(i => i.outcome !== 'pending').length
  const wins       = group.items.filter(i => i.outcome === 'win').length
  const losses     = group.items.filter(i => i.outcome === 'loss').length
  const pushes     = group.items.filter(i => i.outcome === 'push').length
  const overs      = group.items.filter(i => i.outcome === 'over').length
  const unders     = group.items.filter(i => i.outcome === 'under').length
  const isComplete = group.status === 'complete'
  const allWin     = settled === group.items.length && wins === group.items.length && group.items.length > 0
  const anyLoss    = losses > 0

  const cardGlow = allWin ? `0 0 28px ${GREEN}1a` : anyLoss ? `0 0 28px ${RED}14` : 'none'
  const created  = new Date(group.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const commitRename = () => {
    onRename(draft.trim() || group.name)
    setRenaming(false)
  }

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${allWin ? `${GREEN}44` : anyLoss ? `${RED}28` : BORDER}`,
      borderRadius: 14, boxShadow: cardGlow, marginBottom: 18, overflow: 'hidden',
      fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      {/* Card header */}
      <div style={{
        padding: '13px 18px', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {renaming ? (
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter')  commitRename()
                if (e.key === 'Escape') { setDraft(group.name); setRenaming(false) }
              }}
              autoFocus
              style={{
                background: '#0a0a0f', border: `1px solid ${PURPLE}88`, borderRadius: 6,
                color: TEXT, fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
                padding: '4px 8px', fontFamily: 'var(--font-geist-mono), monospace',
                outline: 'none', maxWidth: 220,
              }}
            />
          ) : (
            <button
              onClick={() => { setDraft(group.name); setRenaming(true) }}
              title="Click to rename"
              style={{
                background: 'none', border: 'none', color: TEXT, cursor: 'text',
                fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
                fontFamily: 'var(--font-geist-mono), monospace', padding: 0, textAlign: 'left',
              }}
            >
              {group.name}
            </button>
          )}
          <span style={{
            fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: isComplete ? GREEN : PURPLE,
            background: isComplete ? `${GREEN}18` : `${PURPLE}18`,
            border: `1px solid ${isComplete ? `${GREEN}44` : `${PURPLE}44`}`,
            padding: '2px 8px', borderRadius: 4, flexShrink: 0,
          }}>
            {isComplete ? 'complete' : 'active'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: MUTED }}>
            {created} · {group.items.length} item{group.items.length !== 1 ? 's' : ''}
          </span>
          {settled > 0 && (
            <span style={{ fontSize: 10 }}>
              {wins   > 0 && <span style={{ color: GREEN  }}>{wins}W </span>}
              {losses > 0 && <span style={{ color: RED    }}>{losses}L </span>}
              {pushes > 0 && <span style={{ color: AMBER  }}>{pushes}P </span>}
              {overs  > 0 && <span style={{ color: PURPLE }}>{overs}O </span>}
              {unders > 0 && <span style={{ color: BLUE   }}>{unders}U </span>}
            </span>
          )}
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={onDelete}
                style={{
                  background: `${RED}22`, border: `1px solid ${RED}66`, borderRadius: 6,
                  color: RED, cursor: 'pointer', fontSize: 9, padding: '4px 10px',
                  fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6,
                  color: MUTED, cursor: 'pointer', fontSize: 9, padding: '4px 10px',
                  fontFamily: 'var(--font-geist-mono), monospace',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              onMouseEnter={() => setHoverDelete(true)}
              onMouseLeave={() => setHoverDelete(false)}
              style={{
                background: hoverDelete ? `${RED}18` : 'none',
                border: `1px solid ${hoverDelete ? `${RED}55` : BORDER}`,
                borderRadius: 6, color: hoverDelete ? RED : MUTED,
                cursor: 'pointer', fontSize: 9, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '4px 10px',
                fontFamily: 'var(--font-geist-mono), monospace', transition: 'all 0.15s',
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: '14px 18px' }}>
        {group.items.length === 0 ? (
          <div style={{
            padding: '22px', textAlign: 'center',
            border: `1px dashed ${BORDER}`, borderRadius: 10,
            color: MUTED, fontSize: 11, letterSpacing: '0.06em',
          }}>
            No items selected yet — tap "Add Item" to start tracking
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
            {group.items.map(item => (
              <ItemCell
                key={item.id}
                item={item}
                canRemove={!isComplete}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isComplete && (
        <div style={{
          padding: '10px 18px', borderTop: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={onAddItem}
            style={{
              background: `linear-gradient(135deg, ${GREEN}cc, #16a34a)`,
              border: 'none', borderRadius: 7, color: '#000',
              fontSize: 9, fontWeight: 900, letterSpacing: '0.15em',
              textTransform: 'uppercase', cursor: 'pointer', padding: '8px 16px',
              fontFamily: 'var(--font-geist-mono), monospace',
              boxShadow: `0 0 12px ${GREEN}44`,
            }}
          >
            + Add Item
          </button>
          {group.items.length > 0 && settled < group.items.length && (
            <span style={{ fontSize: 9, color: MUTED }}>
              {group.items.length - settled} item{group.items.length - settled !== 1 ? 's' : ''} pending
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Item Picker Modal ────────────────────────────────────────────────────────

const PICKER_LEAGUE_IDS = ['mlb', 'nfl', 'nba', 'nhl', 'ncaaf', 'ncaab', 'wnba', 'atp', 'wta']

function ItemPickerModal({
  onAdd,
  onClose,
}: {
  onAdd:   (event: UpcomingEvent, teamName: string, betType: BetType) => void
  onClose: () => void
}) {
  const [selectedLeague,  setSelectedLeague]  = useState('mlb')
  const [events,          setEvents]          = useState<UpcomingEvent[]>([])
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [selectedTeam,    setSelectedTeam]    = useState<string | null>(null)
  const [selectedBet,     setSelectedBet]     = useState<BetType>('moneyline')

  useEffect(() => {
    setEvents(generateUpcomingEvents(selectedLeague))
    setExpandedEventId(null)
    setSelectedTeam(null)
    setSelectedBet('moneyline')
  }, [selectedLeague])

  const handleExpand = (eventId: string) => {
    if (expandedEventId === eventId) { setExpandedEventId(null); return }
    setExpandedEventId(eventId)
    setSelectedTeam(null)
    setSelectedBet('moneyline')
  }

  const spreadLabel = getSpreadLabel(selectedLeague)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '72px 20px 20px', overflowY: 'auto',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 780,
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
        boxShadow: `0 0 60px ${PURPLE}20`,
        fontFamily: 'var(--font-geist-mono), monospace', marginBottom: 40,
      }}>
        {/* Modal header */}
        <div style={{
          padding: '16px 22px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 8, color: PURPLE, letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 4 }}>
              Add to Favorites
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Select Team or Player
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8,
              color: MUTED, cursor: 'pointer', fontSize: 10, letterSpacing: '0.1em',
              padding: '7px 14px', fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* League tabs */}
        <div style={{
          padding: '10px 22px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', gap: 6, overflowX: 'auto',
        }}>
          {PICKER_LEAGUE_IDS.map(lid => {
            const meta   = LEAGUES.find(l => l.id === lid)
            if (!meta) return null
            const active = selectedLeague === lid
            return (
              <button
                key={lid}
                onClick={() => setSelectedLeague(lid)}
                style={{
                  background: active ? `${meta.accent}20` : 'none',
                  border: `1px solid ${active ? `${meta.accent}60` : BORDER}`,
                  borderRadius: 7, color: active ? meta.accent : MUTED,
                  cursor: 'pointer', fontSize: 8, fontWeight: active ? 900 : 500,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  padding: '6px 12px', whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-geist-mono), monospace', transition: 'all 0.15s',
                }}
              >
                {meta.emoji} {meta.name}
              </button>
            )
          })}
        </div>

        {/* Events list */}
        <div style={{ padding: 14, maxHeight: '58vh', overflowY: 'auto' }}>
          {events.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 11 }}>
              No upcoming events
            </div>
          )}
          {events.map(event => {
            const expanded = expandedEventId === event.id
            const meta     = LEAGUES.find(l => l.id === event.leagueId)
            const accent   = meta?.accent ?? GREEN

            const teamSpread = selectedTeam
              ? (selectedTeam === event.homeTeam ? event.spread : -event.spread)
              : 0
            const spreadStr = teamSpread >= 0 ? `+${teamSpread}` : `${teamSpread}`
            const mlOdds    = selectedTeam
              ? (selectedTeam === event.homeTeam ? event.homeOdds : event.awayOdds)
              : 0
            const mlStr = mlOdds >= 0 ? `+${mlOdds}` : `${mlOdds}`

            return (
              <div key={event.id} style={{ marginBottom: 6 }}>
                <button
                  onClick={() => handleExpand(event.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: expanded ? `${accent}0a` : '#0b0b12',
                    border: `1px solid ${expanded ? `${accent}44` : BORDER}`,
                    borderRadius: expanded ? '10px 10px 0 0' : 10,
                    padding: '11px 14px', cursor: 'pointer',
                    fontFamily: 'var(--font-geist-mono), monospace',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, color: accent, letterSpacing: '0.08em' }}>
                      {event.displayDate}
                    </span>
                    <span style={{ fontSize: 12, color: TEXT, fontWeight: 700 }}>
                      <span style={{ color: SUB, fontWeight: 400 }}>{event.awayTeam.split(' ').pop()}</span>
                      <span style={{ color: MUTED, margin: '0 5px' }}>@</span>
                      <span>{event.homeTeam.split(' ').pop()}</span>
                    </span>
                    <span style={{ fontSize: 9, color: MUTED }}>
                      {event.awayOdds > 0 ? `+${event.awayOdds}` : event.awayOdds}
                      {' / '}
                      {event.homeOdds > 0 ? `+${event.homeOdds}` : event.homeOdds}
                    </span>
                    <span style={{ fontSize: 9, color: '#2e2e40' }}>O/U {event.total}</span>
                  </div>
                  <span style={{ fontSize: 9, color: expanded ? accent : MUTED, marginLeft: 10 }}>
                    {expanded ? '▲' : '▼'}
                  </span>
                </button>

                {expanded && (
                  <div style={{
                    background: '#08080e', border: `1px solid ${accent}33`,
                    borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16,
                  }}>
                    {/* Team selector */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 7, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Select Team / Side
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[event.awayTeam, event.homeTeam].map(team => {
                          const isHome = team === event.homeTeam
                          const active = selectedTeam === team
                          return (
                            <button
                              key={team}
                              onClick={() => setSelectedTeam(team)}
                              style={{
                                background: active ? `${accent}20` : '#0e0e18',
                                border: `1px solid ${active ? `${accent}60` : BORDER}`,
                                borderRadius: 8, color: active ? TEXT : SUB,
                                cursor: 'pointer', fontSize: 11, fontWeight: active ? 800 : 400,
                                padding: '8px 14px',
                                fontFamily: 'var(--font-geist-mono), monospace', transition: 'all 0.15s',
                              }}
                            >
                              {team}
                              <span style={{ fontSize: 8, color: MUTED, marginLeft: 5 }}>{isHome ? '(H)' : '(A)'}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Stat type selector */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 7, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Track By
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {([
                          { type: 'moneyline' as BetType, label: 'Moneyline',  detail: selectedTeam ? mlStr     : '—' },
                          { type: 'spread'    as BetType, label: spreadLabel,  detail: selectedTeam ? spreadStr : '—' },
                          { type: 'over'      as BetType, label: 'Over',        detail: `${event.total}` },
                          { type: 'under'     as BetType, label: 'Under',       detail: `${event.total}` },
                        ] as const).map(({ type, label, detail }) => {
                          const active = selectedBet === type
                          return (
                            <button
                              key={type}
                              onClick={() => setSelectedBet(type)}
                              style={{
                                background: active ? `${accent}18` : '#0e0e18',
                                border: `1px solid ${active ? `${accent}55` : BORDER}`,
                                borderRadius: 8, cursor: 'pointer',
                                padding: '8px 14px', textAlign: 'left',
                                fontFamily: 'var(--font-geist-mono), monospace', transition: 'all 0.15s',
                              }}
                            >
                              <div style={{ fontSize: 10, color: active ? TEXT : SUB, fontWeight: 700, letterSpacing: '0.06em' }}>
                                {label}
                              </div>
                              <div style={{ fontSize: 9, color: active ? accent : MUTED, marginTop: 2 }}>
                                {detail}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!selectedTeam) return
                        onAdd(event, selectedTeam, selectedBet)
                        setExpandedEventId(null)
                        setSelectedTeam(null)
                      }}
                      disabled={!selectedTeam}
                      style={{
                        background: selectedTeam ? `linear-gradient(135deg, ${GREEN}cc, #16a34a)` : '#1a1a24',
                        border: 'none', borderRadius: 8,
                        color: selectedTeam ? '#000' : MUTED,
                        cursor: selectedTeam ? 'pointer' : 'not-allowed',
                        fontSize: 10, fontWeight: 900, letterSpacing: '0.15em',
                        textTransform: 'uppercase', padding: '10px 22px',
                        fontFamily: 'var(--font-geist-mono), monospace',
                        boxShadow: selectedTeam ? `0 0 14px ${GREEN}44` : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      + Add to Favorites
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Hot Favorites Section ────────────────────────────────────────────────────

function HotFavoritesSection({
  hotFavorites,
  activeGroupId,
  onAdd,
}: {
  hotFavorites:  HotFavoriteTeam[]
  activeGroupId: string | null
  onAdd:         (team: HotFavoriteTeam, groupId: string) => void
}) {
  if (hotFavorites.length === 0 || !activeGroupId) return null

  return (
    <div style={{ marginBottom: 36, fontFamily: 'var(--font-geist-mono), monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🔥</span>
        <div>
          <div style={{ fontSize: 9, color: AMBER, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>
            Hot Favorites
          </div>
          <div style={{ fontSize: 10, color: MUTED }}>
            Teams and players that have been performing well in your tracked groups
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {hotFavorites.map(team => (
          <div
            key={team.teamName}
            style={{
              minWidth: 192, flexShrink: 0,
              background: `${AMBER}08`,
              border: `1px solid ${AMBER}28`,
              borderRadius: 12, padding: '14px 16px',
              boxShadow: `0 0 20px ${AMBER}0e`,
            }}
          >
            <div style={{ fontSize: 7, color: AMBER, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 5, fontWeight: 700 }}>
              {team.leagueName}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, letterSpacing: '0.02em', marginBottom: 3 }}>
              {team.teamName.split(' ').pop()}
            </div>
            <div style={{ fontSize: 10, color: TEXT, marginBottom: 2, opacity: 0.5 }}>
              {team.teamName}
            </div>
            <div style={{ fontSize: 9, color: GREEN, marginBottom: team.event ? 8 : 12 }}>
              ✓ {team.wins} win{team.wins !== 1 ? 's' : ''} tracked
            </div>
            {team.event && (
              <div style={{ fontSize: 8, color: MUTED, marginBottom: 12 }}>
                Next: {team.event.displayDate}
                <span style={{ color: '#2e2e3e', marginLeft: 5 }}>
                  vs {team.event.homeTeam === team.teamName ? team.event.awayTeam.split(' ').pop() : team.event.homeTeam.split(' ').pop()}
                </span>
              </div>
            )}
            <button
              onClick={() => onAdd(team, activeGroupId)}
              style={{
                background: `linear-gradient(135deg, ${AMBER}cc, #ca8a04)`,
                border: 'none', borderRadius: 7, color: '#000',
                fontSize: 9, fontWeight: 900, letterSpacing: '0.15em',
                textTransform: 'uppercase', cursor: 'pointer', padding: '8px 14px',
                fontFamily: 'var(--font-geist-mono), monospace',
                boxShadow: `0 0 10px ${AMBER}44`, width: '100%',
              }}
            >
              🔥 Track Again
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Completed Group Card ─────────────────────────────────────────────────────

function CompletedGroupCard({ group }: { group: FavoriteGroup }) {
  const [expanded, setExpanded] = useState(false)

  const wins   = group.items.filter(i => i.outcome === 'win').length
  const losses = group.items.filter(i => i.outcome === 'loss').length
  const pushes = group.items.filter(i => i.outcome === 'push').length
  const overs  = group.items.filter(i => i.outcome === 'over').length
  const unders = group.items.filter(i => i.outcome === 'under').length
  const allWin  = wins === group.items.length && group.items.length > 0
  const anyLoss = losses > 0
  const created = new Date(group.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })

  return (
    <div style={{
      background: '#0b0b11',
      border: `1px solid ${allWin ? `${GREEN}30` : anyLoss ? `${RED}1e` : BORDER}`,
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
      fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: TEXT, letterSpacing: '0.03em' }}>
            {group.name}
          </span>
          <span style={{ fontSize: 8, color: MUTED }}>{created}</span>
          <span style={{ fontSize: 9 }}>
            {wins   > 0 && <span style={{ color: GREEN  }}>{wins}W{' '}</span>}
            {losses > 0 && <span style={{ color: RED    }}>{losses}L{' '}</span>}
            {pushes > 0 && <span style={{ color: AMBER  }}>{pushes}P{' '}</span>}
            {overs  > 0 && <span style={{ color: PURPLE }}>{overs}O{' '}</span>}
            {unders > 0 && <span style={{ color: BLUE   }}>{unders}U{' '}</span>}
          </span>
        </div>
        <span style={{ fontSize: 9, color: MUTED }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && group.items.length > 0 && (
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {group.items.map(item => (
            <ItemCell key={item.id} item={item} canRemove={false} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FavoritesBoardPage() {
  const { isPro, user } = useAuth()
  const [mounted,        setMounted]        = useState(false)
  const [userId,         setUserId]         = useState('')
  const [groups,         setGroups]         = useState<FavoriteGroup[]>([])
  const [loading,        setLoading]        = useState(true)
  const [pickerGroupId,  setPickerGroupId]  = useState<string | null>(null)
  const [creating,       setCreating]       = useState(false)

  useEffect(() => {
    setMounted(true)
    setUserId(getUserId(user?.id))
  }, [user?.id])

  const loadGroups = useCallback(async (uid: string) => {
    if (!uid) return
    setLoading(true)
    const data = await fetchFavoriteGroups(uid)
    await checkAndCompleteGroups(data)
    const updated = await fetchFavoriteGroups(uid)
    setGroups(updated)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (mounted && userId) loadGroups(userId)
  }, [mounted, userId, loadGroups])

  if (!mounted) return null

  if (!isPro) {
    return (
      <div style={{ paddingLeft: 80, paddingTop: 80, minHeight: '100vh', background: BG, fontFamily: 'var(--font-geist-mono), monospace' }}>
        <ProGate />
      </div>
    )
  }

  const activeGroups     = groups.filter(g => g.status === 'active')
  const completedGroups  = groups.filter(g => g.status === 'complete')
  const hotFavorites     = getHotFavoriteTeams(groups)
  const firstActiveGroupId = activeGroups[0]?.id ?? null

  const handleNewGroup = async () => {
    if (!userId || creating) return
    setCreating(true)
    const name = `Group #${groups.length + 1}`
    const g = await createFavoriteGroup(userId, name)
    if (g) setGroups(prev => [g, ...prev])
    setCreating(false)
  }

  const handleAddItem = async (
    groupId:  string,
    event:    UpcomingEvent,
    teamName: string,
    betType:  BetType,
  ) => {
    const opponent = teamName === event.homeTeam ? event.awayTeam : event.homeTeam
    const itemData: Omit<FavoriteItem, 'id' | 'favorite_group_id' | 'created_at'> = {
      team_name:   teamName,
      league_id:   event.leagueId,
      league_name: event.leagueName,
      event_id:    event.id,
      event_date:  event.displayDate,
      opponent,
      bet_type:    betType,
      outcome:     'pending',
    }
    const newItem = await addItemToGroup(groupId, itemData)
    if (newItem) {
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, items: [...g.items, newItem] } : g,
      ))
    }
    setPickerGroupId(null)
  }

  const handleRemoveItem = async (groupId: string, itemId: string) => {
    await removeItemFromGroup(itemId)
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g,
    ))
  }

  const handleDeleteGroup = async (groupId: string) => {
    await deleteFavoriteGroup(groupId)
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }

  const handleRenameGroup = async (groupId: string, name: string) => {
    await renameFavoriteGroup(groupId, name)
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g))
  }

  const handleAddHotFavorite = async (team: HotFavoriteTeam, groupId: string) => {
    if (!team.event) return
    await handleAddItem(groupId, team.event, team.teamName, 'moneyline')
  }

  return (
    <div style={{
      paddingLeft: 80, paddingTop: 80, paddingRight: 24, paddingBottom: 56,
      minHeight: '100vh', background: BG,
      fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{
              fontSize: 8, letterSpacing: '0.35em', textTransform: 'uppercase',
              fontWeight: 700, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: PURPLE }}>Gambchop Pro</span>
              <span style={{
                background: `${PURPLE}22`, border: `1px solid ${PURPLE}55`,
                borderRadius: 4, padding: '1px 6px', fontSize: 7, color: PURPLE,
              }}>
                PRO
              </span>
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
              Track the teams and players you care about across every league. Auto-saves as you go.
            </p>
            <ColorLegend />
          </div>

          <button
            onClick={handleNewGroup}
            disabled={creating}
            style={{
              background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`,
              border: 'none', borderRadius: 10, color: TEXT,
              fontSize: 10, fontWeight: 900, letterSpacing: '0.15em',
              textTransform: 'uppercase', cursor: creating ? 'not-allowed' : 'pointer',
              padding: '12px 22px', fontFamily: 'var(--font-geist-mono), monospace',
              boxShadow: `0 0 18px ${PURPLE}44`, opacity: creating ? 0.6 : 1,
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            {creating ? '…' : '+ New Group'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.1em' }}>
          Loading favorites…
        </div>
      ) : (
        <>
          {/* ─── Hot Favorites ────────────────────────────────────────── */}
          <HotFavoritesSection
            hotFavorites={hotFavorites}
            activeGroupId={firstActiveGroupId}
            onAdd={handleAddHotFavorite}
          />

          {/* ─── Active Groups ────────────────────────────────────────── */}
          <div style={{ marginBottom: 44 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: GREEN,
                display: 'inline-block', boxShadow: `0 0 8px ${GREEN}`,
              }} />
              <span style={{ fontSize: 9, color: GREEN, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700 }}>
                Active Groups
              </span>
              {activeGroups.length > 0 && (
                <span style={{
                  background: `${GREEN}1a`, border: `1px solid ${GREEN}44`,
                  borderRadius: 10, padding: '1px 8px', fontSize: 8, color: GREEN,
                }}>
                  {activeGroups.length}
                </span>
              )}
            </div>

            {activeGroups.length === 0 ? (
              <div style={{
                padding: '44px 24px', textAlign: 'center',
                border: `1px dashed ${BORDER}`, borderRadius: 14, color: MUTED,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
                <div style={{ fontSize: 12, letterSpacing: '0.05em', marginBottom: 6 }}>
                  No active groups
                </div>
                <div style={{ fontSize: 10, color: '#2e2e3e', marginBottom: 22 }}>
                  Tap "New Group" to start tracking your favorites
                </div>
                <button
                  onClick={handleNewGroup}
                  style={{
                    background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`,
                    border: 'none', borderRadius: 8, color: TEXT,
                    fontSize: 10, fontWeight: 900, letterSpacing: '0.15em',
                    textTransform: 'uppercase', cursor: 'pointer', padding: '10px 24px',
                    fontFamily: 'var(--font-geist-mono), monospace',
                    boxShadow: `0 0 14px ${PURPLE}44`,
                  }}
                >
                  + New Group
                </button>
              </div>
            ) : (
              activeGroups.map(group => (
                <FavoritesGroupCard
                  key={group.id}
                  group={group}
                  onAddItem={() => setPickerGroupId(group.id)}
                  onRemoveItem={itemId => handleRemoveItem(group.id, itemId)}
                  onDelete={() => handleDeleteGroup(group.id)}
                  onRename={name => handleRenameGroup(group.id, name)}
                />
              ))
            )}
          </div>

          {/* ─── History ──────────────────────────────────────────────── */}
          {completedGroups.length > 0 && (
            <div>
              <div style={{
                fontSize: 9, color: MUTED, letterSpacing: '0.3em', textTransform: 'uppercase',
                fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                History
                <span style={{
                  background: '#1a1a24', border: `1px solid ${BORDER}`,
                  borderRadius: 10, padding: '1px 8px', fontSize: 8, color: MUTED,
                }}>
                  {completedGroups.length} completed
                </span>
              </div>
              {completedGroups.map(group => (
                <CompletedGroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Item Picker Modal ────────────────────────────────────────── */}
      {pickerGroupId && (
        <ItemPickerModal
          onAdd={(event, teamName, betType) =>
            handleAddItem(pickerGroupId, event, teamName, betType)
          }
          onClose={() => setPickerGroupId(null)}
        />
      )}
    </div>
  )
}
