import Image from 'next/image'
import LeagueGrid from '@/components/LeagueGrid'
import CommunityPreview from '@/components/CommunityPreview'
import ActivationBanner from '@/components/ActivationBanner'
import FeaturedPages from '@/components/landing/FeaturedPages'
import { X, ShoppingBag } from 'lucide-react'


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

      {/* ── Social divider bar ────────────────────────────────────────────── */}
      <div style={{
        width: '100%',
        height: 60,
        background: '#08080d',
        borderTop: '1px solid #22c55e',
        borderBottom: '1px solid #22c55e',
        boxShadow: '0 -8px 32px rgba(34,197,94,0.25), 0 8px 32px rgba(34,197,94,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>

          {/* X (Twitter) */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <X size={22} />
          </a>

          {/* Instagram */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>

          {/* TikTok */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.84 1.56V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
            </svg>
          </a>

          {/* YouTube */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19.1C5.12 19.56 12 19.56 12 19.56s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none"/>
            </svg>
          </a>

          {/* Merchandise */}
          <a href="/merchandise" aria-label="Merchandise"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <ShoppingBag size={22} />
          </a>

        </div>
      </div>

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
              <div key={n} className="league-card" style={{
                '--accent': '#22c55e',
                borderRadius: 12,
                padding: '28px 28px 32px',
              } as React.CSSProperties}>
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
      <FeaturedPages />

      <footer style={{ borderTop: '1px solid #1a1a24', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
          Gambchop · For entertainment purposes only · Not affiliated with any sports league
        </p>
      </footer>
    </div>
  )
}
