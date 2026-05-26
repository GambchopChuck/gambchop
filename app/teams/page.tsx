'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LEAGUES } from '@/lib/leagues-data'
import { slugify } from '@/lib/leagues-data'

const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({ name, leagueId, accent }: {
  name: string; leagueId: string; accent: string
}) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)
  const slug = slugify(name)
  const href = `/leagues/${leagueId}/${slug}`

  return (
    <button
      onClick={() => router.push(href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#131318' : CARD,
        border: `1px solid ${hovered ? accent + '55' : BORDER}`,
        borderRadius: 10, padding: '14px 12px',
        cursor: 'pointer', transition: 'all 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 6px 20px ${accent}18` : 'none',
        width: '100%', textAlign: 'center', fontFamily: 'inherit',
        fontSize: 11, fontWeight: 800, color: '#ffffff',
        letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.3,
      }}
    >
      {name}
    </button>
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
          <TeamCard key={name} name={name} leagueId={id} accent={accent} />
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
    <div style={{ minHeight: '100vh', padding: '0 0 80px' }}>

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
