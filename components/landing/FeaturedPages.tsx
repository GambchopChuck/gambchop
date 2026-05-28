import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// ─── Design tokens (mirrors community page) ───────────────────────────────────

const T = {
  elevated:  '#18181C',
  hairline:  '#1F1F23',
  pri:       '#F5F5F4',
  sec:       '#A1A1AA',
  muted:     '#71717A',
  faint:     '#52525B',
  accent:    '#C5F84A',
}
const SERIF = 'var(--font-fraunces), Georgia, serif'
const SANS  = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO  = 'var(--font-jetbrains), "JetBrains Mono", monospace'

// ─── Streaks preview data ─────────────────────────────────────────────────────

const WIN   = '#22C55E'
const LOSS  = '#EF4444'
const OVER  = '#A855F7'
const UNDER = '#7DD3FC'
const PUSH  = '#FACC15'
const BONUS = '#F472B6'

const ROW1 = [WIN, WIN, WIN, WIN, WIN, WIN, WIN, LOSS, WIN, WIN, WIN, WIN, WIN, WIN]
const ROW2 = [OVER, OVER, UNDER, OVER, OVER, OVER, OVER, OVER, OVER, PUSH, OVER, OVER, OVER, OVER]
const ROW3 = [WIN, LOSS, WIN, WIN, BONUS, WIN, WIN, WIN, LOSS, WIN, WIN, WIN, WIN, BONUS]

const STREAKS_FULL  = [ROW1, ROW2, ROW3]
const STREAKS_SMALL = [ROW1.slice(0, 12), ROW2.slice(0, 12)]

// ─── Leaderboard preview data ─────────────────────────────────────────────────

const LB_ROWS = [
  { rank: '01', color: '#A855F7', team: 'Yankees', stat: '21' },
  { rank: '02', color: WIN,       team: 'Dodgers', stat: '19' },
  { rank: '03', color: '#A855F7', team: 'Astros',  stat: '18' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeaturedPages({ isProUser = false }: { isProUser?: boolean }) {
  const lbHref = isProUser ? '/leaderboard' : '/pricing'

  return (
    <section className="fp-section">
      <style>{`
        .fp-section { padding: 96px 0; }
        .fp-container { max-width: 1200px; margin: 0 auto; padding: 0 48px; }
        .fp-header { margin-bottom: 56px; }
        .fp-grid { display: grid; grid-template-columns: 1fr 1fr; align-items: stretch; }
        .fp-card {
          display: flex; flex-direction: column; text-decoration: none;
          padding: 48px; background: transparent;
          transition: background 250ms ease-out;
        }
        .fp-card-left { border-right: 1px solid ${T.hairline}; }
        .fp-card:hover,
        .fp-card:focus-visible { background: ${T.elevated}; }
        .fp-card:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 4px; }
        .fp-title { color: ${T.pri}; transition: color 250ms ease-out; }
        .fp-card:hover .fp-title,
        .fp-card:focus-visible .fp-title { color: ${T.accent}; }
        .fp-arrow { display: inline-flex; align-items: center; color: ${T.pri}; transition: transform 250ms ease-out; }
        .fp-card:hover .fp-arrow,
        .fp-card:focus-visible .fp-arrow { transform: translateX(6px); }
        .fp-streaks-small { display: none; }

        @media (max-width: 900px) {
          .fp-container { padding: 0 20px; }
          .fp-grid { grid-template-columns: 1fr; }
          .fp-card-left { border-right: none; border-bottom: 1px solid ${T.hairline}; padding: 64px 48px; }
          .fp-card-right { padding: 64px 48px; }
        }
        @media (max-width: 600px) {
          .fp-card-left, .fp-card-right { padding: 32px; }
          .fp-streaks-full  { display: none; }
          .fp-streaks-small { display: block; }
        }
      `}</style>

      <div className="fp-container">

        {/* Section header */}
        <div className="fp-header">
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, color: T.faint, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
            EXPLORE
          </div>
          <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 36, fontWeight: 400, color: T.pri, margin: 0, lineHeight: 1.1 }}>
            Two ways in.
          </h2>
        </div>

        {/* 50/50 split */}
        <div className="fp-grid">

          {/* ── LEFT: Streaks on Streaks ────────────────────────────────── */}
          <Link
            href="/streaks"
            className="fp-card fp-card-left"
            aria-label="Explore Streaks on Streaks"
          >
            {/* Block 1: faux streaks preview */}
            <div aria-hidden="true" style={{ marginBottom: 32 }}>
              {/* Full version — hidden at <600px */}
              <div className="fp-streaks-full" style={{
                maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              }}>
                {STREAKS_FULL.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 3, marginBottom: ri < STREAKS_FULL.length - 1 ? 4 : 0 }}>
                    {row.map((color, ci) => (
                      <div key={ci} style={{ width: 18, height: 22, background: color, borderRadius: 2, flexShrink: 0 }} />
                    ))}
                  </div>
                ))}
              </div>
              {/* Small version — shown at <600px */}
              <div className="fp-streaks-small" style={{
                maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              }}>
                {STREAKS_SMALL.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 3, marginBottom: ri < STREAKS_SMALL.length - 1 ? 4 : 0 }}>
                    {row.map((color, ci) => (
                      <div key={ci} style={{ width: 18, height: 22, background: color, borderRadius: 2, flexShrink: 0 }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Block 2: tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
              <span style={{ width: 8, height: 8, background: T.accent, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, color: T.sec, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                LIVE STREAKS
              </span>
            </div>

            {/* Block 3: title + description */}
            <div style={{ marginBottom: 32 }}>
              <h3 className="fp-title" style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, margin: '0 0 16px', lineHeight: 1.1 }}>
                Streaks on Streaks
              </h3>
              <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 400, color: T.sec, lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
                The longest active runs across the league, surfaced as they happen. Track who&apos;s hot — and who&apos;s been one color for a week straight.
              </p>
            </div>

            {/* Block 4: CTA */}
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: T.pri }}>Explore streaks</span>
              <span className="fp-arrow"><ArrowRight size={16} /></span>
            </div>
          </Link>

          {/* ── RIGHT: Leaderboard ──────────────────────────────────────── */}
          <Link
            href={lbHref}
            className="fp-card fp-card-right"
            aria-label={`View the monthly Leaderboard${isProUser ? '' : ' — Pro members only'}`}
          >
            {/* Block 1: faux leaderboard preview */}
            <div aria-hidden="true" style={{
              marginBottom: 32,
              maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
            }}>
              {LB_ROWS.map((row, ri) => (
                <div key={ri} style={{
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  borderBottom: ri < LB_ROWS.length - 1 ? `1px solid ${T.hairline}` : 'none',
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 14, color: T.faint, width: 32, flexShrink: 0 }}>
                    {row.rank}
                  </span>
                  <div style={{ width: 32, height: 32, background: row.color, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 500, color: T.pri, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 16 }}>
                    {row.team}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 500, color: T.pri, flexShrink: 0 }}>
                    {row.stat}
                  </span>
                </div>
              ))}
            </div>

            {/* Block 2: two tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, background: T.accent, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, color: T.sec, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  MONTHLY LEADERS
                </span>
              </div>
              <span style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 600, color: T.accent,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                border: `1px solid ${T.accent}`, padding: '3px 8px', background: 'transparent',
              }}>
                PRO
              </span>
            </div>

            {/* Block 3: title + description */}
            <div style={{ marginBottom: 32 }}>
              <h3 className="fp-title" style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, margin: '0 0 16px', lineHeight: 1.1 }}>
                Leaderboard
              </h3>
              <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 400, color: T.sec, lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
                Last month&apos;s top five teams in every betting category. Who racked up the most overs, the most covers, the most pushes — ranked, charted, and frozen at month-end.
              </p>
            </div>

            {/* Block 4: CTA */}
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: T.pri }}>View leaderboard</span>
              <span className="fp-arrow"><ArrowRight size={16} /></span>
            </div>
          </Link>

        </div>
      </div>
    </section>
  )
}
