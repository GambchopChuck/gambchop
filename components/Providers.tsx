'use client'

import { AuthProvider } from '@/lib/auth-context'
import { FilterProvider } from '@/lib/filter-context'
import { UserProvider } from '@/lib/user-context'
import AuthModals from './AuthModals'
import Navbar from './Navbar'
import PersistentVideo from './PersistentVideo'
import Sidebar from './Sidebar'
import SubNav from './SubNav'
import { ReactNode, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { fetchCards, ensureCard, addRowToCard, CardSlot } from '@/lib/favorite-cards'
import { addFavorite } from '@/lib/favorites'
import type { BetType } from '@/lib/favorites'

// ─── Card Picker Modal ────────────────────────────────────────────────────────

interface PickerPayload {
  teamName:   string
  leagueId:   string
  leagueName: string
  betType:    string
}

function CardPickerModal() {
  const { user, isPro } = useAuth()
  const [payload, setPayload] = useState<PickerPayload | null>(null)
  const [slots,   setSlots]   = useState<CardSlot[]>([])
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<PickerPayload>).detail
      if (!detail) return
      setPayload(detail)
      setSuccess(false)
    }
    window.addEventListener('gambchop:star-click', handler)
    return () => window.removeEventListener('gambchop:star-click', handler)
  }, [])

  // Load cards when modal opens
  useEffect(() => {
    if (!payload || !user?.id) return
    fetchCards(user.id).then(setSlots)
  }, [payload, user?.id])

  async function handlePick(cardIdx: number) {
    if (!payload || !user?.id || saving) return
    const slot = slots[cardIdx]
    if ((slot?.rows.length ?? 0) >= 8) return
    setSaving(true)

    let card = slot?.card ?? null
    if (!card?.id) {
      card = await ensureCard(user.id, cardIdx + 1)
    }
    if (!card) { setSaving(false); return }

    const row = await addRowToCard(user.id, card.id, payload.teamName, payload.leagueName, payload.betType)
    if (row) {
      // Also add to favorites table so star state is tracked site-wide
      await addFavorite(
        user.id,
        { team_name: payload.teamName, league_id: payload.leagueId, league_name: payload.leagueName, bet_type: payload.betType as BetType },
        0,
      )
      setSuccess(true)
      setTimeout(() => { setPayload(null); setSuccess(false); setSaving(false) }, 900)
    } else {
      setSaving(false)
    }
  }

  if (!payload) return null

  const allFull = slots.every(s => (s?.rows.length ?? 0) >= 8)
  const GREEN  = '#22c55e'
  const CARD   = '#0f0f14'
  const BORDER = '#1a1a24'
  const MUTED  = '#52525b'
  const TEXT   = '#f4f4f5'
  const AMBER  = '#f59e0b'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={() => setPayload(null)}
    >
      <div
        style={{
          background: '#0d0d16', border: `1px solid ${BORDER}`, borderRadius: 14,
          padding: '24px 24px 20px', width: 340, maxWidth: '92vw',
          boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>
          Add to which card?
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 18 }}>
          {payload.teamName} — {payload.betType}
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: GREEN, fontWeight: 700 }}>
            ✓ Added
          </div>
        ) : allFull ? (
          <div style={{ fontSize: 11, color: AMBER, textAlign: 'center', padding: '8px 0' }}>
            Your cards are full — remove a row to add more.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slots.map((slot, idx) => {
              const name  = slot?.card?.card_name ?? `My Favorites ${idx + 1}`
              const count = slot?.rows.length ?? 0
              const full  = count >= 8
              return (
                <button
                  key={idx}
                  onClick={() => !full && handlePick(idx)}
                  disabled={full || saving}
                  style={{
                    background: full ? `${CARD}88` : CARD,
                    border: `1px solid ${full ? BORDER : GREEN + '44'}`,
                    borderRadius: 8, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: full ? 'default' : 'pointer', opacity: full ? 0.5 : 1,
                    color: TEXT, fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
                  }}
                >
                  <span>{name}</span>
                  <span style={{ fontSize: 9, color: full ? '#ef4444' : MUTED }}>
                    {full ? 'Full' : `${count}/8`}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <button
          onClick={() => setPayload(null)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: MUTED, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            marginTop: 16, width: '100%', padding: '6px 0',
            fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Inner shell (needs auth context) ────────────────────────────────────────

function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <SubNav />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, paddingLeft: 64 }}>
          <PersistentVideo />
          {children}
        </main>
      </div>
      <AuthModals />
      <CardPickerModal />
    </>
  )
}

// ─── Root provider ────────────────────────────────────────────────────────────

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UserProvider>
        <FilterProvider>
          <AppShell>{children}</AppShell>
        </FilterProvider>
      </UserProvider>
    </AuthProvider>
  )
}
