import LeagueGrid from '@/components/LeagueGrid'
import CommunityPreview from '@/components/CommunityPreview'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace' }}>

      {/* Hero tagline */}
      <div style={{ textAlign: 'center', paddingTop: 28 }}>
        <p style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>
          Sports Betting Intelligence · All Major Leagues
        </p>
      </div>

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
