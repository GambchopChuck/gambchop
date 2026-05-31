'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function ChopperBanner() {
  const router = useRouter()
  const { user, memberTier, openModal } = useAuth()
  const [hovered, setHovered] = useState(false)

  // Inject portal keyframes (scoped to this component, idempotent across renders)
  useEffect(() => {
    const styleId = 'chopper-banner-keyframes'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.innerHTML = `
      @keyframes chopperBannerWarp {
        0%   { background-position: 0% 50%, 100% 50%, 50% 50%; }
        50%  { background-position: 100% 50%, 0% 50%, 50% 50%; }
        100% { background-position: 0% 50%, 100% 50%, 50% 50%; }
      }
      @keyframes chopperBannerSpeedLines {
        0%   { transform: translateX(0%); opacity: 0.35; }
        50%  { opacity: 0.55; }
        100% { transform: translateX(-50%); opacity: 0.35; }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.getElementById(styleId)?.remove()
    }
  }, [])

  function handleClick() {
    // Not signed in → open the join/signup modal with Chopper intent
    if (!user) {
      openModal('join')
      return
    }
    // Pro → straight to Chopper
    if (memberTier === 'pro') {
      router.push('/chopper')
      return
    }
    // Signed-in free member → pricing page with intent param
    router.push('/pricing?intent=chopper')
  }

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse 80% 50% at center, rgba(255,255,255,0.15) 0%, transparent 70%),
          linear-gradient(90deg, #22c55e 0%, #8b5cf6 50%, #22c55e 100%),
          linear-gradient(270deg, #8b5cf6 0%, #22c55e 50%, #8b5cf6 100%)
        `,
        backgroundSize: '100% 100%, 200% 100%, 200% 100%',
        backgroundPosition: '50% 50%, 0% 50%, 100% 50%',
        backgroundBlendMode: 'normal, multiply, normal',
        animation: 'chopperBannerWarp 14s ease-in-out infinite',
        padding: '32px 24px',
        fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
      }}
    >
      {/* Horizontal speed-lines overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 40px,
            rgba(255,255,255,0.08) 40px,
            rgba(255,255,255,0.08) 42px,
            transparent 42px,
            transparent 120px,
            rgba(255,255,255,0.12) 120px,
            rgba(255,255,255,0.12) 124px,
            transparent 124px,
            transparent 220px
          )`,
          backgroundSize: '600px 100%',
          animation: 'chopperBannerSpeedLines 4s linear infinite',
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Content row */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: '#000000',
              background: 'rgba(255,255,255,0.85)',
              padding: '6px 12px',
              borderRadius: 4,
              border: '2px solid #000000',
            }}
          >
            ⚡ Pro · AI Agent
          </span>

          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#000000',
              letterSpacing: '0.03em',
              textShadow: '0 1px 2px rgba(255,255,255,0.4)',
              lineHeight: 1.3,
            }}
          >
            Analyze with Chopper, your Gambchop AI assistant.
          </span>
        </div>

        <button
          onClick={handleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: hovered ? '#1a1a1a' : '#000000',
            color: '#22c55e',
            border: '2px solid #000000',
            borderRadius: 8,
            padding: '13px 28px',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 150ms ease-out, transform 150ms ease-out',
            transform: hovered ? 'translateY(-1px)' : 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          }}
        >
          {memberTier === 'pro' ? 'Open Chopper →' : 'Try Chopper →'}
        </button>
      </div>
    </section>
  )
}
