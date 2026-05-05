'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LEAGUES } from '@/lib/leagues-data'
import { slugify } from '@/lib/leagues-data'
import { useAuth } from '@/lib/auth-context'
import { useUser, FREE_FOLLOWS } from '@/lib/user-context'

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({ name, leagueId, emoji, accent }: {
  name: string; leagueId: string; emoji: string; accent: string
}) {
  const router = useRouter()
  const { isPro, memberTier } = useAuth()
  const { isFollowing, toggleFollow, follows } = useUser()

  const [hovered, setHovered] = useState(false)
  const slug      = slugify(name)
  const href      = `/leagues/${leagueId}/${slug}`
  const following = isFollowing(slug)
  const atLimit   = !following && !isPro && follows.length >= FREE_FOLLOWS
  const canFollow = memberTier !== 'none'

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canFollow || atLimit) return
    toggleFollow(slug, leagueId, name)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => router.push(href)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? '#131318' : CARD,
          border: `1px solid ${hovered ? accent + '55' : BORDER}`,
          borderRadius: 10, padding: '16px 14px 40px',
          cursor: 'pointer', transition: 'all 0.15s',
          transform: hovered ? 'translateY(-2px)' : 'none',
          boxShadow: hovered ? `0 6px 20px ${accent}18` : 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 10, textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}
      >
        {hovered && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${accent}, transparent)`, opacity: 0.6 }} />}
        <span style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</span>
        <div style={{ fontSize: 11, fontWeight: 800, color: hovered ? TEXT : SUB, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.3 }}>{name}</div>
        <div style={{ fontSize: 8, color: accent, background: accent + '18', border: `1px solid ${accent}33`, borderRadius: 3, padding: '2px 8px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
          View Chart →
        </div>
      </div>

      {/* Follow button — outside the nav click area */}
      {canFollow && (
        <button
          onClick={handleFollow}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: following ? `${accent}22` : atLimit ? '#1a1a24' : 'transparent',
            border: 'none', borderTop: `1px solid ${following ? accent + '44' : '#1a1a24'}`,
            borderRadius: '0 0 10px 10px',
            color: following ? accent : atLimit ? MUTED : MUTED,
            fontSize: 9, fontWeight: following ? 800 : 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: atLimit ? 'default' : 'pointer',
            padding: '8px 0', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          {following ? `✓ Following` : atLimit ? `+ Follow (Pro)` : `+ Follow`}
        </button>
      )}
    </div>
  )
}

// ─── League Section ───────────────────────────────────────────────────────────

function LeagueSection({ id, name, full, emoji, accent, entities, entityType }: {
  id: string; name: string; full: string; emoji: string
  accent: string; entities: string[]; entityType: string
}) {
  return (
    <section style={{ marginBottom: 48 }}>
      {/* League header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 0 14px', borderBottom: `1px solid ${accent}33`,
        marginBottom: 20,
      }}>
        <span style={{ fontSize: 28 }}>{emoji}</span>
        <div>
          <div style={{ fontSize: 9, color: accent, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>{full}</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>{name}</h2>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {entities.length} {entityType === 'player' ? 'Players' : 'Teams'}
          </span>
          <Link href={`/leagues/${id}`} style={{
            textDecoration: 'none', fontSize: 9, color: accent,
            border: `1px solid ${accent}44`, borderRadius: 4,
            padding: '4px 10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
          }}>
            Full Chart →
          </Link>
        </div>
      </div>

      {/* Team grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {entities.map(name => (
          <TeamCard key={name} name={name} leagueId={id} emoji={emoji} accent={accent} />
        ))}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [activeLeague, setActiveLeague] = useState<string>('all')

  const filtered = activeLeague === 'all'
    ? LEAGUES
    : LEAGUES.filter(l => l.id === activeLeague)

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'var(--font-geist-mono), monospace', padding: '0 0 80px' }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '24px 24px 20px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>Browse</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Teams</h1>
          <p style={{ fontSize: 11, color: MUTED, margin: 0, letterSpacing: '0.1em' }}>
            {LEAGUES.reduce((s, l) => s + l.entities.length, 0)} teams & players across {LEAGUES.length} leagues
          </p>
        </div>
      </div>

      {/* League filter tabs */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, background: '#08080d', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, maxWidth: 1400, margin: '0 auto', padding: '0 24px', height: 44, whiteSpace: 'nowrap' }}>
          {/* All tab */}
          <button
            onClick={() => setActiveLeague('all')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
              color: activeLeague === 'all' ? '#f4f4f5' : MUTED,
              borderBottom: activeLeague === 'all' ? '2px solid #22c55e' : '2px solid transparent',
              padding: '0 16px', height: '100%', transition: 'all 0.15s',
            }}
          >All</button>

          {LEAGUES.map(l => (
            <button
              key={l.id}
              onClick={() => setActiveLeague(l.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                color: activeLeague === l.id ? l.accent : MUTED,
                borderBottom: activeLeague === l.id ? `2px solid ${l.accent}` : '2px solid transparent',
                padding: '0 14px', height: '100%', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 12 }}>{l.emoji}</span>
              {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {filtered.map(l => (
          <LeagueSection
            key={l.id}
            id={l.id}
            name={l.name}
            full={l.full}
            emoji={l.emoji}
            accent={l.accent}
            entities={l.entities}
            entityType={l.entityType}
          />
        ))}
      </div>
    </div>
  )
}
