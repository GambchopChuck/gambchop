'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  Thread, Comment, CommunityUser,
  TAG_COLORS, FLAG_REASONS,
  getStoredUser,
  filterContent, isOffensive,
  fetchThread, deleteThread as removeThread,
  fetchComments, addComment, editComment as editCommentDB, softDeleteComment, setPinned, updateVoteCounts,
  flagContent,
  getVote, setVote,
  isEditable, timeAgo,
  SEED_THREADS, SEED_COMMENTS,
} from '@/lib/community'

// ─── Commenter social profile ─────────────────────────────────────────────────

interface CommentProfile {
  display_social_1: string | null
  display_social_2: string | null
  twitter_handle:   string | null
  instagram_handle: string | null
  tiktok_handle:    string | null
  youtube_handle:   string | null
}

type ProfileMap = Record<string, CommentProfile>

async function fetchCommentProfiles(usernames: string[]): Promise<ProfileMap> {
  if (!usernames.length) return {}
  const { data } = await supabase
    .from('profiles')
    .select('username, display_social_1, display_social_2, twitter_handle, instagram_handle, tiktok_handle, youtube_handle')
    .in('username', usernames)
  if (!data) return {}
  return Object.fromEntries(data.map(p => [p.username, p as CommentProfile]))
}

// ─── Inline social icon badge (no external icon library required) ─────────────

const SOCIAL_META: Record<string, { url: (h: string) => string; color: string; label: string }> = {
  twitter:   { url: h => `https://x.com/${h}`,         color: '#94a3b8', label: 'X'  },
  instagram: { url: h => `https://instagram.com/${h}`,  color: '#e1306c', label: 'IG' },
  tiktok:    { url: h => `https://tiktok.com/@${h}`,    color: '#ff0050', label: 'TT' },
  youtube:   { url: h => `https://youtube.com/@${h}`,   color: '#ff0000', label: 'YT' },
}

function SocialBadge({ platform, handle }: { platform: string; handle: string }) {
  const meta = SOCIAL_META[platform]
  if (!meta) return null
  return (
    <a
      href={meta.url(handle)}
      target="_blank"
      rel="noopener noreferrer"
      title={`${platform}: @${handle}`}
      onClick={e => e.stopPropagation()}
      style={{
        display:        'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16,      height: 16,   borderRadius: 3,
        background:     meta.color + '22', border: `1px solid ${meta.color}55`,
        color:          meta.color, fontSize: 7, fontWeight: 900,
        textDecoration: 'none', letterSpacing: '0.03em', flexShrink: 0,
      }}
    >
      {meta.label}
    </a>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const GREEN  = '#22c55e'
const RED    = '#ef4444'
const PURPLE = '#8b5cf6'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0c0c10', border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: '11px 14px', color: TEXT,
  fontSize: 12, letterSpacing: '0.03em', outline: 'none',
  boxSizing: 'border-box',
}

const btnGreen: React.CSSProperties = {
  background: `linear-gradient(135deg, ${GREEN}, #16a34a)`, border: 'none', borderRadius: 7,
  color: '#000', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em',
  textTransform: 'uppercase', cursor: 'pointer', padding: '9px 18px',
  boxShadow: `0 0 12px ${GREEN}33`,
}

const btnGhost: React.CSSProperties = {
  background: 'none', border: `1px solid ${BORDER}`, borderRadius: 7,
  color: MUTED, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
  textTransform: 'uppercase', cursor: 'pointer', padding: '8px 14px',
  transition: 'all 0.15s',
}

// ─── Flag Modal ───────────────────────────────────────────────────────────────

function FlagModal({ targetType, targetId, reporterId, onClose }: {
  targetType: 'thread' | 'comment'
  targetId: string
  reporterId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!reason) return
    await flagContent(reporterId, targetType, targetId, reason)
    setDone(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '28px 28px', width: '100%', maxWidth: 380, position: 'relative' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18 }}>×</button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
            <div style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>Report submitted. Thank you.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 9, color: RED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Report Content</div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT, margin: '0 0 20px' }}>Why are you reporting this?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {FLAG_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)} style={{
                  background: reason === r ? RED + '18' : '#0c0c10',
                  border: `1px solid ${reason === r ? RED + '55' : BORDER}`,
                  color: reason === r ? '#fca5a5' : SUB,
                  borderRadius: 6, padding: '9px 12px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11, textAlign: 'left',
                  transition: 'all 0.15s',
                }}>{r}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={btnGhost}>Cancel</button>
              <button onClick={submit} disabled={!reason} style={{ ...btnGreen, background: `linear-gradient(135deg, ${RED}, #b91c1c)`, boxShadow: `0 0 12px ${RED}33`, opacity: reason ? 1 : 0.4 }}>
                Submit Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Comment Card ─────────────────────────────────────────────────────────────

function CommentCard({ comment, currentUser, isThreadAuthor, profile, onPin, onDelete, onEdit }: {
  comment: Comment
  currentUser: CommunityUser | null
  isThreadAuthor: boolean
  profile?: CommentProfile
  onPin: (id: string, pinned: boolean) => void
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
}) {
  const isOwn      = currentUser?.userId === comment.user_id
  const canEdit    = isOwn && isEditable(comment.created_at)
  const [editing, setEditing]   = useState(false)
  const [editVal, setEditVal]   = useState(comment.content)
  const [vote, setVoteState]    = useState<1 | -1 | 0>(() => getVote(comment.id))
  const [ups, setUps]           = useState(comment.upvotes)
  const [downs, setDowns]       = useState(comment.downvotes)
  const [flag, setFlag]         = useState(false)

  const castVote = async (v: 1 | -1) => {
    const prev = vote
    const next: 1 | -1 | 0 = prev === v ? 0 : v
    const upAdj   = (next === 1 ? 1 : 0) - (prev === 1 ? 1 : 0)
    const downAdj = (next === -1 ? 1 : 0) - (prev === -1 ? 1 : 0)
    const newUps   = Math.max(0, ups + upAdj)
    const newDowns = Math.max(0, downs + downAdj)
    setVoteState(next); setUps(newUps); setDowns(newDowns); setVote(comment.id, next)
    await updateVoteCounts(comment.id, newUps, newDowns)
  }

  const saveEdit = async () => {
    const trimmed = editVal.trim()
    if (trimmed.length < 1) return
    await onEdit(comment.id, filterContent(trimmed))
    setEditing(false)
  }

  const score = ups - downs

  return (
    <div style={{
      background: comment.is_pinned ? '#0d1a10' : CARD,
      border: `1px solid ${comment.is_pinned ? GREEN + '33' : BORDER}`,
      borderRadius: 10, padding: '16px 18px', position: 'relative',
    }}>
      {comment.is_pinned && (
        <div style={{ fontSize: 8, color: GREEN, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>📌 Pinned</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            href={`/profile/${comment.username}`}
            style={{ fontSize: 11, fontWeight: 700, color: GREEN, textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            @{comment.username}
          </Link>
          {/* Social icons from commenter's profile */}
          {profile && [profile.display_social_1, profile.display_social_2].filter(Boolean).map(platform => {
            const handleKey = `${platform}_handle` as keyof CommentProfile
            const handle = profile[handleKey]
            if (!handle || !platform) return null
            return <SocialBadge key={platform} platform={platform} handle={handle as string} />
          })}
          <span style={{ fontSize: 10, color: '#3f3f46' }}>·</span>
          <span style={{ fontSize: 10, color: MUTED }}>{timeAgo(comment.created_at)}</span>
          {isEditable(comment.created_at) && isOwn && (
            <span style={{ fontSize: 9, color: '#3f3f46', border: `1px solid #2a2a34`, borderRadius: 3, padding: '1px 5px', letterSpacing: '0.1em' }}>Editable</span>
          )}
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {isThreadAuthor && (
            <button onClick={() => onPin(comment.id, !comment.is_pinned)} style={{ ...btnGhost, padding: '4px 8px', fontSize: 9, borderColor: GREEN + '44', color: GREEN }}>
              {comment.is_pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} style={{ ...btnGhost, padding: '4px 8px', fontSize: 9 }}>Edit</button>
          )}
          {isOwn && (
            <button onClick={() => onDelete(comment.id)} style={{ ...btnGhost, padding: '4px 8px', fontSize: 9, color: RED, borderColor: RED + '44' }}>Delete</button>
          )}
          {currentUser && !isOwn && (
            <button onClick={() => setFlag(true)} style={{ ...btnGhost, padding: '4px 8px', fontSize: 9 }}>Flag</button>
          )}
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <div>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical', marginBottom: 8 }}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveEdit} style={btnGreen}>Save</button>
            <button onClick={() => { setEditing(false); setEditVal(comment.content) }} style={btnGhost}>Cancel</button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: SUB, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{comment.content}</p>
      )}

      {/* Vote row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => castVote(1)} style={{
            background: vote === 1 ? GREEN + '22' : 'none', border: `1px solid ${vote === 1 ? GREEN + '55' : BORDER}`,
            color: vote === 1 ? GREEN : MUTED, borderRadius: 5, padding: '4px 8px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
          }}>▲ <span style={{ fontSize: 10, fontWeight: 700 }}>{ups}</span></button>
          <button onClick={() => castVote(-1)} style={{
            background: vote === -1 ? RED + '18' : 'none', border: `1px solid ${vote === -1 ? RED + '44' : BORDER}`,
            color: vote === -1 ? '#fca5a5' : MUTED, borderRadius: 5, padding: '4px 8px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
          }}>▼ <span style={{ fontSize: 10, fontWeight: 700 }}>{downs}</span></button>
          <span style={{ fontSize: 10, color: score > 0 ? GREEN : score < 0 ? RED : MUTED, fontWeight: 700, marginLeft: 4 }}>
            {score > 0 ? '+' : ''}{score} karma
          </span>
        </div>
      </div>

      {flag && currentUser && (
        <FlagModal
          targetType="comment" targetId={comment.id}
          reporterId={currentUser.userId}
          onClose={() => setFlag(false)}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const router = useRouter()
  const { isPro } = useAuth()
  const [user, setUser] = useState<CommunityUser | null>(null)
  const [thread, setThread] = useState<Thread | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [profileMap, setProfileMap] = useState<ProfileMap>({})
  const [reply, setReply] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyErr, setReplyErr] = useState('')
  const [flagThread, setFlagThread] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleted, setDeleted] = useState(false)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  useEffect(() => {
    if (!threadId) return
    load()
  }, [threadId])

  async function load() {
    setLoading(true)
    let t = await fetchThread(threadId)
    if (!t) t = SEED_THREADS.find(s => s.id === threadId) ?? null
    setThread(t)

    let c = await fetchComments(threadId)
    if (c.length === 0 && SEED_COMMENTS[threadId]) c = SEED_COMMENTS[threadId]
    setComments(c)

    // Batch-fetch social profiles for all commenters
    const usernames = [...new Set(c.map((x: Comment) => x.username))]
    fetchCommentProfiles(usernames).then(setProfileMap)

    setLoading(false)
  }

  const postReply = async () => {
    if (!user || !thread) return
    if (reply.trim().length < 2) { setReplyErr('Comment is too short'); return }
    if (isOffensive(reply)) { setReplyErr('Comment violates community guidelines'); return }
    setPosting(true)
    setReplyErr('')

    const commentData = {
      thread_id: thread.id,
      user_id: user.userId,
      username: user.username,
      content: filterContent(reply.trim()),
    }
    const saved = await addComment(commentData)
    const newComment: Comment = saved ?? {
      ...commentData,
      id: 'local-' + Date.now(),
      upvotes: 0, downvotes: 0,
      is_pinned: false, is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setComments(prev => [...prev, newComment])
    setThread(prev => prev ? { ...prev, reply_count: prev.reply_count + 1, updated_at: new Date().toISOString() } : prev)
    setReply('')
    setPosting(false)
  }

  const handlePin = async (id: string, pinned: boolean) => {
    await setPinned(id, pinned)
    setComments(prev => prev.map(c => c.id === id ? { ...c, is_pinned: pinned } : c))
  }

  const handleDelete = async (id: string) => {
    await softDeleteComment(id)
    setComments(prev => prev.filter(c => c.id !== id))
    setThread(prev => prev ? { ...prev, reply_count: Math.max(0, prev.reply_count - 1) } : prev)
  }

  const handleEdit = async (id: string, content: string) => {
    await editCommentDB(id, content)
    setComments(prev => prev.map(c => c.id === id ? { ...c, content, updated_at: new Date().toISOString() } : c))
  }

  const handleDeleteThread = async () => {
    if (!thread || !user || user.userId !== thread.user_id) return
    if (!confirm('Delete this thread? This cannot be undone.')) return
    await removeThread(thread.id)
    setDeleted(true)
    setTimeout(() => router.push('/community'), 1200)
  }

  if (!isPro) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <p style={{ color: MUTED, fontSize: 12 }}>Community board is for Pro members.</p>
          <Link href="/community" style={{ color: GREEN, fontSize: 11 }}>← Back to Community</Link>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.1em' }}>
      Loading thread…
    </div>
  )

  if (!thread || deleted) return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 11, color: MUTED }}>Thread not found or removed.</div>
      <Link href="/community" style={{ color: GREEN, fontSize: 11 }}>← Back to Community</Link>
    </div>
  )

  const isAuthor = user?.userId === thread.user_id
  const sortedComments = [
    ...comments.filter(c => c.is_pinned),
    ...comments.filter(c => !c.is_pinned),
  ]

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 80px' }}>

      {/* Breadcrumb */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '12px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', color: MUTED }}>Home</Link>
          <span>/</span>
          <Link href="/community" style={{ textDecoration: 'none', color: MUTED }}>Community</Link>
          <span>/</span>
          <span style={{ color: SUB }}>Thread</span>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>

        {/* Thread header */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px 24px', marginBottom: 20 }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {thread.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700,
                color: TAG_COLORS[tag] ?? '#94a3b8',
                background: (TAG_COLORS[tag] ?? '#94a3b8') + '18',
                border: `1px solid ${(TAG_COLORS[tag] ?? '#94a3b8')}33`,
                borderRadius: 3, padding: '3px 8px',
              }}>{tag}</span>
            ))}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.02em', lineHeight: 1.3, margin: '0 0 12px' }}>
            {thread.title}
          </h1>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: MUTED, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ color: GREEN, fontWeight: 700 }}>@{thread.username}</span>
            <span>·</span>
            <span>{timeAgo(thread.created_at)}</span>
            <span>·</span>
            <span>{thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}</span>
            <span>·</span>
            <span>Active {timeAgo(thread.updated_at)}</span>
          </div>

          {/* Content */}
          <p style={{ fontSize: 13, color: SUB, lineHeight: 1.8, margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>
            {thread.content}
          </p>

          {/* Thread actions */}
          <div style={{ display: 'flex', gap: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
            {user && !isAuthor && (
              <button onClick={() => setFlagThread(true)} style={{ ...btnGhost, fontSize: 9 }}>⚑ Report Thread</button>
            )}
            {isAuthor && (
              <button onClick={handleDeleteThread} style={{ ...btnGhost, fontSize: 9, color: RED, borderColor: RED + '44' }}>Delete Thread</button>
            )}
            <Link href="/community" style={{ ...btnGhost, textDecoration: 'none', fontSize: 9, display: 'inline-block' }}>
              ← Back to Board
            </Link>
          </div>
        </div>

        {/* Comments */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </div>

          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: MUTED }}>No comments yet. Be the first to reply.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedComments.map(comment => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  currentUser={user}
                  isThreadAuthor={isAuthor}
                  profile={profileMap[comment.username]}
                  onPin={handlePin}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reply form */}
        {user ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 20px' }}>
            <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
              Reply as @{user.username}
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', marginBottom: 8 }}
              placeholder="Share your analysis, question, or insight…"
              value={reply}
              onChange={e => { setReply(e.target.value); setReplyErr('') }}
              maxLength={2000}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 10, color: replyErr ? RED : '#3f3f46' }}>{replyErr || `${reply.length}/2000`}</div>
              <button onClick={postReply} disabled={posting || reply.trim().length < 2} style={{ ...btnGreen, opacity: posting || reply.trim().length < 2 ? 0.5 : 1 }}>
                {posting ? 'Posting…' : 'Post Reply →'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 14px' }}>Sign in to join the discussion.</p>
            <Link href="/community" style={{ color: GREEN, fontSize: 11, textDecoration: 'none' }}>Set up your username →</Link>
          </div>
        )}
      </div>

      {flagThread && user && (
        <FlagModal
          targetType="thread" targetId={thread.id}
          reporterId={user.userId}
          onClose={() => setFlagThread(false)}
        />
      )}
    </div>
  )
}
