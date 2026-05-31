'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MONO = 'var(--font-jetbrains), "JetBrains Mono", monospace'

function SoonBadge() {
  return (
    <span style={{
      marginLeft: 8,
      display: 'inline-block',
      border: '1px solid #1F1F23',
      borderRadius: 2,
      padding: '2px 6px',
      fontFamily: MONO,
      fontSize: 9,
      fontWeight: 500,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      color: '#52525B',
      lineHeight: 1,
      verticalAlign: 'middle',
    }}>
      SOON
    </span>
  )
}

export default function SubNav() {
  const path = usePathname()

  const streaksActive     = path === '/todays-board'
  const leaderboardActive = path === '/leaderboard'
  const chopperActive     = path === '/chopper'

  const linkStyle = (active: boolean, accentColor = '#22c55e') => ({
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: active ? accentColor : '#ffffff',
    fontWeight: active ? 700 : 500,
    padding: '0 14px',
    lineHeight: '36px',
    display: 'inline-block',
    borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
    transition: 'color 0.15s',
    fontFamily: 'var(--font-nunito), sans-serif',
    textDecoration: 'none',
  })

  return (
    <div style={{
      borderBottom: '1px solid #14141c',
      background: '#0a0a0f',
      overflowX: 'auto',
      scrollbarWidth: 'none' as const,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        maxWidth: 1400, margin: '0 auto',
        paddingLeft: 64 + 16, paddingRight: 24,
        height: 36,
        whiteSpace: 'nowrap',
      }}>

        {/* STREAKS ON STREAKS */}
        <Link href="/todays-board" style={{ textDecoration: 'none' }}>
          <span style={linkStyle(streaksActive)}>Streaks on Streaks</span>
        </Link>

        {/* LEADERBOARD */}
        <Link href="/leaderboard" style={{ textDecoration: 'none' }}>
          <span style={linkStyle(leaderboardActive)}>Leaderboard</span>
        </Link>

        {/* CHOPPER — AI AGENT */}
        <Link href="/chopper" style={{ textDecoration: 'none' }}>
          <span style={linkStyle(chopperActive)}>Chopper — AI Agent</span>
        </Link>

        {/* STATS (non-clickable) */}
        <span style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#A1A1AA',
          fontWeight: 500,
          padding: '0 14px',
          lineHeight: '36px',
          display: 'inline-flex',
          alignItems: 'center',
          borderBottom: '2px solid transparent',
          opacity: 0.5,
          cursor: 'not-allowed',
          fontFamily: 'var(--font-nunito), sans-serif',
          userSelect: 'none',
        }}>
          Stats
          <SoonBadge />
        </span>

      </div>
    </div>
  )
}
