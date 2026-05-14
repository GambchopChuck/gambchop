'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

const PURPLE = '#8b5cf6'

export default function ActivationBanner() {
  const { memberTier } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(localStorage.getItem('gambchop-pro-activating') === '1')
  }, [])

  // Auto-dismiss when the webhook finally lands and auth-context confirms Pro
  useEffect(() => {
    if (memberTier === 'pro' && visible) {
      localStorage.removeItem('gambchop-pro-activating')
      setVisible(false)
    }
  }, [memberTier, visible])

  if (!visible) return null

  return (
    <div style={{
      background: `${PURPLE}0d`,
      borderBottom: `1px solid ${PURPLE}33`,
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      fontFamily: 'var(--font-geist-mono), monospace',
    }}>
      <span style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.04em' }}>
        ⚡ Your Pro access is activating — if features aren&apos;t unlocked yet, refresh in a moment.
      </span>
      <button
        onClick={() => { localStorage.removeItem('gambchop-pro-activating'); setVisible(false) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, color: '#52525b', lineHeight: 1, padding: 0,
          fontFamily: 'inherit', flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
