'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import type { TopMatchupData } from '@/lib/topMatchups'

// ─── League accent colors ─────────────────────────────────────────────────────
// TODO Phase 2: when NBA/NHL/NFL/WNBA are added, add their ticker colors here
const LEAGUE_COLORS: Record<string, string> = {
  mlb: '#39ff9a',
  // nba:  '#f97316',  // TODO: orange when NBA goes live
  // nhl:  '#38bdf8',  // TODO: sky blue when NHL goes live
  // nfl:  '#6366f1',  // TODO: indigo when NFL goes live
  // wnba: '#f472b6',  // TODO: pink when WNBA goes live
}

const LEAGUE_EMOJI: Record<string, string> = {
  mlb: '⚾',
  // nba:  '🏀',  // TODO
  // nhl:  '🏒',  // TODO
  // nfl:  '🏈',  // TODO
  // wnba: '🏀',  // TODO
}

// ─── Text helpers ──────────────────────────────────────────────────────────────

function record(cells: { result: string; date: string }[]): string {
  const w = cells.filter(c => c.result === 'win').length
  const l = cells.filter(c => c.result === 'loss').length
  return `${w}-${l}`
}

function fmtOdds(n: number | null | undefined): string {
  if (n == null) return '--'
  return n >= 0 ? `+${n}` : `${n}`
}

function fmtSpread(point: number | null | undefined): string {
  if (point == null) return '--'
  return point > 0 ? `+${point}` : `${point}`
}

// Build one plain-text segment per matchup (no JSX — goes inside the scrolling span)
function buildSegment(m: TopMatchupData): string {
  const emoji   = LEAGUE_EMOJI[m.league] ?? '🎯'
  const lg      = m.league.toUpperCase()
  const awayRec = record(m.awayForm.moneyline)
  const homeRec = record(m.homeForm.moneyline)
  const mlAway  = fmtOdds(m.lines.mlAway)
  const mlHome  = fmtOdds(m.lines.mlHome)
  const spread  = fmtSpread(m.lines.spreadAway)
  const total   = m.lines.total ?? '--'
  return `${emoji} ${lg}  ·  ${m.awayTeam} vs ${m.homeTeam}  ·  Away ${awayRec}  ·  Home ${homeRec}  ·  Line: ${mlAway} / ${mlHome}  ·  Spread: ${spread}  ·  O/U: ${total}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  matchups: TopMatchupData[]
}

export default function TopMatchupTicker({ matchups }: Props) {
  // Inject keyframes — idempotent; safe alongside ChopperBanner on the same page.
  useEffect(() => {
    const styleId = 'top-matchup-ticker-keyframes'
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
        0%   { transform: translateX(0%);   opacity: 0.35; }
        50%  {                              opacity: 0.55; }
        100% { transform: translateX(-50%); opacity: 0.35; }
      }
      @keyframes tickerScroll {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `
    document.head.appendChild(style)
    return () => { document.getElementById(styleId)?.remove() }
  }, [])

  if (!matchups.length) return null

  // One text chunk per league, separated by a heavy dot spacer
  const tickerText = matchups.map(buildSegment).join('          ⬥          ')

  // Badge color = first active league's color (all MLB right now)
  const badgeColor = LEAGUE_COLORS[matchups[0]?.league ?? ''] ?? '#39ff9a'

  return (
    <section
      style={{
        // ── Exact ChopperBanner background ─────────────────────────────────
        position:           'relative',
        overflow:           'hidden',
        background: `
          radial-gradient(ellipse 80% 50% at center, rgba(255,255,255,0.15) 0%, transparent 70%),
          linear-gradient(90deg, #22c55e 0%, #8b5cf6 50%, #22c55e 100%),
          linear-gradient(270deg, #8b5cf6 0%, #22c55e 50%, #8b5cf6 100%)
        `,
        backgroundSize:     '100% 100%, 200% 100%, 200% 100%',
        backgroundPosition: '50% 50%, 0% 50%, 100% 50%',
        backgroundBlendMode:'normal, multiply, normal',
        animation:          'chopperBannerWarp 14s ease-in-out infinite',
        // ── Height ─────────────────────────────────────────────────────────
        height:             52,
        display:            'flex',
        alignItems:         'center',
        fontFamily:         'var(--font-oswald), "Oswald", sans-serif',
      }}
    >
      {/* Horizontal speed-lines overlay — copied exactly from ChopperBanner */}
      <div
        style={{
          position:         'absolute',
          inset:            0,
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
          backgroundSize:   '600px 100%',
          animation:        'chopperBannerSpeedLines 4s linear infinite',
          pointerEvents:    'none',
          mixBlendMode:     'overlay',
        }}
      />

      {/* ── Content row ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position:   'relative',
          zIndex:     1,
          width:      '100%',
          height:     '100%',
          display:    'flex',
          alignItems: 'center',
          overflow:   'hidden',
        }}
      >
        {/* Fixed left badge — "⚡ Top Matchup" */}
        <div
          style={{
            flexShrink:  0,
            display:     'flex',
            alignItems:  'center',
            padding:     '0 14px 0 16px',
            height:      '100%',
            borderRight: '1px solid rgba(0,0,0,0.18)',
            gap:         8,
          }}
        >
          <span
            style={{
              fontSize:       9,
              fontWeight:     900,
              letterSpacing:  '0.2em',
              textTransform:  'uppercase',
              color:          '#000',
              background:     'rgba(255,255,255,0.88)',
              padding:        '4px 10px',
              borderRadius:   4,
              border:         '2px solid #000',
              whiteSpace:     'nowrap',
            }}
          >
            ⚡ Top Matchup
          </span>
          {/* League color accent chip */}
          <span
            style={{
              fontSize:      9,
              fontWeight:    900,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color:         '#000',
              background:    badgeColor,
              padding:       '3px 8px',
              borderRadius:  3,
              whiteSpace:    'nowrap',
              border:        '1.5px solid rgba(0,0,0,0.2)',
            }}
          >
            {LEAGUE_EMOJI[matchups[0]?.league ?? ''] ?? '🎯'} {matchups[0]?.league?.toUpperCase()}
          </span>
        </div>

        {/* Scrolling ticker — seamless loop: text is duplicated so translateX(-50%)
            returns to the exact start position with no visible jump. */}
        <div
          style={{
            flex:             1,
            overflow:         'hidden',
            height:           '100%',
            display:          'flex',
            alignItems:       'center',
            // Soft fade on both edges for a clean entry/exit
            maskImage:        'linear-gradient(to right, transparent 0%, black 4%, black 92%, transparent 100%)',
            WebkitMaskImage:  'linear-gradient(to right, transparent 0%, black 4%, black 92%, transparent 100%)',
          }}
        >
          <div
            style={{
              display:    'inline-flex',
              whiteSpace: 'nowrap',
              // 28 s ≈ comfortable reading pace for a typical MLB matchup string.
              // Increase duration if more leagues make the string much longer.
              animation:  'tickerScroll 28s linear infinite',
            }}
          >
            {/* Copy 1 and Copy 2 — identical, side by side. translateX(-50%) loops. */}
            {[0, 1].map(copy => (
              <span
                key={copy}
                style={{
                  fontSize:       12,
                  fontWeight:     700,
                  color:          '#000000',
                  letterSpacing:  '0.04em',
                  // Wide right padding creates the natural pause between loop cycles
                  paddingRight:   160,
                }}
              >
                {tickerText}
              </span>
            ))}
          </div>
        </div>

        {/* Fixed right button — links to /schedule/top-matchups */}
        <div style={{ flexShrink: 0, padding: '0 16px' }}>
          <Link href="/schedule/top-matchups" style={{ textDecoration: 'none' }}>
            <button
              style={{
                background:     '#000000',
                color:          '#39ff9a',
                border:         '2px solid #000000',
                borderRadius:   6,
                padding:        '7px 14px',
                fontSize:       10,
                fontWeight:     900,
                letterSpacing:  '0.15em',
                textTransform:  'uppercase',
                cursor:         'pointer',
                fontFamily:     'inherit',
                whiteSpace:     'nowrap',
                boxShadow:      '0 2px 8px rgba(0,0,0,0.3)',
                transition:     'transform 150ms ease-out',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}
            >
              TOP MATCHUPS →
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
