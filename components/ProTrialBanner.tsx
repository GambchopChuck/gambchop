'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

const ACCENT = '#39ff9a'

export default function ProTrialBanner() {
  const { isPro, loading } = useAuth()

  useEffect(() => {
    const id = 'pro-trial-banner-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.innerHTML = `
      @keyframes proTrialShimmer {
        0%   { background-position: -100% 0; }
        100% { background-position: 200% 0; }
      }
      .pro-trial-bar {
        background: linear-gradient(
          90deg,
          #071a0f 0%,
          #0f2818 25%,
          rgba(57,255,154,0.22) 50%,
          #0f2818 75%,
          #071a0f 100%
        );
        background-size: 200% 100%;
        animation: proTrialShimmer 3s ease-in-out infinite;
        border-top: 1px solid rgba(57,255,154,0.2);
        border-bottom: 1px solid rgba(57,255,154,0.2);
      }
      .pro-trial-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 24px;
        min-height: 68px;
      }
      .pro-trial-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
      }
      .pro-trial-btn {
        flex-shrink: 0;
        background: ${ACCENT};
        color: #000;
        font-weight: 700;
        font-family: var(--font-oswald), "Oswald", sans-serif;
        font-size: 13px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        border: none;
        padding: 11px 24px;
        cursor: pointer;
        white-space: nowrap;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
      }
      @media (max-width: 640px) {
        .pro-trial-inner {
          flex-direction: column;
          align-items: flex-start;
          padding: 14px 20px;
          gap: 10px;
        }
        .pro-trial-btn {
          align-self: stretch;
          justify-content: center;
        }
      }
    `
    document.head.appendChild(el)
  }, [])

  if (loading || isPro) return null

  return (
    <Link href="/pricing" style={{ textDecoration: 'none', display: 'block' }}>
      <div className="pro-trial-bar">
        <div className="pro-trial-inner">
          <div className="pro-trial-left">
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚡</span>
            <span style={{
              fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
              fontSize: 15,
              fontWeight: 500,
              color: '#ffffff',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1.35,
            }}>
              Start your free 3-day Pro trial — full chart access, Chopper AI, and more.
            </span>
          </div>
          <span className="pro-trial-btn">Get Started →</span>
        </div>
      </div>
    </Link>
  )
}
