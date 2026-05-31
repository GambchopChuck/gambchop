// TODO: Wrap with server-side auth guard — redirect to /pricing if !isProUser

import Link from 'next/link'
import LeaderboardHero from '@/components/leaderboard/LeaderboardHero'
import CategoryPills from '@/components/leaderboard/CategoryPills'

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  pri:     '#F5F5F4',
  sec:     '#A1A1AA',
  faint:   '#C5F84A',
  hairline:'#1F1F23',
  accent:  '#C5F84A',
}
const SANS = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO = 'var(--font-jetbrains), "JetBrains Mono", monospace'

export default function LeaderboardPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "linear-gradient(rgba(10,10,11,0.72), rgba(10,10,11,0.72)), url('/images/leaderboard-bg.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }}>

      <style>{`
        /* ── Container ── */
        .lb-container { max-width: 1200px; margin: 0 auto; padding: 0 48px; }

        /* ── Green neon card rows ── */
        @keyframes lb-neon-breathe {
          from { box-shadow: 0 0 0 1px color-mix(in srgb, #22c55e 100%, white 40%), 0 0 22px -2px #22c55e, 0 0 42px -6px #22c55e, inset 0 1px 0 rgba(255,255,255,.45); }
          to   { box-shadow: 0 0 0 1px color-mix(in srgb, #22c55e 100%, white 40%), 0 0 22px -2px #22c55e, 0 0 60px -6px #22c55e, inset 0 1px 0 rgba(255,255,255,.45); }
        }
        .lb-row {
          border-radius: 12px;
          padding: 28px 28px 32px;
          margin-bottom: 12px;
          background: radial-gradient(circle at 50% 35%, color-mix(in srgb, #22c55e 100%, white 18%), color-mix(in srgb, #22c55e 100%, black 22%));
          border: 1px solid color-mix(in srgb, #22c55e 100%, white 35%);
          box-shadow: 0 0 0 1px color-mix(in srgb, #22c55e 100%, white 40%), 0 0 22px -2px #22c55e, 0 0 60px -6px #22c55e, inset 0 1px 0 rgba(255,255,255,.45);
          transition: box-shadow 250ms ease-out, transform 250ms ease-out;
          animation: lb-neon-breathe 4.5s ease-in-out infinite alternate;
        }
        .lb-row:hover {
          box-shadow: 0 0 0 1px color-mix(in srgb, #22c55e 100%, white 40%), 0 0 31px -2px #22c55e, 0 0 84px -6px #22c55e, inset 0 1px 0 rgba(255,255,255,.45);
          transform: translateY(-2px);
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .lb-row { animation: none !important; }
        }

        /* ── Row grid ── */
        .lb-row-grid {
          display: grid;
          grid-template-columns: 40px 1fr 100px;
          gap: 16px;
          align-items: start;
        }

        /* ── Chart strip ── */
        .lb-chart-strip { display: flex; gap: 3px; }

        /* ── Mobile count: hidden on desktop ── */
        .lb-count-mobile { display: none; }
        .lb-count-desktop { display: block; }

        /* ── Pills ── */
        .lb-pills-row { display: flex; flex-wrap: wrap; gap: 8px; }

        /* ── Hover links ── */
        .lb-back-link:hover    { color: #F5F5F4 !important; }
        .lb-archive-link:hover { color: #F5F5F4 !important; }

        /* ── Tablet (768–1099px) ── */
        @media (max-width: 1099px) {
          .lb-h1 { font-size: 48px !important; }
        }

        /* ── Mobile (<768px) ── */
        @media (max-width: 767px) {
          .lb-container { padding: 0 20px; }
          .lb-h1 { font-size: 36px !important; }
          .lb-row { padding: 24px; }
          .lb-row-grid { grid-template-columns: 32px 1fr; }
          .lb-count-desktop { display: none; }
          .lb-count-mobile  { display: block; }
          .lb-chart-strip {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .lb-chart-strip::-webkit-scrollbar { display: none; }
          .lb-pills-row {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 4px;
          }
          .lb-pills-row::-webkit-scrollbar { display: none; }
        }
      `}</style>

      <div className="lb-container" style={{ paddingTop: 96 }}>

        {/* ── Utility row ──────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 0,
        }}>
          {/* Wordmark */}
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            <span style={{ color: '#ffffff' }}>GAMB</span>
            <span style={{ color: T.accent }}>CHOP</span>
          </span>

          {/* Back link */}
          <Link
            href="/"
            className="lb-back-link"
            style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#ffffff', textDecoration: 'none',
              transition: 'color 200ms ease-out',
            }}
          >
            ← Back to home
          </Link>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <LeaderboardHero />

        {/* ── Category pills + list (client island) ────────────────────── */}
        <div style={{ marginTop: 32 }}>
          <CategoryPills />
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{ marginTop: 48, paddingBottom: 64 }}>
          <div style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 500,
            color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
            lineHeight: 1.8,
          }}>
            <div>ARCHIVED MONTHLY · TIES SHARE A RANK</div>
            <div>NEXT FREEZE: JULY 01 2026</div>
          </div>

          {/* TODO: Wire to archive route /leaderboard/[year]/[month] when archive routing is built */}
          <a
            href="#"
            className="lb-archive-link"
            style={{
              display: 'inline-block',
              fontFamily: MONO, fontSize: 11, fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: T.sec, textDecoration: 'none',
              marginTop: 32,
              transition: 'color 200ms ease-out',
            }}
          >
            View past leaderboards →
          </a>
        </div>

      </div>
    </div>
  )
}
