'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useChopperTransition } from '@/components/ChopperTransition'



export default function SubNav() {
  const path = usePathname()
  const { warpTo } = useChopperTransition()

  const streaksActive     = path === '/todays-board'
  const leaderboardActive = path === '/leaderboard'
  const chopperActive     = path === '/chopper'
  const compareActive     = path === '/compare'
  const statsActive       = path.startsWith('/stats')

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

        {/* COMPARE */}
        <Link href="/compare" style={{ textDecoration: 'none' }}>
          <span style={linkStyle(compareActive)}>Compare</span>
        </Link>

        {/* CHOPPER — AI AGENT */}
        <a
          href="/chopper"
          onClick={e => { e.preventDefault(); warpTo('/chopper') }}
          style={{ ...linkStyle(chopperActive), cursor: 'pointer' }}
        >
          Chopper — AI Agent
        </a>

        {/* STATS */}
        <Link href="/stats" style={{ textDecoration: 'none' }}>
          <span style={linkStyle(statsActive)}>Stats</span>
        </Link>

      </div>
    </div>
  )
}
