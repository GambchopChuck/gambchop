import LeagueGrid from '@/components/LeagueGrid'
import CommunityPreview from '@/components/CommunityPreview'

// ─── YouTube Embed ────────────────────────────────────────────────────────────

const VIDEO_ID = 'dQw4w9WgXcQ'

function YoutubeSection() {
  return (
    <section style={{ padding: '48px 24px 36px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: '#22c55e', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
          ◈ Daily Drop
        </div>
        <h2 style={{
          fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 900, color: '#f4f4f5',
          letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
        }}>
          Gambchop Daily
        </h2>
        <p style={{ fontSize: 11, color: '#52525b', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 6 }}>
          Yesterday&apos;s Recap · Today&apos;s Preview
        </p>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(to right, #22c55e, #8b5cf6)', margin: '14px auto 0', borderRadius: 2 }} />
      </div>

      <div style={{
        position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden',
        borderRadius: 12, border: '1px solid #1a1a24',
        boxShadow: '0 0 40px rgba(34,197,94,0.08), 0 0 80px rgba(139,92,246,0.06)',
      }}>
        <iframe
          src={`https://www.youtube.com/embed/${VIDEO_ID}?rel=0&modestbranding=1`}
          title="Gambchop Daily"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace' }}>

      {/* Hero tagline */}
      <div style={{ textAlign: 'center', paddingTop: 36 }}>
        <p style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>
          Sports Betting Intelligence · All Major Leagues
        </p>
      </div>

      <YoutubeSection />
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
