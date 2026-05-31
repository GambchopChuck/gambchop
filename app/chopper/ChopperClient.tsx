'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ─── Palette ─────────────────────────────────────────────────────────────────

const BORDER = '#000000'
const TEXT   = '#000000'
const MUTED  = '#1a1a1a'
const SUB    = '#000000'
const GREEN  = '#000000'
const BLUE   = '#0033cc'
const AMBER  = '#cc7700'
const RED    = '#cc0000'

const FONT = 'var(--font-oswald), "Oswald", sans-serif'

// ─── Types ───────────────────────────────────────────────────────────────────

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  imageDataUrl?: string
}

type Availability = {
  monthly_used: number
  monthly_remaining: number
  paid_remaining: number
  total_remaining: number
  can_start_session: boolean
}

const EXAMPLE_PROMPTS = [
  'Drop a chart screenshot — I\'ll read what\'s in it.',
  'Who\'s on the longest losing streak this week?',
  'Show me leaders in over hits this month.',
  'What\'s happening in the home vs. away splits?',
]

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════

export default function ChopperClient() {
  const { user, memberTier, loading: authLoading, openModal } = useAuth()
  const searchParams = useSearchParams()
  const topupSuccess = searchParams.get('topup_success') === 'true'
  const topupCanceled = searchParams.get('topup_canceled') === 'true'

  // Must be declared before any early returns
  const [chatThinking, setChatThinking] = useState(false)

  // Inject portal keyframes once on mount
  useEffect(() => {
    const styleId = 'chopper-portal-keyframes'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.innerHTML = `
      @keyframes chopperPortalDrift {
        0%   { background-position: 0% 50%, 100% 50%; }
        50%  { background-position: 100% 50%, 0% 50%; }
        100% { background-position: 0% 50%, 100% 50%; }
      }
      @keyframes chopperGlowPulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50%      { opacity: 0.7; transform: scale(1.04); }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.getElementById(styleId)?.remove()
    }
  }, [])

  if (authLoading) {
    return <ChopperShell><CenteredMessage label="Loading…" /></ChopperShell>
  }

  if (!user) {
    return (
      <ChopperShell>
        <SignInGate onJoin={() => openModal('join')} />
      </ChopperShell>
    )
  }

  if (memberTier !== 'pro') {
    return (
      <ChopperShell>
        <ProPaywall />
      </ChopperShell>
    )
  }

  return (
    <ChopperShell thinking={chatThinking}>
      <ChatInterface
        topupSuccess={topupSuccess}
        topupCanceled={topupCanceled}
        onThinkingChange={setChatThinking}
      />
    </ChopperShell>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Layout shell
// ═════════════════════════════════════════════════════════════════════════════

function ChopperShell({ children, thinking = false }: { children: React.ReactNode; thinking?: boolean }) {
  const driftDuration = thinking ? '4s' : '16s'

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: FONT,
      paddingLeft: 80,
      position: 'relative',
      overflow: 'hidden',
      background: `
        linear-gradient(120deg, #22c55e 0%, #8b5cf6 50%, #22c55e 100%),
        linear-gradient(240deg, #8b5cf6 0%, #22c55e 50%, #8b5cf6 100%)
      `,
      backgroundSize: '300% 300%, 300% 300%',
      backgroundPosition: '0% 50%, 100% 50%',
      backgroundBlendMode: 'screen',
      animation: `chopperPortalDrift ${driftDuration} ease-in-out infinite`,
      transition: 'animation-duration 1s ease-out',
    }}>
      {/* Soft radial glow layer that pulses while thinking */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.25) 0%, transparent 60%)',
        pointerEvents: 'none',
        animation: thinking ? 'chopperGlowPulse 1.2s ease-in-out infinite' : 'none',
        opacity: thinking ? 1 : 0.5,
        transition: 'opacity 0.6s ease-out',
      }} />

      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '48px 32px 80px',
        position: 'relative',
        zIndex: 1,
      }}>
        {children}
      </div>
    </div>
  )
}

function CenteredMessage({ label }: { label: string }) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Signed-out state
// ═════════════════════════════════════════════════════════════════════════════

function SignInGate({ onJoin }: { onJoin: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{ fontSize: 9, color: TEXT, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
        Chopper
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 16px' }}>
        Sign in to use<br />Chopper
      </h1>
      <p style={{ fontSize: 12, color: MUTED, maxWidth: 380, margin: '0 auto 32px', lineHeight: 1.7, letterSpacing: '0.02em' }}>
        Chopper reads Gambchop charts and answers questions about Gambchop data. Pro members only.
      </p>
      <button
        onClick={onJoin}
        style={{
          padding: '13px 32px', borderRadius: 8, border: 'none',
          background: '#000000',
          color: '#7CFC00', fontSize: 11, fontWeight: 900,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: FONT, transition: 'background 150ms',
        }}
      >
        Get Started
      </button>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Free-tier paywall
// ═════════════════════════════════════════════════════════════════════════════

function ProPaywall() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{ fontSize: 9, color: TEXT, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
        ⚡ Pro Feature
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 16px' }}>
        Meet Chopper
      </h1>
      <p style={{ fontSize: 12, color: MUTED, maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.7, letterSpacing: '0.02em' }}>
        Chopper reads Gambchop charts and answers questions about Gambchop data.
        Drop a chart screenshot, ask about streaks, find the leaders. Pro members get 50 sessions per month.
      </p>

      <div style={{
        background: '#ffffff', border: `2px solid ${BORDER}`, borderRadius: 12,
        padding: '24px 28px', maxWidth: 440, margin: '0 auto 32px',
        textAlign: 'left',
      }}>
        <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
          What Chopper does
        </div>
        <PaywallBullet>Reads chart screenshots (Gambchop or anywhere else)</PaywallBullet>
        <PaywallBullet>Counts streaks, splits, and leaders from Gambchop data</PaywallBullet>
        <PaywallBullet>Answers literal questions about past outcomes</PaywallBullet>
        <PaywallBullet last>Never predicts. Never picks. Just reads the data.</PaywallBullet>
      </div>

      <Link
        href="/pricing"
        style={{
          display: 'inline-block', padding: '13px 32px', borderRadius: 8,
          background: '#000000', color: '#7CFC00', fontSize: 11, fontWeight: 900,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          textDecoration: 'none', fontFamily: FONT,
        }}
      >
        Upgrade to Pro →
      </Link>
    </div>
  )
}

function PaywallBullet({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '8px 0', borderBottom: last ? 'none' : `1px solid ${BORDER}`,
    }}>
      <span style={{ color: TEXT, fontSize: 13, lineHeight: 1.2 }}>✓</span>
      <span style={{ fontSize: 11, color: TEXT, letterSpacing: '0.02em', lineHeight: 1.6 }}>{children}</span>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Chat interface (Pro members only)
// ═════════════════════════════════════════════════════════════════════════════

function ChatInterface({
  topupSuccess,
  topupCanceled,
  onThinkingChange,
}: {
  topupSuccess: boolean
  topupCanceled: boolean
  onThinkingChange: (thinking: boolean) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; base64: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [topupBanner, setTopupBanner] = useState<'success' | 'canceled' | null>(
    topupSuccess ? 'success' : topupCanceled ? 'canceled' : null
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Auto-hide top-up banner
  useEffect(() => {
    if (!topupBanner) return
    const t = setTimeout(() => setTopupBanner(null), 5000)
    return () => clearTimeout(t)
  }, [topupBanner])

  // ─── Image paste & drop handlers ──────────────────────────────────────────

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith('image/'))
      if (!item) return
      const file = item.getAsFile()
      if (file) loadImage(file)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  function loadImage(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1] ?? ''
      setPendingImage({ dataUrl, base64 })
    }
    reader.readAsDataURL(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadImage(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (file) loadImage(file)
  }

  // ─── Send message ─────────────────────────────────────────────────────────

  async function sendMessage() {
    const text = input.trim()
    if (!text && !pendingImage) return
    if (sending) return

    setError(null)
    setSending(true)
    onThinkingChange(true)

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      imageDataUrl: pendingImage?.dataUrl,
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    const imageBase64 = pendingImage?.base64
    setPendingImage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No active session — please sign in again.')

      const apiMessages = nextMessages.map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chopper/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: apiMessages, imageBase64 }),
      })

      const json = await res.json()

      if (res.status === 402) {
        // Out of sessions — surface upsell
        setAvailability(json.availability ?? null)
        setShowTopupModal(true)
        // Roll back the optimistically added user message
        setMessages(messages)
        setInput(text)
        if (imageBase64) setPendingImage({ dataUrl: userMessage.imageDataUrl ?? '', base64: imageBase64 })
        return
      }

      if (!res.ok) {
        throw new Error(json.error ?? 'Chopper failed to respond.')
      }

      setAvailability(json.availability ?? null)
      setMessages((prev) => [...prev, { role: 'assistant', content: json.reply ?? '' }])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setError(message)
      // Roll back the user message so they can edit and retry
      setMessages(messages)
      setInput(text)
    } finally {
      setSending(false)
      onThinkingChange(false)
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, color: TEXT, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
              ⚡ PRO · AI AGENT
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Chopper
            </h1>
          </div>

          <SessionCounter availability={availability} onTopup={() => setShowTopupModal(true)} />
        </div>
      </div>

      {/* Banners */}
      {topupBanner === 'success' && (
        <Banner color={GREEN} icon="✓">
          Top-up successful. Your sessions have been added.
        </Banner>
      )}
      {topupBanner === 'canceled' && (
        <Banner color={AMBER} icon="◎">
          Top-up canceled — you weren&apos;t charged.
        </Banner>
      )}
      {error && (
        <Banner color={RED} icon="✕">
          {error}
        </Banner>
      )}

      {/* Chat area — transparent, no card */}
      <div
        ref={scrollRef}
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          minHeight: 360, maxHeight: '60vh', overflowY: 'auto',
          padding: messages.length === 0 ? '40px 28px' : '24px 28px',
          marginBottom: 16,
        }}
      >
        {messages.length === 0 ? (
          <EmptyState onExampleClick={(text) => setInput(text)} />
        ) : (
          <>
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {sending && <ThinkingIndicator />}
          </>
        )}
      </div>

      {/* Pending image preview */}
      {pendingImage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
          background: '#ffffff', border: `2px solid ${BORDER}`, borderRadius: 10, padding: 10,
        }}>
          <img
            src={pendingImage.dataUrl}
            alt="pending"
            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
          />
          <span style={{ fontSize: 11, color: SUB, letterSpacing: '0.02em', flex: 1 }}>
            Image attached — send to upload
          </span>
          <button
            onClick={() => setPendingImage(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: MUTED, fontSize: 14, padding: 4,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          title="Attach image"
          style={{
            background: '#ffffff', border: `2px solid ${BORDER}`, borderRadius: 10,
            padding: '12px 14px', cursor: sending ? 'not-allowed' : 'pointer',
            color: '#000000', fontSize: 14, fontFamily: FONT,
          }}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onInputKeyDown}
          disabled={sending}
          rows={1}
          placeholder="Ask Chopper, or paste a screenshot…"
          style={{
            flex: 1, background: '#ffffff', border: `2px solid ${BORDER}`, borderRadius: 10,
            color: '#000000', fontSize: 12, padding: '12px 14px',
            fontFamily: FONT, resize: 'none', outline: 'none',
            letterSpacing: '0.02em', minHeight: 44, maxHeight: 140,
          }}
        />

        <button
          onClick={sendMessage}
          disabled={sending || (!input.trim() && !pendingImage)}
          style={{
            background: '#000000', border: 'none', borderRadius: 10,
            color: '#7CFC00', fontSize: 11, fontWeight: 900,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '13px 22px', cursor: sending ? 'not-allowed' : 'pointer',
            fontFamily: FONT,
            opacity: sending || (!input.trim() && !pendingImage) ? 0.5 : 1,
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>

      <p style={{ fontSize: 9, color: TEXT, marginTop: 14, letterSpacing: '0.05em', textAlign: 'center' }}>
        Chopper reads past outcomes. It does not predict.
      </p>

      {/* Top-up modal */}
      {showTopupModal && (
        <TopupModal
          availability={availability}
          onClose={() => setShowTopupModal(false)}
        />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Sub-components for the chat
// ═════════════════════════════════════════════════════════════════════════════

function SessionCounter({
  availability,
  onTopup,
}: {
  availability: Availability | null
  onTopup: () => void
}) {
  const monthly = availability?.monthly_remaining ?? null
  const paid = availability?.paid_remaining ?? 0
  const low = monthly !== null && monthly <= 5
  const out = monthly === 0 && paid === 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#ffffff', border: `2px solid ${BORDER}`, borderRadius: 10,
      padding: '10px 14px',
    }}>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
        Sessions
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: out ? RED : low ? AMBER : TEXT, lineHeight: 1 }}>
          {monthly !== null ? monthly : '—'}
        </span>
        <span style={{ fontSize: 10, color: MUTED, letterSpacing: '0.05em' }}>/ 50 monthly</span>
      </div>
      {paid > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, paddingLeft: 10, borderLeft: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: BLUE, lineHeight: 1 }}>+{paid}</span>
          <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.05em' }}>paid</span>
        </div>
      )}
      <button
        onClick={onTopup}
        style={{
          background: '#000000', border: 'none', borderRadius: 6,
          color: '#7CFC00', fontSize: 9, fontWeight: 900,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '5px 10px', cursor: 'pointer', fontFamily: FONT,
          marginLeft: 4,
        }}
      >
        Top up
      </button>
    </div>
  )
}

function Banner({ children, color, icon }: { children: React.ReactNode; color: string; icon: string }) {
  const isSuccess = color === GREEN
  const isAmber   = color === AMBER

  const bgColor     = isSuccess ? 'rgba(255,255,255,0.7)' : '#ffffff'
  const borderColor = isSuccess ? BORDER : isAmber ? AMBER : RED
  const textColor   = isSuccess ? TEXT   : isAmber ? AMBER : RED

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      padding: '11px 16px', marginBottom: 16,
      fontSize: 11, color: textColor, letterSpacing: '0.03em',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function EmptyState({ onExampleClick }: { onExampleClick: (text: string) => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 9, color: TEXT, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
        Try one of these
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, maxWidth: 640, margin: '0 auto' }}>
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onExampleClick(p)}
            style={{
              background: 'transparent', border: `2px solid #000000`, borderRadius: 10,
              padding: '14px 16px', cursor: 'pointer',
              fontFamily: FONT, fontSize: 11, color: TEXT,
              letterSpacing: '0.02em', textAlign: 'left', lineHeight: 1.5,
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
      <div style={{
        maxWidth: '78%',
        background: isUser ? '#000000' : '#ffffff',
        border: `2px solid #000000`,
        borderRadius: 12, padding: '12px 16px',
      }}>
        {message.imageDataUrl && (
          <img
            src={message.imageDataUrl}
            alt="upload"
            style={{ maxWidth: '100%', borderRadius: 8, marginBottom: message.content ? 10 : 0 }}
          />
        )}
        {message.content && (
          <div style={{
            fontSize: 12, color: isUser ? '#7CFC00' : '#000000',
            lineHeight: 1.7, letterSpacing: '0.02em',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {message.content}
          </div>
        )}
      </div>
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
      <div style={{
        border: `2px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px',
        background: '#ffffff',
        fontSize: 11, color: MUTED, letterSpacing: '0.1em',
      }}>
        Chopper is reading the data…
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Top-up modal
// ═════════════════════════════════════════════════════════════════════════════

function TopupModal({
  availability,
  onClose,
}: {
  availability: Availability | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState<'pack_25' | 'pack_100' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function buyPack(packId: 'pack_25' | 'pack_100') {
    setErr(null)
    setLoading(packId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No active session — please sign in again.')

      const res = await fetch('/api/chopper/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pack_id: packId }),
      })

      const json = await res.json()
      if (!res.ok || !json.checkout_url) throw new Error(json.error ?? 'Failed to start checkout.')

      window.location.href = json.checkout_url
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(null)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff', border: `2px solid ${BORDER}`, borderRadius: 14,
          padding: '32px 28px', maxWidth: 440, width: '100%',
          fontFamily: FONT,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
              Top up Chopper
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Need more sessions?
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: MUTED, fontSize: 18, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        {availability && (
          <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7, letterSpacing: '0.02em', margin: '0 0 24px' }}>
            You have <strong style={{ color: TEXT }}>{availability.monthly_remaining}</strong> monthly sessions
            and <strong style={{ color: TEXT }}>{availability.paid_remaining}</strong> paid sessions remaining.
            Top-ups expire 45 days after purchase. Monthly allowance resets on the 1st.
          </p>
        )}

        {err && <Banner color={RED} icon="✕">{err}</Banner>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PackButton
            label="25 sessions"
            price="$5"
            onClick={() => buyPack('pack_25')}
            loading={loading === 'pack_25'}
            disabled={loading !== null}
          />
          <PackButton
            label="100 sessions"
            price="$15"
            highlight
            onClick={() => buyPack('pack_100')}
            loading={loading === 'pack_100'}
            disabled={loading !== null}
          />
        </div>

        <p style={{ fontSize: 9, color: MUTED, textAlign: 'center', marginTop: 16, marginBottom: 0, letterSpacing: '0.05em' }}>
          One-time purchase · No subscription · Expires 45 days after purchase
        </p>
      </div>
    </div>
  )
}

function PackButton({
  label,
  price,
  onClick,
  loading,
  disabled,
  highlight,
}: {
  label: string
  price: string
  onClick: () => void
  loading: boolean
  disabled: boolean
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: highlight ? 'rgba(124,252,0,0.15)' : 'transparent',
        border: `2px solid ${BORDER}`,
        borderRadius: 10, padding: '16px 18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: FONT, opacity: disabled && !loading ? 0.5 : 1,
        transition: 'all 150ms',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT, letterSpacing: '0.04em' }}>
        {loading ? 'Redirecting…' : label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 900, color: TEXT, letterSpacing: '0.04em' }}>
        {price}
      </span>
    </button>
  )
}
