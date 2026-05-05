'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useUser, FREE_FOLLOWS, FREE_PICKS, BetType } from '@/lib/user-context'
import { getStoredUser, saveUser, generateUserId, CommunityUser } from '@/lib/community'
import { generateMockGames, LEAGUE_MAP, slugify } from '@/lib/leagues-data'

// ─── Palette ──────────────────────────────────────────────────────────────────

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const GREEN  = '#22c55e'
const PURPLE = '#8b5cf6'

// ─── Mini Chart ───────────────────────────────────────────────────────────────

function MiniChart({ teamName, limit }: { teamName: string; limit: number }) {
  const games = generateMockGames(teamName, 10).slice(0, limit)
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {games.map((g, i) => {
        const bg =
          g.moneylineResult === 'win'  ? GREEN   :
          g.moneylineResult === 'loss' ? '#ef4444' :
          g.moneylineResult === 'push' ? '#f4f4f5' : '#1a1a24'
        const glow =
          g.moneylineResult === 'win'  ? `0 0 5px ${GREEN}88`   :
          g.moneylineResult === 'loss' ? '0 0 5px #ef444488' : 'none'
        return (
          <div key={i} style={{
            width: 20, height: 20, borderRadius: 4,
            background: bg, boxShadow: glow,
            opacity: g.moneylineResult === null ? 0.2 : 1,
          }} />
        )
      })}
    </div>
  )
}

// ─── Username Setup ───────────────────────────────────────────────────────────

function UsernameSetup({ authId, onSet }: { authId?: string; onSet: (u: CommunityUser) => void }) {
  const [name, setName] = useState('')
  const [err,  setErr]  = useState('')

  const submit = () => {
    const t = name.trim()
    if (t.length < 3)  { setErr('At least 3 characters required'); return }
    if (t.length > 20) { setErr('20 characters max'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(t)) { setErr('Letters, numbers, underscores only'); return }
    const communityUser: CommunityUser = { userId: authId ?? generateUserId(), username: t }
    saveUser(communityUser)
    onSet(communityUser)
  }

  return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: '100%', maxWidth: 380, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '36px 32px' }}>
        <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Profile Setup</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 24px' }}>Pick Your Username</h2>
        <input
          style={{ width: '100%', background: '#0c0c10', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '11px 14px', color: TEXT, fontSize: 12, letterSpacing: '0.03em', outline: 'none', fontFamily: 'var(--font-geist-mono), monospace', boxSizing: 'border-box', marginBottom: 8 }}
          placeholder="e.g. SharpBettor99"
          value={name}
          onChange={e => { setName(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={20}
        />
        {err && <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 8 }}>{err}</div>}
        <div style={{ fontSize: 9, color: MUTED, marginBottom: 20, letterSpacing: '0.05em' }}>Letters, numbers, underscores only.</div>
        <button
          onClick={submit}
          style={{ width: '100%', background: `linear-gradient(135deg, ${GREEN}, #16a34a)`, border: 'none', borderRadius: 8, color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', padding: '12px', fontFamily: 'inherit', boxShadow: `0 0 16px ${GREEN}44` }}
        >
          Create Profile →
        </button>
      </div>
    </div>
  )
}

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHead({ label, sub, action }: { label: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
      <div>
        <span style={{ fontSize: 13, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        {sub && <span style={{ fontSize: 10, color: MUTED, marginLeft: 10, letterSpacing: '0.08em' }}>{sub}</span>}
      </div>
      {action}
    </div>
  )
}

// ─── Notification type badge ──────────────────────────────────────────────────

const NOTIF_COLOR = { streak: '#f97316', 'line-move': '#3b82f6', 'game-day': GREEN }

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { memberTier, openModal, setIsMember, setIsPro, isPro, user: authUser } = useAuth()
  const { follows, picks, notifications, toggleFollow, togglePick, hasPick, markRead, markAllRead, unreadCount } = useUser()

  const [user, setUser] = useState<CommunityUser | null>(null)
  const [memberSince, setMemberSince] = useState<string>('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUser(getStoredUser())
    // Record member-since date on first load as member
    const key = 'gambchop-member-since'
    if (!localStorage.getItem(key) && memberTier !== 'none') {
      localStorage.setItem(key, new Date().toISOString())
    }
    setMemberSince(localStorage.getItem(key) ?? '')
    setReady(true)
  }, [memberTier])

  // Non-member gate
  if (ready && memberTier === 'none') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: BG, fontFamily: 'var(--font-geist-mono), monospace' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 10 }}>Profile</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px' }}>Join to View Your Profile</h1>
          <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, margin: '0 0 24px' }}>
            Follow teams, track picks, and get streak alerts all in one place.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => { setIsMember(true); openModal('join') }} style={{ background: 'none', border: `1px solid #2a2a34`, borderRadius: 8, color: SUB, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '11px 24px', fontFamily: 'inherit' }}>Join Free</button>
            <button onClick={() => openModal('pro')} style={{ background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '11px 24px', fontFamily: 'inherit', boxShadow: `0 0 20px ${PURPLE}55` }}>Go Pro</button>
          </div>
        </div>
      </div>
    )
  }

  // Username setup
  if (ready && !user) {
    return (
      <div style={{ background: BG, minHeight: '100vh', fontFamily: 'var(--font-geist-mono), monospace' }}>
        <UsernameSetup authId={authUser?.id} onSet={u => setUser(u)} />
      </div>
    )
  }

  if (!ready || !user) return null

  const initial   = user.username[0].toUpperCase()
  const sinceDate = memberSince ? new Date(memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'recently'
  const followLimit = isPro ? null : FREE_FOLLOWS
  const pickLimit   = isPro ? null : FREE_PICKS

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'var(--font-geist-mono), monospace', padding: '0 0 80px' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '28px 24px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, ${GREEN}, #16a34a)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 900, color: '#000',
            boxShadow: `0 0 20px ${GREEN}44`, flexShrink: 0,
          }}>
            {initial}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>◈ Gambchop Profile</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', margin: '0 0 6px' }}>
              @{user.username}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {isPro ? (
                <span style={{ fontSize: 9, color: PURPLE, background: `${PURPLE}18`, border: `1px solid ${PURPLE}44`, borderRadius: 4, padding: '2px 8px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ⚡ Pro Member
                </span>
              ) : (
                <span style={{ fontSize: 9, color: GREEN, background: `${GREEN}18`, border: `1px solid ${GREEN}44`, borderRadius: 4, padding: '2px 8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Free Member
                </span>
              )}
              <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em' }}>Member since {sinceDate}</span>
              <span style={{ fontSize: 9, color: MUTED }}>·</span>
              <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em' }}>{follows.length} teams · {picks.length} picks</span>
            </div>
          </div>

          {/* Dev controls */}
          <div style={{ display: 'flex', gap: 8 }}>
            {!isPro && (
              <button onClick={() => openModal('pro')} style={{ background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '9px 18px', fontFamily: 'inherit', boxShadow: `0 0 16px ${PURPLE}55` }}>
                Upgrade to Pro →
              </button>
            )}
            <button onClick={() => setIsPro(!isPro)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 9, cursor: 'pointer', padding: '8px 12px', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              [Dev: {isPro ? 'Disable' : 'Enable'} Pro]
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── My Teams ──────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHead
            label="My Teams"
            sub={followLimit !== null ? `${follows.length} / ${followLimit} followed` : `${follows.length} followed`}
            action={
              <Link href="/teams" style={{ textDecoration: 'none', fontSize: 10, color: GREEN, border: `1px solid ${GREEN}44`, borderRadius: 6, padding: '5px 12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                Browse All →
              </Link>
            }
          />

          {follows.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '36px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🏆</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>No teams followed yet.</div>
              <Link href="/teams" style={{ textDecoration: 'none', fontSize: 10, color: GREEN, border: `1px solid ${GREEN}44`, borderRadius: 6, padding: '8px 16px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                Browse Teams →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {follows.map(f => {
                const meta  = LEAGUE_MAP[f.leagueId]
                const limit = isPro ? 10 : 3
                return (
                  <div key={f.teamSlug} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px', position: 'relative', overflow: 'hidden' }}>
                    {/* Accent bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: meta ? `linear-gradient(to right, transparent, ${meta.accent}, transparent)` : GREEN, opacity: 0.5 }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 22 }}>{meta?.emoji ?? '🏆'}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{f.teamName}</div>
                        <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{meta?.name ?? f.leagueId}</div>
                      </div>
                    </div>

                    {/* Mini chart — moneyline results */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 8, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>ML — Last {limit} Games</div>
                      <MiniChart teamName={f.teamName} limit={limit} />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link
                        href={`/leagues/${f.leagueId}/${f.teamSlug}`}
                        style={{ flex: 1, textDecoration: 'none', textAlign: 'center', fontSize: 9, color: meta?.accent ?? GREEN, border: `1px solid ${(meta?.accent ?? GREEN) + '44'}`, borderRadius: 6, padding: '6px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}
                      >
                        Full Chart →
                      </Link>
                      <button
                        onClick={() => toggleFollow(f.teamSlug, f.leagueId, f.teamName)}
                        style={{ fontSize: 9, color: '#ef4444', background: 'none', border: '1px solid #ef444433', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit', fontWeight: 600 }}
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Pro upsell if at limit */}
              {!isPro && follows.length >= FREE_FOLLOWS && (
                <div style={{ background: `${PURPLE}08`, border: `1px solid ${PURPLE}33`, borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: PURPLE, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>Free limit reached</div>
                  <div style={{ fontSize: 10, color: MUTED }}>Follow unlimited teams with Pro</div>
                  <button onClick={() => openModal('pro')} style={{ background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '8px 16px', fontFamily: 'inherit' }}>
                    Go Pro →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── My Picks ──────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHead
            label="My Picks"
            sub={pickLimit !== null ? `${picks.length} / ${pickLimit} active` : `${picks.length} active`}
            action={
              <Link href="/" style={{ textDecoration: 'none', fontSize: 10, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                Add Picks →
              </Link>
            }
          />

          {picks.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 11, color: MUTED }}>No picks added yet. Visit any team&apos;s chart to add picks.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {picks.map(p => {
                const meta = LEAGUE_MAP[p.leagueId]
                const btColor = { moneyline: GREEN, spread: '#3b82f6', over: PURPLE, under: '#b45309' }[p.betType]
                const date = new Date(p.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 18 }}>{meta?.emoji ?? '🏆'}</span>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.04em' }}>{p.teamName}</div>
                      <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>{meta?.name ?? p.leagueId} · Added {date}</div>
                    </div>
                    <div style={{ fontSize: 9, color: btColor, background: `${btColor}18`, border: `1px solid ${btColor}44`, borderRadius: 4, padding: '3px 10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, flexShrink: 0 }}>
                      {p.betType}
                    </div>
                    <Link href={`/leagues/${p.leagueId}/${p.teamSlug}`} style={{ textDecoration: 'none', fontSize: 9, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 5, padding: '4px 10px', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                      Chart →
                    </Link>
                    <button onClick={() => togglePick(p.teamSlug, p.leagueId, p.teamName, p.betType)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef444466', fontSize: 14, padding: '0 4px', flexShrink: 0 }}>
                      ×
                    </button>
                  </div>
                )
              })}

              {/* Limit warning */}
              {!isPro && picks.length >= FREE_PICKS && (
                <div style={{ background: `${PURPLE}08`, border: `1px solid ${PURPLE}33`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 10, color: MUTED }}>Free pick limit reached. Go Pro for unlimited picks.</span>
                  <button onClick={() => openModal('pro')} style={{ background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', padding: '7px 14px', fontFamily: 'inherit', flexShrink: 0 }}>
                    Go Pro →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Notifications (Pro only) ─────────────────────────────────── */}
        {isPro ? (
          <section style={{ marginBottom: 40 }}>
            <SectionHead
              label="Alerts"
              sub={unreadCount > 0 ? `${unreadCount} unread` : 'all caught up'}
              action={
                unreadCount > 0
                  ? <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit', textDecoration: 'underline' }}>Mark all read</button>
                  : undefined
              }
            />

            {notifications.length === 0 ? (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🔔</div>
                <div style={{ fontSize: 11, color: MUTED }}>No alerts yet. Follow teams to get streak and line movement alerts.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(n => {
                    const color = NOTIF_COLOR[n.type]
                    return (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        style={{
                          background: n.read ? CARD : `${color}08`,
                          border: `1px solid ${n.read ? BORDER : color + '33'}`,
                          borderLeft: `3px solid ${n.read ? BORDER : color}`,
                          borderRadius: 10, padding: '12px 16px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: n.read ? MUTED : TEXT, fontWeight: n.read ? 400 : 700, lineHeight: 1.4 }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: 9, color: MUTED, marginTop: 3, letterSpacing: '0.06em' }}>
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                        {!n.read && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                        )}
                      </div>
                    )
                  })
                }
              </div>
            )}
          </section>
        ) : (
          <section>
            <div style={{ background: `${PURPLE}08`, border: `1px solid ${PURPLE}33`, borderRadius: 12, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>🔔 Pro Alerts</div>
                <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.6 }}>
                  Streak alerts, line movement, and game-day notifications for every team you follow.
                </p>
              </div>
              <button onClick={() => openModal('pro')} style={{ background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '11px 24px', fontFamily: 'inherit', boxShadow: `0 0 20px ${PURPLE}55`, flexShrink: 0 }}>
                Unlock with Pro →
              </button>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
