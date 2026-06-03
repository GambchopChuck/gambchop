'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronRight, Minus, X, Send } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  Thread, SortMode, CommunityUser,
  AVAILABLE_TAGS, TAG_COLORS,
  getStoredUser, saveUser, generateUserId,
  canCreateThread, threadsRemaining, hoursUntilReset, recordThreadCreation,
  filterContent, isOffensive,
  fetchThreads, createThread,
  timeAgo, excerpt,
  SEED_THREADS,
} from '@/lib/community'
import { BET_TYPE_LABELS } from '@/lib/favorites'
import { TEAM_ROUTES } from '@/lib/teamRoutes'
import type { TopFavorite } from './page'

// ─── Design tokens ────────────────────────────────────────────────────────────

const G = {
  bg:          '#0a0d12',
  surface:     '#0f1318',
  elevated:    '#141920',
  hairline:    '#1a2030',
  cardBg:      'rgba(0,255,255,0.06)',
  cardBgHover: 'rgba(0,255,255,0.12)',
  cardBorder:  'rgba(0,255,255,0.18)',
  accentFull:  '#00ffff',
  accentFaint: 'rgba(0,255,255,0.08)',
  accentMid:   'rgba(0,255,255,0.15)',
  accentText:  'rgba(0,255,255,0.7)',
  white:       '#ffffff',
  muted:       'rgba(255,255,255,0.5)',
  dim:         'rgba(255,255,255,0.25)',
}
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'
const SANS   = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO   = 'var(--font-jetbrains), "JetBrains Mono", monospace'

// ─── Static data ──────────────────────────────────────────────────────────────

const TOP_CONTRIBUTORS = [
  { username: 'SharpEdge99',  points: 420 },
  { username: 'LineMover77',  points: 385 },
  { username: 'OddsWatcher',  points: 312 },
  { username: 'ValueBetPro',  points: 290 },
  { username: 'GambchopGuru', points: 251 },
]

const GUIDELINES = [
  'No hate speech, slurs, or discriminatory language',
  'No harassment or personal attacks',
  'No spam, self-promotion, or unsolicited links',
  'No explicit content or graphic imagery',
  'No unrelated or off-topic content',
]

const POLL = {
  question: 'Who wins the NBA Finals MVP?',
  options: [
    { name: 'Jayson Tatum',   pct: 44 },
    { name: 'Nikola Jokić',   pct: 31 },
    { name: 'SGA',            pct: 18 },
    { name: 'Luka Dončić',    pct: 7  },
  ],
  votes: 1842,
  ts: '2 hrs ago',
}

const CHAT_MSGS = [
  { initial: 'S', username: 'SharpEdge99',  text: 'Overs hitting at 68% on night games this week 🔥' },
  { initial: 'L', username: 'LineMover77',  text: 'Line moved 2.5 pts on the Cubs game, sharp action' },
  { initial: 'O', username: 'OddsWatcher',  text: 'Props market is soft tonight, good spot' },
  { initial: 'V', username: 'ValueBetPro',  text: 'Anyone tailing the Jays ML tonight?' },
  { initial: 'G', username: 'GambchopGuru', text: 'Total on BOS/NYY set too high imo' },
]

const LEAGUE_CATS: { label: string; tag: string | null }[] = [
  { label: 'ALL',   tag: null      },
  { label: 'MLB',   tag: '#MLB'    },
  { label: 'NFL',   tag: '#NFL'    },
  { label: 'NBA',   tag: '#NBA'    },
  { label: 'NHL',   tag: '#NHL'    },
  { label: 'NCAAF', tag: '#NCAAF'  },
  { label: 'NCAAB', tag: '#NCAAB'  },
  { label: 'WNBA',  tag: '#WNBA'   },
  { label: 'ATP',   tag: '#ATP'    },
  { label: 'WTA',   tag: '#WTA'    },
]

// ─── Sparkline placeholder ────────────────────────────────────────────────────

function Sparkline() {
  const pts = [40, 55, 45, 65, 50, 72, 60, 80, 68, 85]
  const w = 80, h = 28
  const max = Math.max(...pts), min = Math.min(...pts)
  const norm = (v: number) => h - ((v - min) / (max - min)) * h
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * w} ${norm(v)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={G.accentFull} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    </svg>
  )
}

// ─── Avatar circle ────────────────────────────────────────────────────────────

function Avatar({ initial, size = 28 }: { initial: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: G.accentFaint, border: `1px solid ${G.cardBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: OSWALD, fontSize: size * 0.4, color: G.accentFull,
      fontWeight: 700, flexShrink: 0, textTransform: 'uppercase',
    }}>
      {initial[0]}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: OSWALD, fontSize: 11, fontWeight: 600,
      color: G.accentFull, letterSpacing: '0.15em',
      textTransform: 'uppercase', marginBottom: 14,
    }}>
      {children}
    </div>
  )
}

// ─── Pro Gate ─────────────────────────────────────────────────────────────────

function ProGate() {
  const { openModal, setIsPro } = useAuth()
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, background: G.bg }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ fontFamily: OSWALD, fontSize: 11, color: G.accentFull, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          Members Only
        </div>
        <h1 style={{ fontFamily: OSWALD, fontSize: 56, color: G.white, margin: '0 0 20px', lineHeight: 1, fontWeight: 700, textTransform: 'uppercase' }}>
          Community Board
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 14, color: G.muted, lineHeight: 1.8, margin: '0 0 32px' }}>
          Join the Gambchop community. Discuss strategy, track line movements, share insights, and connect with serious bettors across every league.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280 }}>
          <button onClick={() => openModal('pro')} style={{
            background: G.accentFull, border: 'none', borderRadius: 0,
            color: '#000', fontFamily: OSWALD, fontSize: 13, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', padding: '13px 24px',
          }}>
            Go Pro — Unlock Community
          </button>
          <button onClick={() => openModal('join')} style={{
            background: 'transparent', border: `1px solid ${G.cardBorder}`, borderRadius: 0,
            color: G.muted, fontFamily: SANS, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', padding: '12px 24px',
          }}>
            Join Free (Limited Access)
          </button>
        </div>
        <button onClick={() => setIsPro(true)} style={{ marginTop: 32, fontFamily: MONO, fontSize: 9, color: G.dim, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'underline', padding: 0 }}>
          [Dev: Enable Pro Mode]
        </button>
      </div>
    </div>
  )
}

// ─── Username Setup ───────────────────────────────────────────────────────────

function UsernameSetup({ onSet }: { onSet: (u: CommunityUser) => void }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed.length < 3) { setErr('At least 3 characters required'); return }
    if (trimmed.length > 20) { setErr('20 characters max'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setErr('Letters, numbers, and underscores only'); return }
    if (isOffensive(trimmed)) { setErr('That username is not allowed'); return }
    const user: CommunityUser = { userId: generateUserId(), username: trimmed }
    saveUser(user)
    onSet(user)
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, background: G.bg }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: OSWALD, fontSize: 11, color: G.accentFull, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>One-time setup</div>
        <h2 style={{ fontFamily: OSWALD, fontSize: 40, color: G.white, margin: '0 0 28px', fontWeight: 700, textTransform: 'uppercase' }}>Pick Your Handle</h2>
        <input
          style={{
            width: '100%', background: G.surface, border: `1px solid ${G.cardBorder}`,
            borderRadius: 0, padding: '12px 14px', color: G.white, fontFamily: SANS,
            fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8,
          }}
          placeholder="e.g. SharpBettor99"
          value={name}
          onChange={e => { setName(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={20}
        />
        {err && <div style={{ fontFamily: SANS, fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{err}</div>}
        <div style={{ fontFamily: SANS, fontSize: 11, color: G.dim, marginBottom: 24, lineHeight: 1.6 }}>
          Letters, numbers, underscores only. Cannot be changed.
        </div>
        <button onClick={submit} style={{
          width: '100%', background: G.accentFull, border: 'none', borderRadius: 0,
          color: '#000', fontFamily: OSWALD, fontSize: 13, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', padding: '12px',
        }}>
          Set Username →
        </button>
      </div>
    </div>
  )
}

// ─── New Thread Modal ─────────────────────────────────────────────────────────

function NewThreadModal({ user, onClose, onCreate }: {
  user: CommunityUser
  onClose: () => void
  onCreate: (t: Thread) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const remaining = threadsRemaining(user.userId)
  const hours = hoursUntilReset(user.userId)

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    )
  }

  const submit = async () => {
    if (!canCreateThread(user.userId)) return
    if (title.trim().length < 10) { setErr('Title must be at least 10 characters'); return }
    if (content.trim().length < 20) { setErr('Content must be at least 20 characters'); return }
    if (isOffensive(title) || isOffensive(content)) { setErr('Content violates community guidelines'); return }
    if (selectedTags.length === 0) { setErr('Select at least one tag'); return }

    setSubmitting(true)
    const threadData = {
      user_id: user.userId,
      username: user.username,
      title: filterContent(title.trim()),
      content: filterContent(content.trim()),
      tags: selectedTags,
      status: 'approved' as const,
    }

    const saved = await createThread(threadData)
    recordThreadCreation(user.userId)

    const thread: Thread = saved ?? {
      ...threadData,
      id: 'local-' + Date.now(),
      reply_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    onCreate(thread)
    onClose()
    setSubmitting(false)
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', background: G.elevated, border: `1px solid ${G.cardBorder}`,
    borderRadius: 0, padding: '11px 14px', color: G.white, fontFamily: SANS,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: G.surface, border: `1px solid ${G.cardBorder}`, borderRadius: 0, padding: '36px 32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: G.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>

        <div style={{ fontFamily: OSWALD, fontSize: 11, color: G.accentFull, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
          {remaining} thread{remaining !== 1 ? 's' : ''} remaining today
          {remaining === 0 && ` · Resets in ${hours}h`}
        </div>
        <h2 style={{ fontFamily: OSWALD, fontSize: 32, color: G.white, margin: '0 0 24px', fontWeight: 700, textTransform: 'uppercase' }}>New Thread</h2>

        {!canCreateThread(user.userId) ? (
          <div style={{ background: '#160a0a', border: `1px solid #ef444428`, borderRadius: 0, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>⏳</div>
            <div style={{ fontFamily: SANS, fontSize: 13, color: '#ef4444', fontWeight: 700, marginBottom: 6 }}>Daily Thread Limit Reached</div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: G.muted }}>You&#39;ve created 3 threads today. Try again in <strong style={{ color: G.white }}>{hours} hour{hours !== 1 ? 's' : ''}</strong>.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontFamily: OSWALD, fontSize: 10, color: G.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Thread Title</label>
              <input style={fieldStyle} placeholder="What's your thread about?" value={title} onChange={e => { setTitle(e.target.value); setErr('') }} maxLength={120} />
              <div style={{ fontFamily: MONO, fontSize: 9, color: G.dim, textAlign: 'right', marginTop: 4 }}>{title.length}/120</div>
            </div>

            <div>
              <label style={{ fontFamily: OSWALD, fontSize: 10, color: G.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Content</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 140, resize: 'vertical' } as React.CSSProperties}
                placeholder="Share your analysis, question, or discussion topic..."
                value={content}
                onChange={e => { setContent(e.target.value); setErr('') }}
                maxLength={2000}
              />
              <div style={{ fontFamily: MONO, fontSize: 9, color: G.dim, textAlign: 'right', marginTop: 4 }}>{content.length}/2000</div>
            </div>

            <div>
              <label style={{ fontFamily: OSWALD, fontSize: 10, color: G.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Tags (up to 3)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AVAILABLE_TAGS.map(tag => {
                  const active = selectedTags.includes(tag)
                  const color = TAG_COLORS[tag] ?? G.dim
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)} style={{
                      fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: active ? color + '22' : 'transparent',
                      border: `1px solid ${active ? color : G.hairline}`,
                      color: active ? color : G.muted,
                      borderRadius: 3, padding: '4px 10px', cursor: 'pointer',
                      fontWeight: active ? 700 : 500,
                    }}>{tag}</button>
                  )
                })}
              </div>
            </div>

            {err && <div style={{ fontFamily: SANS, fontSize: 11, color: '#ef4444', background: '#160a0a', border: `1px solid #ef444428`, borderRadius: 0, padding: '8px 12px' }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={onClose} style={{
                background: 'transparent', border: `1px solid ${G.cardBorder}`, borderRadius: 0,
                color: G.muted, fontFamily: SANS, fontSize: 12,
                cursor: 'pointer', padding: '10px 18px',
              }}>Cancel</button>
              <button onClick={submit} disabled={submitting} style={{
                background: G.accentFull, border: 'none', borderRadius: 0,
                color: '#000', fontFamily: OSWALD, fontSize: 12, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', padding: '10px 20px',
                opacity: submitting ? 0.6 : 1,
              }}>
                {submitting ? 'Posting…' : 'Post Thread →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ thread }: { thread: Thread }) {
  const [hovered, setHovered] = useState(false)
  const initial = thread.username[0]?.toUpperCase() ?? '?'

  return (
    <Link href={`/community/${thread.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? G.cardBgHover : G.cardBg,
          border: `1px solid ${G.cardBorder}`,
          borderRadius: 0,
          padding: '18px 18px 14px',
          cursor: 'pointer',
          transition: 'background 200ms ease-out',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Avatar initial={initial} size={26} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: G.accentFull, fontWeight: 600 }}>@{thread.username}</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 4, flexWrap: 'wrap' }}>
            {thread.tags.slice(0, 2).map(tag => (
              <span key={tag} style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: TAG_COLORS[tag] ?? G.dim,
                background: (TAG_COLORS[tag] ?? G.dim) + '18',
                border: `1px solid ${(TAG_COLORS[tag] ?? G.dim) + '40'}`,
                borderRadius: 2, padding: '2px 5px',
              }}>{tag.replace('#', '')}</span>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: SANS, fontSize: 13, fontWeight: 700,
          color: G.white, lineHeight: 1.35,
        }}>
          {thread.title}
        </div>

        {/* Excerpt */}
        <div style={{ fontFamily: SANS, fontSize: 11, color: G.muted, lineHeight: 1.55 }}>
          {excerpt(thread.content, 80)}
        </div>

        {/* Reactions row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {[['🔥', Math.max(1, thread.reply_count * 3)], ['🏆', Math.max(1, thread.reply_count)], ['📈', Math.max(1, thread.reply_count * 2)]].map(([emoji, count]) => (
            <span key={String(emoji)} style={{ fontFamily: SANS, fontSize: 11, color: G.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
              {emoji} <span style={{ fontSize: 10 }}>{count}</span>
            </span>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <Sparkline />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 6, borderTop: `1px solid ${G.cardBorder}` }}>
          <button style={{
            fontFamily: OSWALD, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'transparent', border: `1px solid ${G.cardBorder}`, borderRadius: 0,
            color: G.muted, padding: '4px 10px', cursor: 'pointer',
          }} onClick={e => e.preventDefault()}>Reply</button>
          <button style={{
            fontFamily: OSWALD, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: G.accentFaint, border: `1px solid ${G.cardBorder}`, borderRadius: 0,
            color: G.accentFull, padding: '4px 10px', cursor: 'pointer',
          }} onClick={e => e.preventDefault()}>Vote</button>
          <span style={{ fontFamily: MONO, fontSize: 9, color: G.dim, marginLeft: 'auto' }}>
            {thread.reply_count} replies · {timeAgo(thread.created_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Left Sidebar ─────────────────────────────────────────────────────────────

function LeftSidebar({ user }: { user: CommunityUser }) {
  const [openRules, setOpenRules] = useState<number[]>([])

  const toggleRule = (i: number) => {
    setOpenRules(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  return (
    <div style={{
      width: 280, flexShrink: 0,
      borderRight: `1px solid ${G.cardBorder}`,
      paddingRight: 28, paddingTop: 0,
    }}>
      <div style={{ fontFamily: OSWALD, fontSize: 10, color: G.accentText, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
        Gambchop → Community
      </div>
      <h1 style={{ fontFamily: OSWALD, fontSize: 36, fontWeight: 700, color: G.white, margin: '0 0 10px', textTransform: 'uppercase', lineHeight: 1 }}>
        Community
      </h1>
      <p style={{ fontFamily: SANS, fontSize: 12, color: G.muted, lineHeight: 1.6, margin: '0 0 28px' }}>
        The community board is where Gambchop members trade reads on what the charts are showing.
      </p>

      <div style={{ borderTop: `1px solid ${G.cardBorder}`, paddingTop: 20, marginBottom: 24 }}>
        <SectionHeader>Community Guidelines</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {GUIDELINES.map((rule, i) => (
            <div key={i}>
              <button
                onClick={() => toggleRule(i)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontFamily: SANS, fontSize: 11, color: G.muted, textAlign: 'left', flex: 1 }}>{rule}</span>
                <ChevronRight
                  size={12}
                  color={G.dim}
                  style={{ flexShrink: 0, marginLeft: 8, transform: openRules.includes(i) ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }}
                />
              </button>
              {openRules.includes(i) && (
                <div style={{ fontFamily: SANS, fontSize: 11, color: G.dim, padding: '4px 0 8px', lineHeight: 1.6 }}>
                  Violations may result in content removal or account suspension.
                </div>
              )}
              {i < GUIDELINES.length - 1 && <div style={{ borderBottom: `1px solid ${G.hairline}` }} />}
            </div>
          ))}
        </div>
      </div>

      {/* User Contributions */}
      <div style={{ borderTop: `1px solid ${G.cardBorder}`, paddingTop: 20 }}>
        <SectionHeader>User Contributions</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TOP_CONTRIBUTORS.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px',
              background: i === 0 ? G.accentFaint : 'transparent',
              border: i === 0 ? `1px solid ${G.cardBorder}` : '1px solid transparent',
            }}>
              <span style={{ fontFamily: OSWALD, fontSize: 11, color: i === 0 ? G.accentFull : G.dim, width: 16, textAlign: 'center' }}>
                {i + 1}
              </span>
              <Avatar initial={c.username[0]} size={24} />
              <span style={{ fontFamily: SANS, fontSize: 12, color: i === 0 ? G.white : G.muted, flex: 1 }}>
                @{c.username}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: i === 0 ? G.accentFull : G.dim }}>
                {c.points}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 9, color: G.dim, letterSpacing: '0.08em' }}>
          Logged in as <span style={{ color: G.accentText }}>@{user.username}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Top Member Favorites card ────────────────────────────────────────────────

function FavoriteCard({ fav }: { fav: TopFavorite | null }) {
  if (!fav) {
    return (
      <div style={{
        background: G.elevated, border: `1px solid ${G.hairline}`,
        padding: '12px 10px', display: 'flex', flexDirection: 'column',
        gap: 6, alignItems: 'center', justifyContent: 'center', minHeight: 80,
      }}>
        <span style={{ fontFamily: SANS, fontSize: 10, color: G.dim, textAlign: 'center' }}>No data yet</span>
      </div>
    )
  }

  const chartUrl = TEAM_ROUTES[fav.team_name]
  const betLabel = (BET_TYPE_LABELS[fav.bet_type as keyof typeof BET_TYPE_LABELS] ?? fav.bet_type).toUpperCase()

  return (
    <div style={{
      background: G.elevated, border: `1px solid ${G.cardBorder}`,
      padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      {/* League badge */}
      <div style={{
        fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: G.accentFull, background: G.accentFaint,
        border: `1px solid ${G.cardBorder}`, borderRadius: 2,
        padding: '1px 5px', alignSelf: 'flex-start',
      }}>
        {fav.league_name}
      </div>

      {/* Team name */}
      <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: G.white, lineHeight: 1.2 }}>
        {fav.team_name}
      </div>

      {/* Bet type */}
      <div style={{ fontFamily: OSWALD, fontSize: 9, letterSpacing: '0.12em', color: G.accentFull }}>
        {betLabel}
      </div>

      {/* Members count */}
      <div style={{ fontFamily: SANS, fontSize: 9, color: G.muted }}>
        {fav.favorite_count} member{fav.favorite_count !== 1 ? 's' : ''}
      </div>

      {/* View Chart button */}
      {chartUrl ? (
        <Link href={chartUrl} style={{ textDecoration: 'none' }}>
          <button style={{
            fontFamily: OSWALD, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: G.accentFull, border: 'none', borderRadius: 0,
            color: '#000', padding: '4px 6px', cursor: 'pointer', width: '100%', textAlign: 'center',
            marginTop: 2,
          }}>
            VIEW CHART →
          </button>
        </Link>
      ) : (
        <div style={{
          fontFamily: OSWALD, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: G.hairline, border: 'none',
          color: G.dim, padding: '4px 6px', width: '100%', textAlign: 'center',
          marginTop: 2,
        }}>
          VIEW CHART →
        </div>
      )}
    </div>
  )
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

function RightSidebar({ topFavorites }: { topFavorites: TopFavorite[] }) {
  const [chatInput, setChatInput] = useState('')
  const [chatMsgs, setChatMsgs] = useState(CHAT_MSGS)
  const [chatOpen, setChatOpen] = useState(true)

  const sendChat = () => {
    if (!chatInput.trim()) return
    setChatMsgs(prev => [...prev, { initial: 'Y', username: 'You', text: chatInput.trim() }])
    setChatInput('')
  }

  // Pad to 4 cards with nulls for placeholder slots
  const cards: (TopFavorite | null)[] = [
    ...topFavorites.slice(0, 4),
    ...Array(Math.max(0, 4 - topFavorites.length)).fill(null),
  ]

  return (
    <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Live Poll */}
      <div style={{ background: G.cardBg, border: `1px solid ${G.cardBorder}`, padding: '16px 14px' }}>
        <SectionHeader>Live Poll</SectionHeader>
        <div style={{ fontFamily: SANS, fontSize: 12, color: G.white, fontWeight: 600, marginBottom: 12, lineHeight: 1.4 }}>
          {POLL.question}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {POLL.options.map((opt, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: SANS, fontSize: 10, color: G.muted }}>{opt.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: G.accentFull }}>{opt.pct}%</span>
              </div>
              <div style={{ height: 4, background: G.hairline, borderRadius: 2 }}>
                <div style={{ width: `${opt.pct}%`, height: '100%', background: i === 0 ? G.accentFull : G.accentText, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: G.dim, marginTop: 10 }}>
          {POLL.votes.toLocaleString()} votes · {POLL.ts}
        </div>
      </div>

      {/* Top Member Favorites */}
      <div style={{ background: G.cardBg, border: `1px solid ${G.cardBorder}`, padding: '16px 14px' }}>
        <SectionHeader>Top Member Favorites</SectionHeader>
        <p style={{ fontFamily: SANS, fontSize: 10, color: G.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
          The most saved chart rows across all members.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {cards.map((fav, i) => (
            <FavoriteCard key={i} fav={fav} />
          ))}
        </div>
      </div>

      {/* Live Text Chat */}
      <div style={{ background: '#090b0f', border: `1px solid ${G.cardBorder}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${G.cardBorder}` }}>
          <span style={{ fontFamily: OSWALD, fontSize: 12, fontWeight: 600, color: G.white, letterSpacing: '0.05em' }}>Text Chat</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setChatOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: G.dim, padding: 2 }}>
              <Minus size={12} />
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: G.dim, padding: 2 }}>
              <X size={12} />
            </button>
          </div>
        </div>
        {chatOpen && (
          <>
            <div style={{ maxHeight: 180, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMsgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <Avatar initial={m.initial} size={20} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: SANS, fontSize: 10, color: G.accentFull, fontWeight: 600 }}>{m.username} </span>
                    <span style={{ fontFamily: SANS, fontSize: 10, color: G.white, lineHeight: 1.4 }}>{m.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', borderTop: `1px solid ${G.cardBorder}`, padding: '8px 10px', gap: 6 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Message..."
                style={{
                  flex: 1, background: G.elevated, border: `1px solid ${G.hairline}`,
                  borderRadius: 0, padding: '6px 8px', color: G.white,
                  fontFamily: SANS, fontSize: 10, outline: 'none',
                }}
              />
              <button onClick={sendChat} style={{ background: G.accentFull, border: 'none', borderRadius: 0, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Send size={11} color="#000" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main exported client component ──────────────────────────────────────────

export default function CommunityClient({ topFavorites }: { topFavorites: TopFavorite[] }) {
  const { isPro, setIsPro } = useAuth()
  const [user, setUser] = useState<CommunityUser | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [sort, setSort] = useState<SortMode>('newest')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const loaded = useRef(false)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  useEffect(() => {
    if (!isPro) return
    if (loaded.current) return
    loaded.current = true
    loadThreads()
  }, [isPro]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isPro || !loaded.current) return
    loadThreads()
  }, [sort, activeTag]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadThreads() {
    setLoading(true)
    const data = await fetchThreads(sort, activeTag ?? undefined)
    setThreads(data.length > 0 ? data : SEED_THREADS)
    setLoading(false)
  }

  const sorted = [...threads]
    .sort((a, b) => {
      if (sort === 'newest')  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'popular') return b.reply_count - a.reply_count
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
    .filter(t => !activeTag || t.tags.includes(activeTag))

  if (!isPro) return <ProGate />
  if (!user)  return <UsernameSetup onSet={u => { setUser(u); saveUser(u) }} />

  return (
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: SANS }}>

      <style>{`
        .comm-scroll::-webkit-scrollbar { width: 4px; }
        .comm-scroll::-webkit-scrollbar-track { background: transparent; }
        .comm-scroll::-webkit-scrollbar-thumb { background: rgba(0,255,255,0.2); border-radius: 2px; }

        @media (max-width: 1199px) {
          .comm-right-sidebar { display: none !important; }
          .comm-center { max-width: 100% !important; }
        }
        @media (max-width: 767px) {
          .comm-left-sidebar { display: none !important; }
          .comm-layout { padding: 16px !important; }
          .comm-post-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="comm-layout"
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '64px 32px 80px',
          display: 'flex',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT SIDEBAR */}
        <div className="comm-left-sidebar">
          <LeftSidebar user={user} />
        </div>

        {/* CENTER FEED */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Tab bar + New Topic button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {LEAGUE_CATS.map(({ label, tag }) => {
                const isActive = activeTag === tag
                return (
                  <button
                    key={label}
                    onClick={() => setActiveTag(tag)}
                    style={{
                      fontFamily: OSWALD, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontWeight: 600,
                      color: isActive ? '#000' : G.muted,
                      background: isActive ? G.accentFull : 'transparent',
                      border: `1px solid ${isActive ? G.accentFull : G.cardBorder}`,
                      borderRadius: 2, padding: '5px 12px', cursor: 'pointer',
                      transition: 'all 150ms ease-out',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setShowNew(true)}
              style={{
                fontFamily: OSWALD, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
                fontWeight: 700, background: G.accentFull, border: 'none', borderRadius: 0,
                color: '#000', padding: '8px 16px', cursor: 'pointer', flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              + NEW TOPIC
            </button>
          </div>

          {/* Sort tabs */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${G.cardBorder}` }}>
            {(['newest', 'popular', 'trending'] as SortMode[]).map(s => {
              const labels: Record<SortMode, string> = { newest: 'Newest', popular: 'Most Active', trending: 'Trending' }
              const isActive = sort === s
              return (
                <button key={s} onClick={() => setSort(s)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS,
                  fontSize: 12, fontWeight: isActive ? 700 : 400,
                  color: isActive ? G.accentFull : G.muted,
                  padding: 0, letterSpacing: '0.02em',
                  borderBottom: isActive ? `2px solid ${G.accentFull}` : '2px solid transparent',
                  paddingBottom: 4,
                }}>
                  {labels[s]}
                </button>
              )
            })}
          </div>

          {/* Post grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: MONO, color: G.dim, fontSize: 11, letterSpacing: '0.1em' }}>
              Loading threads…
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
              <div style={{ fontFamily: SANS, fontSize: 13, color: G.muted }}>
                No threads yet{activeTag ? ` for ${activeTag}` : ''}. Be the first to post!
              </div>
            </div>
          ) : (
            <div
              className="comm-post-grid"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
            >
              {sorted.map(t => <PostCard key={t.id} thread={t} />)}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="comm-right-sidebar">
          <RightSidebar topFavorites={topFavorites} />
        </div>
      </div>

      {showNew && (
        <NewThreadModal
          user={user}
          onClose={() => setShowNew(false)}
          onCreate={t => setThreads(prev => [t, ...prev])}
        />
      )}
    </div>
  )
}
