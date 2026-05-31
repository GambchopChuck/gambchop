import Link from 'next/link'
import LeagueGrid from '@/components/LeagueGrid'

const SERIF = 'var(--font-fraunces), Georgia, serif'
const SANS  = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO  = 'var(--font-jetbrains), "JetBrains Mono", monospace'

const T = {
  pri:     '#F5F5F4',
  sec:     '#A1A1AA',
  accent:  '#C5F84A',
  hairline:'#1F1F23',
}

export default function LeaguesPage() {
  return (
    <main style={{ position: 'relative', minHeight: '100vh', background: '#0A0A0B', overflow: 'hidden' }}>

      {/* Radiant ambient background */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34, 197, 94, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 40%, rgba(168, 85, 247, 0.05) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(96, 165, 250, 0.05) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 50% 100%, rgba(34, 197, 94, 0.06) 0%, transparent 60%)
          `,
        }}
      />

      {/* Page content */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* Hero block */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 48px 0' }}>

          {/* Utility row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 64 }}>
            <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              <span style={{ color: '#ffffff' }}>GAMB</span>
              <span style={{ color: T.accent }}>CHOP</span>
            </span>
            <Link href="/" style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#ffffff', textDecoration: 'none',
            }}>
              ← Back to home
            </Link>
          </div>

          {/* H1 */}
          <h1 style={{
            fontFamily: SERIF, fontSize: 64, fontWeight: 400, fontStyle: 'normal',
            letterSpacing: '-0.03em', color: T.pri, margin: '0 0 16px', lineHeight: 1.0,
          }}>
            Leagues
          </h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: SANS, fontSize: 16, fontWeight: 400,
            color: T.sec, lineHeight: 1.6, margin: '0 0 56px', maxWidth: 600,
          }}>
            Browse Gambchop charts by league.
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: T.hairline }} />

        </div>

        {/* 56px gap then the grid */}
        <div style={{ paddingTop: 56, paddingBottom: 96 }}>
          <LeagueGrid showSectionHeader={false} showBackground={false} />
        </div>

      </div>
    </main>
  )
}
