import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommunityUser {
  userId: string
  username: string
}

export interface Thread {
  id: string
  user_id: string
  username: string
  title: string
  content: string
  tags: string[]
  status: 'approved' | 'pending' | 'removed'
  reply_count: number
  bettor_type?: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  thread_id: string
  user_id: string
  username: string
  content: string
  upvotes: number
  downvotes: number
  is_pinned: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export type SortMode = 'newest' | 'popular' | 'trending'

export const AVAILABLE_TAGS = [
  '#MLB', '#NFL', '#NBA', '#NHL', '#NCAAF', '#NCAAB',
  '#WNBA', '#ATP', '#WTA', '#Strategy', '#Line Movement',
  '#Props', '#Parlays', '#Value Bets', '#General',
]

export const TAG_COLORS: Record<string, string> = {
  '#MLB': '#22c55e', '#NFL': '#f59e0b', '#NBA': '#f97316',
  '#NHL': '#3b82f6', '#NCAAF': '#ef4444', '#NCAAB': '#a855f7',
  '#WNBA': '#ec4899', '#ATP': '#84cc16', '#WTA': '#f0abfc',
  '#Strategy': '#14b8a6', '#Line Movement': '#eab308', '#Props': '#8b5cf6',
  '#Parlays': '#f97316', '#Value Bets': '#22c55e', '#General': '#94a3b8',
}

export const FLAG_REASONS = [
  'Hate speech / slurs',
  'Harassment or personal attacks',
  'Spam or self-promotion',
  'Illegal betting discussion',
  'Guaranteed picks / scam',
  'Sharing personal information',
  'Off-topic',
  'Other',
]

// ─── Content Filter ───────────────────────────────────────────────────────────
// Pattern list intentionally minimal — extend with your moderation wordlist

const OFFENSIVE_PATTERNS: RegExp[] = []

export function filterContent(text: string): string {
  return OFFENSIVE_PATTERNS.reduce(
    (t, p) => t.replace(p, m => '*'.repeat(m.length)),
    text,
  )
}

export function isOffensive(text: string): boolean {
  return OFFENSIVE_PATTERNS.some(p => p.test(text))
}

// ─── User Identity ────────────────────────────────────────────────────────────

export function getStoredUser(): CommunityUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('gambchop-community-user')
  return raw ? JSON.parse(raw) : null
}

export function saveUser(user: CommunityUser): void {
  localStorage.setItem('gambchop-community-user', JSON.stringify(user))
}

export function generateUserId(): string {
  return 'user-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const THREAD_LIMIT  = 3
const WINDOW_HOURS  = 24
const WINDOW_MS     = WINDOW_HOURS * 60 * 60 * 1000

function getRecentStamps(userId: string): number[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(`gambchop-threads-${userId}`)
  const all: number[] = raw ? JSON.parse(raw) : []
  return all.filter(t => Date.now() - t < WINDOW_MS)
}

export function canCreateThread(userId: string): boolean {
  return getRecentStamps(userId).length < THREAD_LIMIT
}

export function threadsRemaining(userId: string): number {
  return Math.max(0, THREAD_LIMIT - getRecentStamps(userId).length)
}

export function hoursUntilReset(userId: string): number {
  const stamps = getRecentStamps(userId)
  if (stamps.length < THREAD_LIMIT) return 0
  const oldest = Math.min(...stamps)
  return Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 3600000))
}

export function recordThreadCreation(userId: string): void {
  const fresh = getRecentStamps(userId)
  localStorage.setItem(`gambchop-threads-${userId}`, JSON.stringify([...fresh, Date.now()]))
}

// ─── Votes (localStorage) ─────────────────────────────────────────────────────

export function getVote(commentId: string): 1 | -1 | 0 {
  if (typeof window === 'undefined') return 0
  const raw = localStorage.getItem(`vote-${commentId}`)
  return raw ? (parseInt(raw) as 1 | -1 | 0) : 0
}

export function setVote(commentId: string, v: 1 | -1 | 0): void {
  localStorage.setItem(`vote-${commentId}`, String(v))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isEditable(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 5 * 60 * 1000
}

export function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function excerpt(text: string, len = 120): string {
  return text.length > len ? text.slice(0, len).trimEnd() + '…' : text
}

// ─── Supabase Queries ─────────────────────────────────────────────────────────

export async function fetchThreads(sort: SortMode, tag?: string): Promise<Thread[]> {
  try {
    let q = supabase.from('community_threads').select('*').neq('status', 'removed')
    if (tag) q = q.contains('tags', [tag])
    if (sort === 'newest')  q = q.order('created_at', { ascending: false })
    else if (sort === 'popular')  q = q.order('reply_count', { ascending: false })
    else q = q.order('updated_at', { ascending: false })
    const { data, error } = await q.limit(60)
    if (error) throw error
    return data ?? []
  } catch {
    return []
  }
}

export async function fetchThread(id: string): Promise<Thread | null> {
  try {
    const { data, error } = await supabase.from('community_threads').select('*').eq('id', id).single()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

export async function createThread(t: Omit<Thread, 'id' | 'created_at' | 'updated_at' | 'reply_count'>): Promise<Thread | null> {
  try {
    const { data, error } = await supabase
      .from('community_threads')
      .insert({ ...t, reply_count: 0 })
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

export async function deleteThread(id: string): Promise<void> {
  try { await supabase.from('community_threads').update({ status: 'removed' }).eq('id', id) } catch {}
}

export async function fetchComments(threadId: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('thread_id', threadId)
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  } catch {
    return []
  }
}

export async function addComment(c: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'upvotes' | 'downvotes' | 'is_pinned' | 'is_deleted'>): Promise<Comment | null> {
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .insert({ ...c, upvotes: 0, downvotes: 0, is_pinned: false, is_deleted: false })
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

export async function editComment(id: string, content: string): Promise<void> {
  try { await supabase.from('community_comments').update({ content, updated_at: new Date().toISOString() }).eq('id', id) } catch {}
}

export async function softDeleteComment(id: string): Promise<void> {
  try { await supabase.from('community_comments').update({ is_deleted: true }).eq('id', id) } catch {}
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  try { await supabase.from('community_comments').update({ is_pinned: pinned }).eq('id', id) } catch {}
}

export async function updateVoteCounts(id: string, upvotes: number, downvotes: number): Promise<void> {
  try { await supabase.from('community_comments').update({ upvotes, downvotes }).eq('id', id) } catch {}
}

export async function flagContent(reporterId: string, targetType: 'thread' | 'comment', targetId: string, reason: string): Promise<void> {
  try {
    await supabase.from('community_flags').insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason })
  } catch {}
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

export const SEED_THREADS: Thread[] = [
  { id: 'seed-1', user_id: 'mod', username: 'GambchopMod', title: '📌 Welcome to the Community Board — Read Before Posting', content: "Welcome to Gambchop Community! This is your hub for sports betting strategy, analysis, and connecting with serious bettors. Please review the community guidelines before posting. Let's keep it clean, analytical, and valuable.", tags: ['#General'], status: 'approved', reply_count: 42, created_at: ago(7 * 86400000), updated_at: ago(2 * 3600000) },
  { id: 'seed-2', user_id: 'ua', username: 'SharpBettor99', title: 'Line Movement Thread — Post Your Daily Observations Here', content: "Tracking significant line movements across all sports. Post the game, opening line, current line, and your read on the steam or public money. Updating daily.", tags: ['#Line Movement', '#Strategy'], status: 'approved', reply_count: 87, created_at: ago(3 * 86400000), updated_at: ago(1 * 3600000) },
  { id: 'seed-3', user_id: 'ub', username: 'MLBAnalyst', title: 'MLB Totals Trend — Unders Hitting 58% in April, Here\'s Why', content: "Been tracking MLB totals this month and unders are crushing it. Starting pitching depth is way down across the league. Check the Gambchop chart — Houston's Under streak is at 7 games and counting.", tags: ['#MLB', '#Strategy'], status: 'approved', reply_count: 31, created_at: ago(86400000), updated_at: ago(30 * 60000) },
  { id: 'seed-4', user_id: 'uc', username: 'PropHunter', title: 'Best Props This Week — Drop Your Finds Below', content: "Share your best prop bets for the week. Include player, stat line, sportsbook, and your reasoning. Let's surface the value together.", tags: ['#Props', '#NFL', '#NBA'], status: 'approved', reply_count: 56, created_at: ago(12 * 3600000), updated_at: ago(10 * 60000) },
  { id: 'seed-5', user_id: 'ud', username: 'TennisEdge', title: 'ATP Clay Season — Fading the Chalk Is Printing This Month', content: "Clay season is where the biggest upset value lives in tennis. Heavy servers and power hitters get exposed on clay. Tracking +150 dogs at 48% cover rate since Roland Garros qualifying began.", tags: ['#ATP', '#Strategy'], status: 'approved', reply_count: 18, created_at: ago(4 * 3600000), updated_at: ago(2 * 3600000) },
  { id: 'seed-6', user_id: 'ue', username: 'NFLContrarian', title: 'NFL Division Dog Theory — Why Home Underdogs Print in AFC North', content: "Division underdogs at home beat the spread at a historically high rate, and no division does it like the AFC North. Coaches know each other, familiarity removes the chalk team's edge.", tags: ['#NFL', '#Strategy', '#Value Bets'], status: 'approved', reply_count: 23, created_at: ago(2 * 86400000), updated_at: ago(5 * 3600000) },
  { id: 'seed-7', user_id: 'uf', username: 'NBASharp', title: 'Back-to-Back Totals — Best System for Fading the Over', content: "Teams on the second game of a back-to-back go under the total at a 54% rate when the total is set at 228.5 or higher. Small edge but consistent sample across 3 seasons.", tags: ['#NBA', '#Strategy'], status: 'approved', reply_count: 44, created_at: ago(36 * 3600000), updated_at: ago(3 * 3600000) },
]

export const SEED_COMMENTS: Record<string, Comment[]> = {
  'seed-1': [
    { id: 'sc-1a', thread_id: 'seed-1', user_id: 'mod', username: 'GambchopMod', content: 'Quick reminder: no guaranteed pick services, no referral links, and keep all discussion sports betting related. Thanks for keeping the board clean.', upvotes: 28, downvotes: 0, is_pinned: true, is_deleted: false, created_at: ago(6 * 86400000), updated_at: ago(6 * 86400000) },
    { id: 'sc-1b', thread_id: 'seed-1', user_id: 'ua', username: 'SharpBettor99', content: 'Great to have a proper community for this. Most betting forums are full of tout spam. Looking forward to actual discussion here.', upvotes: 14, downvotes: 1, is_pinned: false, is_deleted: false, created_at: ago(5 * 86400000), updated_at: ago(5 * 86400000) },
    { id: 'sc-1c', thread_id: 'seed-1', user_id: 'ub', username: 'MLBAnalyst', content: 'The Gambchop chart feature is genuinely useful — never had a visual this clean for tracking ATS trends across a full roster of teams.', upvotes: 19, downvotes: 0, is_pinned: false, is_deleted: false, created_at: ago(4 * 86400000), updated_at: ago(4 * 86400000) },
  ],
  'seed-2': [
    { id: 'sc-2a', thread_id: 'seed-2', user_id: 'ud', username: 'TennisEdge', content: 'Noticed LAD opened -165, steamed to -180 by game time. Public money AND sharp action on the same side. Rare alignment.', upvotes: 22, downvotes: 2, is_pinned: true, is_deleted: false, created_at: ago(2 * 86400000), updated_at: ago(2 * 86400000) },
    { id: 'sc-2b', thread_id: 'seed-2', user_id: 'ue', username: 'NFLContrarian', content: 'Chiefs/Raiders line moved from -7.5 to -9.5 in 48 hours. That kind of move screams injury news incoming or sharp positioning.', upvotes: 31, downvotes: 1, is_pinned: false, is_deleted: false, created_at: ago(86400000), updated_at: ago(86400000) },
  ],
  'seed-3': [
    { id: 'sc-3a', thread_id: 'seed-3', user_id: 'uf', username: 'NBASharp', content: 'Pitching injuries are the main driver but the juiced ball speculation is also worth tracking. Unders in April are historically good before offenses heat up in June.', upvotes: 17, downvotes: 0, is_pinned: false, is_deleted: false, created_at: ago(20 * 3600000), updated_at: ago(20 * 3600000) },
    { id: 'sc-3b', thread_id: 'seed-3', user_id: 'ua', username: 'SharpBettor99', content: 'HOU under streak is notable. They haven\'t gone over in 8 straight. That\'s either a system or it\'s due for regression. I\'m siding with regression now.', upvotes: 9, downvotes: 4, is_pinned: false, is_deleted: false, created_at: ago(10 * 3600000), updated_at: ago(10 * 3600000) },
  ],
}
