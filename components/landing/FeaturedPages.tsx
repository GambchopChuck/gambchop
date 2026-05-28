import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// ─── Font stacks ─────────────────────────────────────────────────────────────

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

        .fp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: stretch;
        }

        @keyframes fp-neon-breathe {
          from { box-shadow: 0 0 0 1px color-mix(in srgb, #22c55e 100%, white 40%), 0 0 22px -2px #22c55e, 0 0 42px -6px #22c55e, inset 0 1px 0 rgba(255,255,255,.45); }
          to   { box-shadow: 0 0 0 1px color-mix(in srgb, #22c55e 100%, white 40%), 0 0 22px -2px #22c55e, 0 0 60px -6px #22c55e, inset 0 1px 0 rgba(255,255,255,.45); }
        }

        .fp-card {
          display: flex;
          flex-direction: column;
          text-decoration: none;
          padding: 28px 28px 32px;
          border-radius: 12px;
          background: radial-gradient(circle at 50% 35%, color-mix(in srgb, #22c55e 100%, white 18%), color-mix(in srgb, #22c55e 100%, black 22%));
          border: 1px solid color-mix(in srgb, #22c55e 100%, white 35%);
          box-shadow: 0 0 0 1px color-mix(in srgb, #22c55e 100%, white 40%), 0 0 22px -2px #22c55e, 0 0 60px -6px #22c55e, inset 0 1px 0 rgba(255,255,255,.45);
          transition: box-shadow 250ms ease-out, transform 250ms ease-out;
          animation: fp-neon-breathe 4.5s ease-in-out infinite alternate;
        }
        .fp-card:hover,
        .fp-card:focus-visible {
          box-shadow: 0 0 0 1px color-mix(in srgb, #22c55e 100%, white 40%), 0 0 31px -2px #22c55e, 0 0 84px -6px #22c55e, inset 0 1px 0 rgba(255,255,255,.45);
          transform: translateY(-2px);
          animation-play-state: paused;
        }
        .fp-card:focus-visible {
          outline: 2px solid white;
          outline-offset: 4px;
        }
        .fp-arrow {
          display: inline-flex;
          align-items: center;
          color: #ffffff;
          transition: transform 250ms ease-out;
        }
        .fp-card:hover .fp-arrow,
        .fp-card:focus-visible .fp-arrow { transform: translateX(6px); }
        .fp-streaks-small { display: none; }

        @media (prefers-reduced-motion: reduce) {
          .fp-card { animation: none !important; }
        }
        @media (max-width: 900px) {
          .fp-container { padding: 0 20px; }
          .fp-grid { grid-template-columns: 1fr; row-gap: 32px; }
        }
        @media (max-width: 600px) {
          .fp-card { padding: 24px; }
          .fp-streaks-full  { display: none; }
          .fp-streaks-small { display: block; }
        }
      `}</style>

      <div className="fp-container">

        {/* Section header */}
        <div className="fp-header">
          <h2 style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 400, color: '#F5F5F4', margin: 0, lineHeight: 1.1 }}>
            Also Featured.
          </h2>
        </div>

        {/* 50/50 split */}
        <div className="fp-grid">

          {/* ── LEFT: Streaks on Streaks ─────────────────────────────── */}
          <Link href="/streaks" className="fp-card" aria-label="Explore Streaks on Streaks">

            {/* Block 1: Title */}
            <h3 style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 400, color: '#ffffff', margin: '0 0 24px', lineHeight: 1.1 }}>
              Streaks on Streaks
            </h3>

            {/* Block 2: Description */}
            <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 400, color: '#ffffff', lineHeight: 1.6, margin: '0 0 32px', maxWidth: 380 }}>
              The longest active runs across the league, surfaced as they happen. Track who&apos;s hot — and who&apos;s been one color for a week straight.
            </p>

            {/* Block 3: Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.8)', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                LIVE STREAKS
              </span>
            </div>

            {/* Block 4: Faux streaks preview */}
            <div aria-hidden="true">
              {/* Full — hidden at <600px */}
              <div className="fp-streaks-full" style={{
                maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              }}>
                {STREAKS_FULL.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 3, marginBottom: ri < STREAKS_FULL.length - 1 ? 4 : 0 }}>
                    {row.map((color, ci) => (
                      <div key={ci} style={{ width: 18, height: 22, background: color, borderRadius: 2, flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }} />
                    ))}
                  </div>
                ))}
              </div>
              {/* Small — shown at <600px */}
              <div className="fp-streaks-small" style={{
                maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              }}>
                {STREAKS_SMALL.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 3, marginBottom: ri < STREAKS_SMALL.length - 1 ? 4 : 0 }}>
                    {row.map((color, ci) => (
                      <div key={ci} style={{ width: 18, height: 22, background: color, borderRadius: 2, flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Block 5: CTA */}
            <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: '#ffffff' }}>Explore streaks</span>
              <span className="fp-arrow"><ArrowRight size={16} /></span>
            </div>
          </Link>

          {/* ── RIGHT: Leaderboard ──────────────────────────────────── */}
          <Link
            href={lbHref}
            className="fp-card"
            aria-label={`View the monthly Leaderboard${isProUser ? '' : ' — Pro members only'}`}
          >
            {/* Block 1: Title */}
            <h3 style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 400, color: '#ffffff', margin: '0 0 24px', lineHeight: 1.1 }}>
              Leaderboard
            </h3>

            {/* Block 2: Description */}
            <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 400, color: '#ffffff', lineHeight: 1.6, margin: '0 0 32px', maxWidth: 380 }}>
              Last month&apos;s top five teams in every betting category. Who racked up the most overs, the most covers, the most pushes — ranked, charted, and frozen at month-end.
            </p>

            {/* Block 3: Two tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.8)', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  MONTHLY LEADERS
                </span>
              </div>
              <span style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 600, color: '#ffffff',
                letterSpacing: '0.18em', textTransform: 'uppercase',
                border: '1px solid rgba(255,255,255,0.6)',
                padding: '3px 8px', background: 'transparent',
              }}>
                PRO
              </span>
            </div>

            {/* Block 4: Faux leaderboard preview */}
            <div aria-hidden="true" style={{
              maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
            }}>
              {LB_ROWS.map((row, ri) => (
                <div key={ri} style={{
                  height: 56, display: 'flex', alignItems: 'center',
                  borderBottom: ri < LB_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 14, color: 'rgba(255,255,255,0.6)', width: 32, flexShrink: 0 }}>
                    {row.rank}
                  </span>
                  <div style={{ width: 32, height: 32, background: row.color, borderRadius: 2, flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }} />
                  <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 500, color: '#ffffff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 16 }}>
                    {row.team}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 500, color: '#ffffff', flexShrink: 0 }}>
                    {row.stat}
                  </span>
                </div>
              ))}
            </div>

            {/* Block 5: CTA */}
            <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: '#ffffff' }}>View leaderboard</span>
              <span className="fp-arrow"><ArrowRight size={16} /></span>
            </div>
          </Link>

        </div>
      </div>
    </section>
  )
}
