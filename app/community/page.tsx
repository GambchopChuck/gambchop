'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG       = '#0a0a0f'
const CARD     = '#0f0f14'
const BORDER   = '#1a1a24'
const TEXT     = '#f4f4f5'
const MUTED    = '#52525b'
const SUB      = '#a1a1aa'
const GREEN    = '#22c55e'
const PURPLE   = '#8b5cf6'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0c0c10', border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: '11px 14px', color: TEXT,
  fontSize: 12, letterSpacing: '0.03em', outline: 'none',
  fontFamily: 'var(--font-geist-mono), monospace', boxSizing: 'border-box',
}

const btnGreen: React.CSSProperties = {
  background: `linear-gradient(135deg, ${GREEN}, #16a34a)`, border: 'none', borderRadius: 8,
  color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
  textTransform: 'uppercase', cursor: 'pointer', padding: '11px 20px',
  fontFamily: 'var(--font-geist-mono), monospace', boxShadow: `0 0 16px ${GREEN}44`,
}

const btnGhost: React.CSSProperties = {
  background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8,
  color: SUB, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
  textTransform: 'uppercase', cursor: 'pointer', padding: '10px 18px',
  fontFamily: 'var(--font-geist-mono), monospace',
}

// ─── Pro Gate ─────────────────────────────────────────────────────────────────

function ProGate() {
  const { openModal, setIsPro } = useAuth()
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
        <div style={{ fontSize: 9, color: PURPLE, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>Members Only</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px' }}>
          Community Board
        </h1>
        <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.7, margin: '0 0 28px' }}>
          Join the Gambchop community. Discuss strategy, track line movements, share insights, and connect with serious bettors across every league.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <button onClick={() => openModal('pro')} style={{ ...btnGreen, padding: '13px 32px', background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, boxShadow: `0 0 20px ${PURPLE}55`, width: 280 }}>
            Go Pro — Unlock Community
          </button>
          <button onClick={() => openModal('join')} style={{ ...btnGhost, width: 280 }}>
            Join Free (Limited Access)
          </button>
        </div>
        <div style={{ marginTop: 24, padding: '14px 20px', background: '#0f0f14', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Pro Includes</div>
          {['Full community board access', 'Create & reply to threads', 'Upvote · downvote · flag', 'All 9 betting chart metrics', 'Full season data'].map(f => (
            <div key={f} style={{ fontSize: 11, color: SUB, display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ color: GREEN }}>✓</span>{f}
            </div>
          ))}
        </div>
        {/* Dev toggle */}
        <button onClick={() => setIsPro(true)} style={{ marginTop: 20, fontSize: 9, color: '#3f3f46', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'underline' }}>
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
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: '100%', maxWidth: 380, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '36px 32px' }}>
        <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>One-time setup</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 24px' }}>Pick Your Username</h2>
        <input
          style={{ ...inputStyle, marginBottom: 8 }}
          placeholder="e.g. SharpBettor99"
          value={name}
          onChange={e => { setName(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={20}
        />
        {err && <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 8 }}>{err}</div>}
        <div style={{ fontSize: 9, color: MUTED, marginBottom: 20, letterSpacing: '0.05em' }}>
          Letters, numbers, underscores only. Cannot be changed.
        </div>
        <button onClick={submit} style={{ ...btnGreen, width: '100%' }}>Set Username →</button>
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
        onClick={e => e.stopPropagation()}>

        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 20 }}>×</button>

        <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
          {remaining} thread{remaining !== 1 ? 's' : ''} remaining today
          {remaining === 0 && ` · Resets in ${hours}h`}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 24px' }}>New Thread</h2>

        {!canCreateThread(user.userId) ? (
          <div style={{ background: '#1a0a0a', border: '1px solid #ef444433', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, marginBottom: 6 }}>Daily Thread Limit Reached</div>
            <div style={{ fontSize: 11, color: MUTED }}>You've created 3 threads today. Try again in <strong style={{ color: TEXT }}>{hours} hour{hours !== 1 ? 's' : ''}</strong>.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Thread Title</label>
              <input style={inputStyle} placeholder="What's your thread about?" value={title} onChange={e => { setTitle(e.target.value); setErr('') }} maxLength={120} />
              <div style={{ fontSize: 9, color: '#3f3f46', textAlign: 'right', marginTop: 4 }}>{title.length}/120</div>
            </div>

            <div>
              <label style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Content</label>
              <textarea
                style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }}
                placeholder="Share your analysis, question, or discussion topic..."
                value={content}
                onChange={e => { setContent(e.target.value); setErr('') }}
                maxLength={2000}
              />
              <div style={{ fontSize: 9, color: '#3f3f46', textAlign: 'right', marginTop: 4 }}>{content.length}/2000</div>
            </div>

            <div>
              <label style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Tags (up to 3)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AVAILABLE_TAGS.map(tag => {
                  const active = selectedTags.includes(tag)
                  const color = TAG_COLORS[tag] ?? '#94a3b8'
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)} style={{
                      fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: active ? color + '22' : '#0c0c10',
                      border: `1px solid ${active ? color : BORDER}`,
                      color: active ? color : MUTED,
                      borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
                      fontFamily: 'inherit', fontWeight: active ? 700 : 500,
                      transition: 'all 0.15s',
                    }}>{tag}</button>
                  )
                })}
              </div>
            </div>

            {err && <div style={{ fontSize: 11, color: '#ef4444', background: '#1a0a0a', border: '1px solid #ef444433', borderRadius: 6, padding: '8px 12px' }}>{err}</div>}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={onClose} style={btnGhost}>Cancel</button>
              <button onClick={submit} disabled={submitting} style={{ ...btnGreen, opacity: submitting ? 0.6 : 1 }}>
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

function ThreadCard({ thread }: { thread: Thread }) {
  const firstTag = thread.tags[0]
  const tagColor = TAG_COLORS[firstTag] ?? '#94a3b8'
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={`/community/${thread.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? '#131318' : CARD,
          border: `1px solid ${hovered ? tagColor + '44' : BORDER}`,
          borderRadius: 10, padding: '18px 20px', cursor: 'pointer',
          transition: 'all 0.15s', position: 'relative', overflow: 'hidden',
          transform: hovered ? 'translateY(-1px)' : 'none',
          boxShadow: hovered ? `0 6px 24px ${tagColor}14` : 'none',
        }}
      >
        {/* Left accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: tagColor, borderRadius: '10px 0 0 10px', opacity: 0.8 }} />

        <div style={{ paddingLeft: 12 }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {thread.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700,
                color: TAG_COLORS[tag] ?? '#94a3b8',
                background: (TAG_COLORS[tag] ?? '#94a3b8') + '18',
                border: `1px solid ${(TAG_COLORS[tag] ?? '#94a3b8')}33`,
                borderRadius: 3, padding: '2px 7px',
              }}>{tag}</span>
            ))}
          </div>

          {/* Title */}
          <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, letterSpacing: '0.02em', lineHeight: 1.4, marginBottom: 8 }}>
            {thread.title}
          </div>

          {/* Preview */}
          <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6, marginBottom: 12 }}>
            {excerpt(thread.content)}
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: '#3f3f46', letterSpacing: '0.08em' }}>
            <span style={{ color: MUTED }}>@{thread.username}</span>
            <span>·</span>
            <span>{timeAgo(thread.created_at)}</span>
            <span>·</span>
            <span style={{ color: thread.reply_count > 0 ? SUB : '#3f3f46' }}>{thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}</span>
            <span>·</span>
            <span>Active {timeAgo(thread.updated_at)}</span>
          </div>
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
  ['🔒', 'No sharing of other users\' personal information'],
]

function Guidelines({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}
      >
        <span style={{ fontSize: 10, color: GREEN, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800 }}>Community Guidelines</span>
        <span style={{ color: MUTED, fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${BORDER}` }}>
          {GUIDELINES.map(([icon, rule]) => (
            <div key={rule} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: `1px solid #14141c`, fontSize: 10, color: MUTED, lineHeight: 1.5 }}>
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

export default function CommunityPage() {
  const { isPro, setIsPro } = useAuth()
  const [user, setUser] = useState<CommunityUser | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [sort, setSort] = useState<SortMode>('newest')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
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
  }, [isPro])

  useEffect(() => {
    if (!isPro || !loaded.current) return
    loadThreads()
  }, [sort, activeTag])

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

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'var(--font-geist-mono), monospace', padding: '0 0 80px' }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '20px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>◈ Gambchop</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Community Board</h1>
            <p style={{ fontSize: 10, color: MUTED, marginTop: 4, letterSpacing: '0.1em' }}>
              Logged in as <span style={{ color: GREEN }}>@{user.username}</span>
              &nbsp;·&nbsp;
              <span style={{ color: threadsRemaining(user.userId) > 0 ? SUB : '#ef4444' }}>
                {threadsRemaining(user.userId)} thread{threadsRemaining(user.userId) !== 1 ? 's' : ''} remaining today
              </span>
              &nbsp;·&nbsp;
              <button onClick={() => setIsPro(false)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, textDecoration: 'underline', padding: 0 }}>
                Leave (Demo)
              </button>
            </p>
          </div>
          <button onClick={() => setShowNew(true)} style={btnGreen}>+ New Thread</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Thread list */}
        <div style={{ flex: '1 1 600px', minWidth: 0 }}>

          {/* Sort + tag filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {(['newest', 'popular', 'trending'] as SortMode[]).map(s => (
              <button key={s} onClick={() => setSort(s)} style={{
                background: sort === s ? GREEN + '18' : 'none',
                border: `1px solid ${sort === s ? GREEN + '55' : BORDER}`,
                color: sort === s ? GREEN : MUTED,
                borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '6px 14px', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                {s === 'newest' ? '⏱ Newest' : s === 'popular' ? '💬 Most Active' : '🔥 Trending'}
              </button>
            ))}

            {activeTag && (
              <button onClick={() => setActiveTag(null)} style={{
                ...btnGhost, fontSize: 9, padding: '6px 12px',
                color: TAG_COLORS[activeTag] ?? '#94a3b8',
                borderColor: TAG_COLORS[activeTag] ?? '#94a3b8',
              }}>
                {activeTag} ×
              </button>
            )}
          </div>

          {/* Tag strip */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {AVAILABLE_TAGS.slice(0, 10).map(tag => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{
                fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                background: activeTag === tag ? (TAG_COLORS[tag] ?? '#94a3b8') + '22' : 'transparent',
                border: `1px solid ${activeTag === tag ? (TAG_COLORS[tag] ?? '#94a3b8') : BORDER}`,
                color: activeTag === tag ? (TAG_COLORS[tag] ?? '#94a3b8') : MUTED,
                borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
              }}>{tag}</button>
            ))}
          </div>

          {/* Threads */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: MUTED, fontSize: 11, letterSpacing: '0.1em' }}>
              Loading threads…
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 12, color: MUTED }}>No threads yet{activeTag ? ` for ${activeTag}` : ''}. Be the first to post!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sorted.map(t => <ThreadCard key={t.id} thread={t} />)}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <Guidelines open={showGuide} onToggle={() => setShowGuide(v => !v)} />

          {/* Board stats */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14, fontWeight: 700 }}>Board Stats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total Threads', value: threads.length },
                { label: 'Total Replies', value: threads.reduce((s, t) => s + t.reply_count, 0) },
                { label: 'Active Today', value: threads.filter(t => Date.now() - new Date(t.updated_at).getTime() < 86400000).length },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: GREEN }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Popular tags */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>Browse by Tag</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {AVAILABLE_TAGS.map(tag => (
                <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{
                  fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: activeTag === tag ? (TAG_COLORS[tag] ?? '#94a3b8') + '22' : '#0c0c10',
                  border: `1px solid ${activeTag === tag ? (TAG_COLORS[tag] ?? '#94a3b8') : BORDER}`,
                  color: activeTag === tag ? (TAG_COLORS[tag] ?? '#94a3b8') : MUTED,
                  borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 600,
                }}>{tag}</button>
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
