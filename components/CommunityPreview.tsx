'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { SEED_THREADS, TAG_COLORS, timeAgo, excerpt, Thread } from '@/lib/community'

const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const GREEN  = '#22c55e'

const LEAGUE_PALETTE = [
  '#22c55e', // MLB green
  '#f59e0b', // NBA amber
  '#f97316', // NFL orange
  '#3b82f6', // NHL blue
  '#ef4444', // WNBA red
  '#a855f7', // NCAAF purple
  '#6366f1', // NCAAB indigo
  '#ec4899', // NCAAWB pink
  '#84cc16', // ATP lime
  '#f0abfc', // WTA pink
  '#0891b2', // College Baseball teal
]

interface Category { label: string; tag: string | null; color: string }

const CATEGORIES: Category[] = [
  { label: 'All',    tag: null,      color: '#22c55e'              },
  { label: 'MLB',    tag: '#MLB',    color: TAG_COLORS['#MLB']     },
  { label: 'NFL',    tag: '#NFL',    color: TAG_COLORS['#NFL']     },
  { label: 'NBA',    tag: '#NBA',    color: TAG_COLORS['#NBA']     },
  { label: 'NHL',    tag: '#NHL',    color: TAG_COLORS['#NHL']     },
  { label: 'NCAAF',  tag: '#NCAAF',  color: TAG_COLORS['#NCAAF']   },
  { label: 'NCAAB',  tag: '#NCAAB',  color: TAG_COLORS['#NCAAB']   },
  { label: 'NCAAWB', tag: '#NCAAB',  color: TAG_COLORS['#NCAAB']   },
  { label: 'WNBA',   tag: '#WNBA',   color: TAG_COLORS['#WNBA']    },
  { label: 'ATP',    tag: '#ATP',    color: TAG_COLORS['#ATP']     },
  { label: 'WTA',    tag: '#WTA',    color: '#f0abfc'              },
]

function ThreadPreviewCard({ thread, index }: { thread: Thread; index: number }) {
  const cardAccent = LEAGUE_PALETTE[index % LEAGUE_PALETTE.length]
  const tagAccent  = thread.tags.length > 0 ? (TAG_COLORS[thread.tags[0]] ?? '#94a3b8') : '#94a3b8'
  return (
    <Link href={`/community/${thread.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: `radial-gradient(circle at 50% 35%, color-mix(in srgb, ${cardAccent} 100%, white 18%), color-mix(in srgb, ${cardAccent} 100%, black 22%))`,
        border: `1px solid color-mix(in srgb, ${cardAccent} 100%, white 35%)`,
        boxShadow: `0 0 0 1px color-mix(in srgb, ${cardAccent} 100%, white 40%), 0 0 22px -2px ${cardAccent}, 0 0 60px -6px ${cardAccent}, inset 0 1px 0 rgba(255,255,255,.45)`,
        borderRadius: 12,
        padding: '14px 20px',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, marginBottom: 5, lineHeight: 1.4, letterSpacing: '0.02em' }}>
          {thread.title}
        </div>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 8, lineHeight: 1.55 }}>
          {excerpt(thread.content, 85)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: MUTED, letterSpacing: '0.08em', flexWrap: 'wrap' }}>
          <span style={{ color: tagAccent }}>@{thread.username}</span>
          <span>·</span>
          <span>{timeAgo(thread.created_at)}</span>
          <span>·</span>
          <span>💬 {thread.reply_count}</span>
          {thread.tags.slice(0, 2).map(t => (
            <span key={t} style={{ color: TAG_COLORS[t] ?? '#94a3b8', letterSpacing: '0.06em' }}>{t}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}

export default function CommunityPreview() {
  const { memberTier, openModal, setIsMember } = useAuth()
  const [activeLabel, setActiveLabel] = useState<string>('All')

  const canView = memberTier !== 'none'
  const active = CATEGORIES.find(c => c.label === activeLabel) ?? CATEGORIES[0]
  const filtered = active.tag === null
    ? SEED_THREADS
    : SEED_THREADS.filter(t => t.tags.includes(active.tag!))
  const preview = filtered.slice(0, 4)

  return (
    <section style={{ borderTop: `1px solid ${BORDER}`, maxWidth: 1400, margin: '0 auto', padding: '40px 24px 56px', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-oswald), sans-serif' }}>

      {/* Background hero image */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <Image
          src="/images/communityhero-bg.png"
          alt=""
          fill
          sizes="(max-width: 1400px) 100vw, 1400px"
          style={{ objectFit: 'cover', objectPosition: 'center top', opacity: 0.08 }}
          priority={false}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.72) 100%)' }} />
      </div>

      {/* All section content sits above the background */}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>◉ Community</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            Community Board
          </h2>
          <p style={{ fontSize: 10, color: MUTED, margin: '5px 0 0', letterSpacing: '0.08em' }}>
            Strategy · Line Movement · Props · Analysis
          </p>
        </div>
        <Link href="/community" style={{
          textDecoration: 'none', fontSize: 10, color: GREEN,
          border: `1px solid ${GREEN}44`, borderRadius: 6,
          padding: '8px 16px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
          flexShrink: 0,
        }}>
          View All →
        </Link>
      </div>

      {/* League category tabs */}
      <div style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 0, whiteSpace: 'nowrap', borderBottom: `1px solid ${BORDER}` }}>
          {CATEGORIES.map(({ label, color }) => {
            const isActive = label === activeLabel
            return (
              <button
                key={label}
                onClick={() => setActiveLabel(label)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? color : MUTED,
                  borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                  padding: '8px 14px', marginBottom: -1, transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {!canView ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>💬</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            Join the Community
          </div>
          <p style={{ fontSize: 11, color: MUTED, margin: '0 auto 22px', lineHeight: 1.7, maxWidth: 380 }}>
            Discuss strategy, track line movements, share insights, and connect with serious bettors across every league.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setIsMember(true); openModal('join') }}
              style={{
                background: 'none', border: `1px solid #2a2a34`, borderRadius: 8, color: SUB,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', padding: '11px 24px', fontFamily: 'inherit',
              }}
            >
              Join Free
            </button>
            <button
              onClick={() => openModal('pro')}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: 8,
                color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', padding: '11px 24px', fontFamily: 'inherit',
                boxShadow: '0 0 20px #8b5cf655',
              }}
            >
              Go Pro — Unlock All →
            </button>
          </div>
        </div>
      ) : preview.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em' }}>
            No threads yet in this category.{' '}
            <Link href="/community" style={{ color: GREEN, textDecoration: 'none' }}>Be the first to post →</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {preview.map((t, i) => <ThreadPreviewCard key={t.id} thread={t} index={i} />)}
          <Link href="/community" style={{
            textDecoration: 'none', textAlign: 'center', display: 'block',
            fontSize: 10, color: MUTED, border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: '11px', letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 600,
          }}>
            View all threads →
          </Link>
        </div>
      )}
      </div>
    </section>
  )
}
