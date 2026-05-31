'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
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

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  canvas:    '#0A0A0B',
  surface:   '#121215',
  elevated:  '#18181C',
  hairline:  '#1F1F23',
  strong:    '#2A2A30',
  pri:       '#F5F5F4',
  sec:       '#A1A1AA',
  muted:     '#71717A',
  faint:     '#52525B',
  accent:    '#C5F84A',
  accentDim: '#8FB833',
}
const SERIF = 'var(--font-fraunces), Georgia, serif'
const SANS  = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO  = 'var(--font-jetbrains), "JetBrains Mono", monospace'

// ─── Static sidebar data ──────────────────────────────────────────────────────

const TRENDING_NOW = [
  { label: 'Cubs bullpen collapses again — value on opponents?', tag: '#MLB' },
  { label: 'NBA Finals Game 6 total analysis', tag: '#NBA' },
  { label: 'NFL draft rookies ATS in year one', tag: '#NFL' },
  { label: "Gauff's Wimbledon draw — outright odds deep dive", tag: '#WTA' },
  { label: 'NHL Game 7 moneyline trends (home vs away)', tag: '#NHL' },
]

const TOP_CONTRIBUTORS = [
  { username: 'SharpEdge99',  threads: 42 },
  { username: 'LineMover77',  threads: 38 },
  { username: 'OddsWatcher',  threads: 31 },
  { username: 'ValueBetPro',  threads: 29 },
  { username: 'GambchopGuru', threads: 25 },
]

// ─── Pro Gate ─────────────────────────────────────────────────────────────────

function ProGate() {
  const { openModal, setIsPro } = useAuth()
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: T.accent, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
          Members Only
        </div>
        <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 56, color: T.pri, margin: '0 0 20px', lineHeight: 1.05, fontWeight: 400 }}>
          The Bettors&#39; Roundtable
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 14, color: T.muted, lineHeight: 1.8, margin: '0 0 32px' }}>
          Join the Gambchop community. Discuss strategy, track line movements, share insights, and connect with serious bettors across every league.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280 }}>
          <button onClick={() => openModal('pro')} style={{
            background: T.accent, border: 'none', borderRadius: 6,
            color: '#000', fontFamily: SANS, fontSize: 12, fontWeight: 700,
            letterSpacing: '0.04em', cursor: 'pointer', padding: '13px 24px',
            transition: 'all 200ms ease-out',
          }}>
            Go Pro — Unlock Community
          </button>
          <button onClick={() => openModal('join')} style={{
            background: 'transparent', border: `1px solid ${T.hairline}`, borderRadius: 6,
            color: T.muted, fontFamily: SANS, fontSize: 12, fontWeight: 500,
            letterSpacing: '0.02em', cursor: 'pointer', padding: '12px 24px',
            transition: 'all 200ms ease-out',
          }}>
            Join Free (Limited Access)
          </button>
        </div>
        <div style={{ marginTop: 36, paddingTop: 28, borderTop: `1px solid ${T.hairline}` }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Pro Includes</div>
          {['Full community board access', 'Create & reply to threads', 'Upvote · downvote · flag', 'All 9 betting chart metrics', 'Full season data'].map(f => (
            <div key={f} style={{ fontFamily: SANS, fontSize: 13, color: T.sec, display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
              <span style={{ width: 4, height: 4, background: T.accent, flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>
        <button onClick={() => setIsPro(true)} style={{ marginTop: 24, fontFamily: MONO, fontSize: 9, color: T.faint, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'underline', padding: 0 }}>
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
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: T.accent, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12 }}>One-time setup</div>
        <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 40, color: T.pri, margin: '0 0 28px', fontWeight: 400 }}>Pick Your Handle</h2>
        <input
          style={{
            width: '100%', background: T.surface, border: `1px solid ${T.hairline}`,
            borderRadius: 6, padding: '12px 14px', color: T.pri, fontFamily: SANS,
            fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8,
            transition: 'border-color 200ms ease-out',
          }}
          placeholder="e.g. SharpBettor99"
          value={name}
          onChange={e => { setName(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={20}
        />
        {err && <div style={{ fontFamily: SANS, fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{err}</div>}
        <div style={{ fontFamily: SANS, fontSize: 11, color: T.faint, marginBottom: 24, lineHeight: 1.6 }}>
          Letters, numbers, underscores only. Cannot be changed.
        </div>
        <button onClick={submit} style={{
          width: '100%', background: T.accent, border: 'none', borderRadius: 6,
          color: '#000', fontFamily: SANS, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.04em', cursor: 'pointer', padding: '12px',
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
    width: '100%', background: T.elevated, border: `1px solid ${T.hairline}`,
    borderRadius: 6, padding: '11px 14px', color: T.pri, fontFamily: SANS,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: T.surface, border: `1px solid ${T.hairline}`, borderRadius: 10, padding: '36px 32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>

        <div style={{ fontFamily: MONO, fontSize: 9, color: T.accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
          {remaining} thread{remaining !== 1 ? 's' : ''} remaining today
          {remaining === 0 && ` · Resets in ${hours}h`}
        </div>
        <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 32, color: T.pri, margin: '0 0 24px', fontWeight: 400 }}>New Thread</h2>

        {!canCreateThread(user.userId) ? (
          <div style={{ background: '#160a0a', border: `1px solid #ef444428`, borderRadius: 8, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>⏳</div>
            <div style={{ fontFamily: SANS, fontSize: 13, color: '#ef4444', fontWeight: 700, marginBottom: 6 }}>Daily Thread Limit Reached</div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: T.muted }}>You&#39;ve created 3 threads today. Try again in <strong style={{ color: T.pri }}>{hours} hour{hours !== 1 ? 's' : ''}</strong>.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Thread Title</label>
              <input style={fieldStyle} placeholder="What's your thread about?" value={title} onChange={e => { setTitle(e.target.value); setErr('') }} maxLength={120} />
              <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, textAlign: 'right', marginTop: 4 }}>{title.length}/120</div>
            </div>

            <div>
              <label style={{ fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Content</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 140, resize: 'vertical' } as React.CSSProperties}
                placeholder="Share your analysis, question, or discussion topic..."
                value={content}
                onChange={e => { setContent(e.target.value); setErr('') }}
                maxLength={2000}
              />
              <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, textAlign: 'right', marginTop: 4 }}>{content.length}/2000</div>
            </div>

            <div>
              <label style={{ fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Tags (up to 3)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AVAILABLE_TAGS.map(tag => {
                  const active = selectedTags.includes(tag)
                  const color = TAG_COLORS[tag] ?? T.faint
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)} style={{
                      fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: active ? color + '22' : 'transparent',
                      border: `1px solid ${active ? color : T.hairline}`,
                      color: active ? color : T.muted,
                      borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
                      fontWeight: active ? 700 : 500, transition: 'all 200ms ease-out',
                    }}>{tag}</button>
                  )
                })}
              </div>
            </div>

            {err && <div style={{ fontFamily: SANS, fontSize: 11, color: '#ef4444', background: '#160a0a', border: `1px solid #ef444428`, borderRadius: 6, padding: '8px 12px' }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={onClose} style={{
                background: 'transparent', border: `1px solid ${T.hairline}`, borderRadius: 6,
                color: T.muted, fontFamily: SANS, fontSize: 12, letterSpacing: '0.02em',
                cursor: 'pointer', padding: '10px 18px',
              }}>Cancel</button>
              <button onClick={submit} disabled={submitting} style={{
                background: T.accent, border: 'none', borderRadius: 6,
                color: '#000', fontFamily: SANS, fontSize: 12, fontWeight: 700,
                letterSpacing: '0.04em', cursor: 'pointer', padding: '10px 20px',
                opacity: submitting ? 0.6 : 1, transition: 'opacity 200ms ease-out',
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

// ─── Thread Card ──────────────────────────────────────────────────────────────

function ThreadCard({ thread, index = 0 }: { thread: Thread; index?: number }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={`/community/${thread.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 80px 80px',
          borderBottom: `1px solid ${T.hairline}`,
          padding: '20px 0',
          cursor: 'pointer',
          transition: 'background 200ms ease-out',
          background: hovered ? T.surface : 'transparent',
        }}
      >
        {/* Index */}
        <div style={{
          fontFamily: MONO, fontSize: 11, color: hovered ? T.accent : T.faint,
          paddingTop: 2, transition: 'color 200ms ease-out', letterSpacing: '0.05em',
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Content */}
        <div style={{ paddingRight: 24, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {thread.tags.map(tag => (
              <span key={tag} style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: TAG_COLORS[tag] ?? T.faint,
                border: `1px solid ${(TAG_COLORS[tag] ?? T.faint) + '40'}`,
                borderRadius: 3, padding: '2px 6px',
              }}>{tag}</span>
            ))}
          </div>
          <div style={{
            fontFamily: SANS, fontSize: 15, fontWeight: 600,
            color: hovered ? T.pri : T.sec, lineHeight: 1.3, marginBottom: 6,
            transition: 'color 200ms ease-out',
          }}>
            {thread.title}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 8 }}>
            {excerpt(thread.content)}
          </div>
          <div style={{ display: 'flex', gap: 14, fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.04em' }}>
            <span>@{thread.username}</span>
            <span>{timeAgo(thread.created_at)}</span>
            <span>Active {timeAgo(thread.updated_at)}</span>
          </div>
        </div>

        {/* Replies */}
        <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 13, color: thread.reply_count > 0 ? T.sec : T.faint, paddingTop: 2 }}>
          {thread.reply_count}
        </div>

        {/* Views (deterministic) */}
        <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 13, color: T.muted, paddingTop: 2 }}>
          {thread.reply_count * 50}
        </div>
      </div>
    </Link>
  )
}

// ─── Guidelines ───────────────────────────────────────────────────────────────

const GUIDELINES = [
  ['🚫', 'No hate speech, slurs, or discriminatory language'],
  ['🚫', 'No harassment or personal attacks'],
  ['🚫', 'No spam, self-promotion, or unsolicited links'],
  ['🚫', 'No explicit content or graphic imagery'],
  ['🚫', 'No sharing of personal financial info or account details'],
  ['📊', 'Keep discussions sports betting related'],
  ['🤝', 'Respect differing opinions and strategies'],
  ['⚖️', 'No discussion of illegal betting or unlicensed books'],
  ['🚨', 'No guaranteed picks or pump-and-dump schemes'],
  ['🔒', "No sharing of other users' personal information"],
]

function Guidelines({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '0 0 12px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', fontFamily: 'inherit',
          borderBottom: `1px solid ${T.hairline}`,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, color: T.accent, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>Community Guidelines</span>
        <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ paddingTop: 12 }}>
          {GUIDELINES.map(([icon, rule]) => (
            <div key={rule} style={{ display: 'flex', gap: 10, padding: '5px 0', fontSize: 11, fontFamily: SANS, color: T.muted, lineHeight: 1.5 }}>
              <span style={{ flexShrink: 0 }}>{icon}</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LEAGUE_CATS: { label: string; tag: string | null; color: string }[] = [
  { label: 'All',    tag: null,      color: T.accent              },
  { label: 'MLB',    tag: '#MLB',    color: TAG_COLORS['#MLB']    },
  { label: 'NFL',    tag: '#NFL',    color: TAG_COLORS['#NFL']    },
  { label: 'NBA',    tag: '#NBA',    color: TAG_COLORS['#NBA']    },
  { label: 'NHL',    tag: '#NHL',    color: TAG_COLORS['#NHL']    },
  { label: 'NCAAF',  tag: '#NCAAF',  color: TAG_COLORS['#NCAAF']  },
  { label: 'NCAAB',  tag: '#NCAAB',  color: TAG_COLORS['#NCAAB']  },
  { label: 'WNBA',   tag: '#WNBA',   color: TAG_COLORS['#WNBA']   },
  { label: 'ATP',    tag: '#ATP',    color: TAG_COLORS['#ATP']    },
  { label: 'WTA',    tag: '#WTA',    color: '#f0abfc'             },
]

export default function CommunityPage() {
  const { isPro, setIsPro } = useAuth()
  const [user, setUser] = useState<CommunityUser | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [sort, setSort] = useState<SortMode>('newest')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
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

  const sorted = [...threads].sort((a, b) => {
    if (sort === 'newest')  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sort === 'popular') return b.reply_count - a.reply_count
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  }).filter(t => !activeTag || t.tags.includes(activeTag))

  if (!isPro) return <ProGate />
  if (!user) return <UsernameSetup onSet={u => { setUser(u); saveUser(u) }} />

  const sortLabels: Record<SortMode, string> = { newest: 'Newest', popular: 'Most Active', trending: 'Trending' }

  return (
    <div style={{ minHeight: '100vh', fontFamily: SANS }}>

      <style>{`
        .community-headline {
          font-family: var(--font-oswald), sans-serif;
          font-weight: 700;
          font-size: 120px;
          line-height: 0.9;
          letter-spacing: -0.02em;
          color: #F5F5F4;
          margin: 0;
          text-transform: uppercase;
        }
        @media (max-width: 1099px) { .community-headline { font-size: 80px; } }
        @media (max-width: 767px)  { .community-headline { font-size: 56px; } }
      `}</style>

      {/* Hero */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 48px 40px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: T.accent, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 16 }}>
          Gambchop — Community
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <h1 className="community-headline">SPARK UP</h1>
          <button onClick={() => setShowNew(true)} style={{
            background: T.accent, border: 'none', borderRadius: 6,
            color: '#000', fontFamily: SANS, fontSize: 12, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            padding: '12px 20px', flexShrink: 0, transition: 'all 200ms ease-out',
          }}>
            + New Topic
          </button>
        </div>

        {/* Summary paragraphs */}
        <div style={{ marginTop: 32, marginBottom: 32, maxWidth: 620 }}>
          <p style={{ fontFamily: SANS, fontSize: 17, fontWeight: 400, color: T.sec, lineHeight: 1.6, margin: 0 }}>
            The community board is where Gambchop members trade reads on what the charts are showing — streaks worth watching, splits that don&apos;t add up, runners, and more. Bring your angle.
          </p>
          <p style={{ fontFamily: SANS, fontSize: 17, fontWeight: 400, color: T.sec, lineHeight: 1.6, margin: '16px 0 0' }}>
            Posting and replying helps you see different approaches, perspectives, and energy towards a play.
          </p>
        </div>

        <p style={{ fontFamily: SANS, fontSize: 13, color: T.muted, marginTop: 0, marginBottom: 0 }}>
          Logged in as <span style={{ color: T.sec }}>@{user.username}</span>
          {' · '}
          <span style={{ color: threadsRemaining(user.userId) > 0 ? T.sec : '#ef4444' }}>
            {threadsRemaining(user.userId)} thread{threadsRemaining(user.userId) !== 1 ? 's' : ''} remaining today
          </span>
          {' · '}
          <button onClick={() => setIsPro(false)} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontFamily: SANS, fontSize: 13, textDecoration: 'underline', padding: 0 }}>
            Leave (Demo)
          </button>
        </p>
      </div>

      {/* Category pills */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 32px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {LEAGUE_CATS.map(({ label, tag }) => {
          const isActive = activeTag === tag
          return (
            <button
              key={label}
              onClick={() => setActiveTag(tag)}
              style={{
                fontFamily: SANS, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                fontWeight: isActive ? 600 : 400, color: isActive ? T.accent : T.muted,
                background: 'transparent', border: `1px solid ${isActive ? T.accent : T.hairline}`,
                borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
                transition: 'all 200ms ease-out',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Two-column layout */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 80px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 64, alignItems: 'flex-start' }}>

        {/* Left: thread list */}
        <div style={{ minWidth: 0, borderRight: `1px solid ${T.hairline}`, paddingRight: 48 }}>

          {/* Sub-tabs + Filter row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${T.hairline}` }}>
            <div style={{ display: 'flex', gap: 28 }}>
              {(['newest', 'popular', 'trending'] as SortMode[]).map(s => {
                const isActive = sort === s
                return (
                  <button key={s} onClick={() => setSort(s)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS,
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? T.pri : T.muted, letterSpacing: '0.02em', padding: 0,
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'color 200ms ease-out',
                  }}>
                    {isActive && <span style={{ width: 4, height: 4, background: T.accent, flexShrink: 0, display: 'inline-block' }} />}
                    {sortLabels[s]}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setShowFilter(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                border: `1px solid ${showFilter ? T.accent : T.hairline}`, borderRadius: 6,
                color: showFilter ? T.accent : T.muted, fontFamily: SANS,
                fontSize: 11, letterSpacing: '0.04em', cursor: 'pointer', padding: '6px 12px',
                transition: 'all 200ms ease-out',
              }}
            >
              Filter <ChevronDown size={12} />
            </button>
          </div>

          {/* Tag filter panel */}
          {showFilter && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {AVAILABLE_TAGS.map(tag => (
                <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{
                  fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: activeTag === tag ? (TAG_COLORS[tag] ?? T.faint) + '22' : 'transparent',
                  border: `1px solid ${activeTag === tag ? (TAG_COLORS[tag] ?? T.faint) : T.hairline}`,
                  color: activeTag === tag ? (TAG_COLORS[tag] ?? T.faint) : T.muted,
                  borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
                  fontWeight: activeTag === tag ? 700 : 400, transition: 'all 200ms ease-out',
                }}>{tag}</button>
              ))}
            </div>
          )}

          {/* Active tag badge */}
          {activeTag && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Filtered by:</span>
              <button onClick={() => setActiveTag(null)} style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                background: (TAG_COLORS[activeTag] ?? T.faint) + '18',
                border: `1px solid ${(TAG_COLORS[activeTag] ?? T.faint) + '44'}`,
                color: TAG_COLORS[activeTag] ?? T.faint,
                borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
              }}>
                {activeTag} ×
              </button>
            </div>
          )}

          {/* Guidelines */}
          <Guidelines open={showGuide} onToggle={() => setShowGuide(v => !v)} />

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px', paddingBottom: 8, borderBottom: `1px solid ${T.hairline}` }}>
            <div />
            <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Topic</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>Replies</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>Views</div>
          </div>

          {/* Threads */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: MONO, color: T.faint, fontSize: 11, letterSpacing: '0.1em' }}>
              Loading threads…
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
              <div style={{ fontFamily: SANS, fontSize: 13, color: T.muted }}>
                No threads yet{activeTag ? ` for ${activeTag}` : ''}. Be the first to post!
              </div>
            </div>
          ) : (
            <div>
              {sorted.map((t, i) => <ThreadCard key={t.id} thread={t} index={i} />)}
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div style={{ paddingTop: 8 }}>

          {/* Trending Now */}
          <div style={{ borderLeft: `2px solid ${T.hairline}`, paddingLeft: 24, marginBottom: 48 }}>
            <h3 style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: T.pri, margin: '0 0 24px', fontWeight: 400, lineHeight: 1.2 }}>
              Trending Now
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {TRENDING_NOW.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, paddingTop: 1, flexShrink: 0, letterSpacing: '0.05em' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div style={{ fontFamily: SANS, fontSize: 12, color: T.sec, lineHeight: 1.5 }}>{item.label}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, marginTop: 4, letterSpacing: '0.05em' }}>{item.tag}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Contributors */}
          <div style={{ borderLeft: `2px solid ${T.hairline}`, paddingLeft: 24 }}>
            <h3 style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: T.pri, margin: '0 0 24px', fontWeight: 400, lineHeight: 1.2 }}>
              Top Contributors
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TOP_CONTRIBUTORS.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.05em' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontFamily: SANS, fontSize: 13, color: T.sec }}>@{c.username}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: T.accent }}>{c.threads}</span>
                </div>
              ))}
            </div>
          </div>
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
