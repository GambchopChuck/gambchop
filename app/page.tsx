import Image from 'next/image'
import LeagueGrid from '@/components/LeagueGrid'
import CommunityPreview from '@/components/CommunityPreview'
import ActivationBanner from '@/components/ActivationBanner'

const CHART_ROWS: Array<{ label: string; cells: Array<string | null> }> = [
  {
    label: 'MONEYLINE',
    cells: ['#22c55e', '#22c55e', '#ef4444', '#22c55e', '#22c55e', '#ef4444', '#22c55e', '#ef4444', '#22c55e', '#22c55e'],
  },
  {
    label: 'SPREAD',
    cells: ['#22c55e', '#ef4444', '#22c55e', '#22c55e', '#ef4444', '#22c55e', '#22c55e', '#ef4444', '#22c55e', '#22c55e'],
  },
  {
    label: 'ML FAV',
    cells: ['#eab308', '#eab308', null, '#eab308', '#ef4444', '#eab308', null, '#eab308', '#eab308', null],
  },
  {
    label: 'SPREAD FAV',
    cells: ['#2563eb', '#ef4444', '#2563eb', '#2563eb', null, '#ef4444', '#2563eb', '#ef4444', '#2563eb', null],
  },
  {
    label: 'HOME',
    cells: ['#14b8a6', null, '#14b8a6', '#ef4444', '#14b8a6', '#14b8a6', null, '#ef4444', '#14b8a6', '#14b8a6'],
  },
  {
    label: 'OVER/UNDER',
    cells: ['#8b5cf6', '#b45309', '#8b5cf6', '#8b5cf6', '#b45309', '#8b5cf6', '#b45309', '#8b5cf6', '#b45309', '#8b5cf6'],
  },
]

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <ActivationBanner />

      <style>{`
        .hero-grid { display: flex; align-items: center; gap: 48px; }
        .hero-headline {
          font-size: 56px; font-weight: 900; color: #f4f4f5;
          letter-spacing: 0.02em; text-transform: uppercase;
          line-height: 1.05; margin: 0;
          font-family: var(--font-geist-sans), sans-serif;
        }
        .hero-laptop { width: 480px; flex-shrink: 0; }
        @media (max-width: 1100px) {
          .hero-headline { font-size: 44px; }
          .hero-laptop { width: 380px; }
        }
        @media (max-width: 900px) {
          .hero-grid { flex-direction: column; }
          .hero-headline { font-size: 36px; }
          .hero-laptop { width: 100%; max-width: 480px; margin: 0 auto; }
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
      `}</style>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>

        {/* Background image — fills hero section, clipped by overflow:hidden */}
        <Image
          src="/images/hero-bg.jpg"
          alt=""
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />

        {/* Dark gradient overlay — left darker for text legibility, subtle brand tint */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(2,10,4,0.90) 0%, rgba(5,5,12,0.82) 45%, rgba(4,2,12,0.45) 100%)',
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
              &ldquo;A chance is better than no chance&rdquo;
            </p>
            <h1 className="hero-headline">
              A broader view of sports results and outcomes.
            </h1>
          </div>

          {/* Right: CSS laptop mockup */}
          <div className="hero-laptop">

            {/* ── Lid ───────────────────────────────────────────────────────── */}
            <div style={{
              background: '#1f1f24',
              borderRadius: '12px 12px 3px 3px',
              padding: '8px 8px 6px',
              border: '1px solid #3f3f46',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              {/* Camera dot */}
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#3f3f46', margin: '0 auto 5px',
              }} />

              {/* Screen */}
              <div style={{
                background: '#0a0a0f', border: '1px solid #1a1a24',
                borderRadius: 5, padding: '10px 14px', overflow: 'hidden',
              }}>
                {/* Column header row */}
                <div style={{
                  display: 'flex', alignItems: 'flex-end',
                  marginBottom: 7, borderBottom: '1px solid #1a1a24', paddingBottom: 5,
                }}>
                  <div style={{
                    width: 72, fontSize: 6, color: '#3f3f46',
                    letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    Team / Metric
                  </div>
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} style={{
                      width: 16, flexShrink: 0, marginRight: 2,
                      textAlign: 'center', fontSize: 6, color: '#3f3f46',
                    }}>
                      G{i + 1}
                    </div>
                  ))}
                </div>

                {/* Data rows */}
                {CHART_ROWS.map((row) => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{
                      width: 72, fontSize: 7, color: '#a1a1aa',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      flexShrink: 0, lineHeight: 1, paddingRight: 4,
                    }}>
                      {row.label}
                    </div>
                    {row.cells.map((bg, ci) => (
                      <div
                        key={ci}
                        style={{
                          width: 16, height: 14, borderRadius: 2,
                          marginRight: 2, flexShrink: 0,
                          background: bg ?? '#131318',
                          opacity: bg ? 1 : 0.25,
                          boxShadow: bg ? `0 0 5px ${bg}55` : 'none',
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Hinge strip ───────────────────────────────────────────────── */}
            <div style={{
              height: 5,
              background: 'linear-gradient(to right, #141418, #252530, #141418)',
              margin: '0 6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            }} />

            {/* ── Base / keyboard ───────────────────────────────────────────── */}
            <div style={{
              background: '#1a1a22',
              borderRadius: '2px 2px 12px 12px',
              padding: '10px 16px 10px',
              border: '1px solid #2a2a34',
              borderTop: 'none',
            }}>
              {/* Key caps hint */}
              <div style={{
                display: 'flex', gap: 2, flexWrap: 'wrap',
                margin: '0 auto 8px', maxWidth: 300, justifyContent: 'center',
              }}>
                {Array.from({ length: 42 }, (_, i) => (
                  <div key={i} style={{
                    width: 10, height: 6, background: '#242430',
                    borderRadius: 1, border: '1px solid #2e2e3c',
                  }} />
                ))}
              </div>
              {/* Trackpad */}
              <div style={{
                width: 76, height: 46, background: '#1e1e2a',
                borderRadius: 5, border: '1px solid #2a2a38', margin: '0 auto',
              }} />
            </div>

          </div>{/* /hero-laptop */}
        </div>{/* /hero-grid */}
        </div>{/* /hero content */}
      </div>{/* /hero outer */}

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
