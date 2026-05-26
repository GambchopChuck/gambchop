import Image from 'next/image'
import LeagueGrid from '@/components/LeagueGrid'
import CommunityPreview from '@/components/CommunityPreview'
import ActivationBanner from '@/components/ActivationBanner'


export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <ActivationBanner />

      <style>{`
        .hero-grid { display: flex; align-items: center; gap: 48px; }
        .hero-headline {
          font-size: 56px; font-weight: 900; color: #f4f4f5;
          letter-spacing: 0.02em; text-transform: uppercase;
          line-height: 1.05; margin: 0;
          font-family: var(--font-geist-sans), sans-serif;
        }
        @media (max-width: 1100px) {
          .hero-headline { font-size: 44px; }
        }
        @media (max-width: 900px) {
          .hero-headline { font-size: 36px; }
        }
        @media (max-width: 600px) {
          .hero-headline { font-size: 28px; }
        }
        @keyframes neon-breathe {
          from { box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 100%, white 40%), 0 0 22px -2px var(--accent), 0 0 42px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.45); }
          to   { box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 100%, white 40%), 0 0 22px -2px var(--accent), 0 0 60px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.45); }
        }
        .league-card {
          background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 100%, white 18%), color-mix(in srgb, var(--accent) 100%, black 22%));
          border: 1px solid color-mix(in srgb, var(--accent) 100%, white 35%);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 100%, white 40%), 0 0 22px -2px var(--accent), 0 0 60px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.45);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          animation: neon-breathe 4.5s ease-in-out infinite alternate;
        }
        .league-card:hover {
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 100%, white 40%), 0 0 31px -2px var(--accent), 0 0 84px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.45);
          transform: translateY(-3px);
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .league-card { animation: none !important; }
        }
        .hiw-section { padding: 100px 24px; }
        .hiw-heading { font-size: clamp(32px, 5vw, 60px); font-weight: 700; margin: 0 0 28px; line-height: 1.06; color: #ffffff; letter-spacing: 0.01em; }
        .hiw-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 56px; }
        @media (max-width: 768px) {
          .hiw-section { padding: 64px 20px; }
          .hiw-cards { grid-template-columns: 1fr; gap: 20px; margin-top: 40px; }
        }
      `}</style>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>

        {/* Background image — fills hero section, clipped by overflow:hidden */}
        <Image
          src="/images/hero-bg.png"
          alt=""
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />

        {/* Dark gradient overlay — left darker for text legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(2,10,4,0.78) 0%, rgba(5,5,12,0.60) 50%, rgba(4,2,12,0.30) 100%)',
        }} />

        {/* Hero content — sits above image and overlay */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '60px 24px' }}>
        <div className="hero-grid">

          {/* Left: kicker + headline */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 11, color: '#22c55e', letterSpacing: '0.25em',
              textTransform: 'uppercase', fontWeight: 700,
              fontFamily: 'var(--font-geist-mono), monospace',
              margin: '0 0 24px',
            }}>
              Your sports data assistant.
            </p>
            <h1 className="hero-headline">
              A broader view of sports results and outcomes.
            </h1>
          </div>

        </div>{/* /hero-grid */}
        </div>{/* /hero content */}
      </div>{/* /hero outer */}

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section
        className="hiw-section"
        style={{
          position: 'relative',
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.38), rgba(0,0,0,0.38)), url(/images/stp-bg-v2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>

          {/* Eyebrow */}
          <p style={{
            fontSize: 14, fontWeight: 500, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
            margin: '0 0 20px',
          }}>
            How It Works
          </p>

          {/* Heading */}
          <h2 className="hiw-heading">
            Spot the patterns. Build smarter tickets.
          </h2>

          {/* Intro */}
          <p style={{
            fontSize: 18, fontWeight: 400, color: '#ffffff',
            lineHeight: 1.55, maxWidth: 720, margin: 0,
          }}>
            Gambchop turns months of game results into a single color-coded view
            so streaks, slumps, and trends jump off the page. Pair that visual
            context with your personal favorites list and build off the broader
            picture of history&#8212;not a hunch.
          </p>

          {/* Feature cards */}
          <div className="hiw-cards">
            {([
              {
                n: '01',
                heading: 'Read the chart',
                body: 'Every game becomes a colored square — green for wins, red for losses, purple for overs, baby blue for unders, amber for pushes. Scan a team\'s row and the streaks, slumps, and patterns show themselves.',
              },
              {
                n: '02',
                heading: 'Track your favorites',
                body: 'Pin up to 16 team-and-bet-type combos to your favorites. Your most-watched matchups and markets stay one click away, side by side, so comparisons are instant.',
              },
              {
                n: '03',
                heading: 'Build your bet',
                body: 'Stack the visual context with your own research. Spot a team riding a 7-game over streak or a favorite that keeps failing to cover, and walk into your sportsbook with a broader view of what\'s been happening.',
              },
            ] as const).map(({ n, heading, body }) => (
              <div key={n} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '28px 28px 32px',
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 500, color: '#22c55e',
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  marginBottom: 18,
                }}>
                  {n}
                </div>
                <h3 style={{
                  fontSize: 26, fontWeight: 600, color: '#ffffff',
                  margin: '0 0 14px', letterSpacing: '0.01em', lineHeight: 1.2,
                }}>
                  {heading}
                </h3>
                <p style={{
                  fontSize: 16, fontWeight: 400, color: '#ffffff',
                  lineHeight: 1.5, margin: 0,
                }}>
                  {body}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      <LeagueGrid />
      <CommunityPreview />

      <footer style={{ borderTop: '1px solid #1a1a24', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
          Gambchop · For entertainment purposes only · Not affiliated with any sports league
        </p>
      </footer>
    </div>
  )
}
