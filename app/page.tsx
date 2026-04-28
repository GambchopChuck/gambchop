import Link from 'next/link'
import Navbar from '@/components/Navbar'
import LeagueCard from '@/components/LeagueCard'

// ─── League Cards Data ────────────────────────────────────────────────────────

const LEAGUES = [
  {
    id: 'mlb',
    name: 'MLB',
    full: 'Major League Baseball',
    emoji: '⚾',
    accent: '#22c55e',
    description: 'All 30 teams · Full season moneyline, spread & totals analysis',
    teams: 30,
    href: '/chart',
  },
  {
    id: 'nfl',
    name: 'NFL',
    full: 'National Football League',
    emoji: '🏈',
    accent: '#f59e0b',
    description: '32 teams · ATS records, totals trends, divisional breakdowns',
    teams: 32,
    href: '#',
  },
  {
    id: 'nba',
    name: 'NBA',
    full: 'National Basketball Association',
    emoji: '🏀',
    accent: '#f97316',
    description: '30 teams · Point spreads, totals, and player prop trends',
    teams: 30,
    href: '#',
  },
  {
    id: 'nhl',
    name: 'NHL',
    full: 'National Hockey League',
    emoji: '🏒',
    accent: '#3b82f6',
    description: '32 teams · Puck line, totals & moneyline performance data',
    teams: 32,
    href: '#',
  },
  {
    id: 'ncaaf',
    name: 'NCAAF',
    full: 'College Football',
    emoji: '🏟️',
    accent: '#ef4444',
    description: '130+ teams · ATS trends, conference breakdowns, bowl records',
    teams: 134,
    href: '#',
  },
  {
    id: 'ncaab',
    name: 'NCAAB',
    full: 'College Basketball',
    emoji: '🎓',
    accent: '#a855f7',
    description: '350+ teams · Tournament trends, spread & totals analysis',
    teams: 358,
    href: '#',
  },
  {
    id: 'wnba',
    name: 'WNBA',
    full: "Women's National Basketball Association",
    emoji: '🏀',
    accent: '#ec4899',
    description: '13 teams · Moneyline, spread & totals analysis for the full season',
    teams: 13,
    href: '#',
  },
  {
    id: 'ncaawb',
    name: 'NCAAWB',
    full: "Women's College Basketball",
    emoji: '🎓',
    accent: '#6366f1',
    description: '350+ teams · Spread trends, conference breakdowns & tournament data',
    teams: 350,
    href: '#',
  },
  {
    id: 'tennis',
    name: 'Tennis',
    full: 'ATP & WTA Tours',
    emoji: '🎾',
    accent: '#84cc16',
    description: 'ATP & WTA · Match winner odds, set spreads & tournament futures',
    teams: 200,
    href: '#',
  },
  {
    id: 'ncaabl',
    name: 'College Baseball',
    full: 'NCAA Baseball',
    emoji: '⚾',
    accent: '#0891b2',
    description: '300+ teams · Moneyline, run line & totals across all conferences',
    teams: 300,
    href: '#',
  },
]


// ─── YouTube Embed ────────────────────────────────────────────────────────────

// Replace VIDEO_ID with the actual YouTube video ID
const VIDEO_ID = 'dQw4w9WgXcQ'

function YoutubeSection() {
  return (
    <section style={{ padding: '60px 24px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.25em', color: '#52525b', textTransform: 'uppercase', marginBottom: 10 }}>
          Daily Video
        </div>
        <h2 style={{
          fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 800, color: '#f4f4f5',
          letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0,
        }}>
          Yesterday&apos;s Recap &amp; Today&apos;s Preview
        </h2>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(to right, #22c55e, #8b5cf6)', margin: '14px auto 0', borderRadius: 2 }} />
      </div>

      <div style={{
        position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden',
        borderRadius: 12, border: '1px solid #1a1a24',
        boxShadow: '0 0 40px rgba(34,197,94,0.08), 0 0 80px rgba(139,92,246,0.06)',
      }}>
        <iframe
          src={`https://www.youtube.com/embed/${VIDEO_ID}?rel=0&modestbranding=1`}
          title="Gambchop — Yesterday's Recap & Today's Preview"
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
    <div style={{ minHeight: '100vh', background: '#0c0c10', fontFamily: 'var(--font-geist-mono), monospace' }}>
      <Navbar />

      {/* Hero sub-text */}
      <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 0 }}>
        <p style={{ fontSize: 11, color: '#3f3f46', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          Sports Betting Intelligence · All Major Leagues
        </p>
      </div>

      {/* YouTube embed */}
      <YoutubeSection />

      {/* League cards */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Browse</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
              Leagues
            </h2>
          </div>
          <Link href="#" style={{
            textDecoration: 'none', color: '#a1a1aa', fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
            padding: '8px 16px', border: '1px solid #2a2a34', borderRadius: 6,
          }}>See All Leagues →</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {LEAGUES.map(league => <LeagueCard key={league.id} league={league} />)}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1a1a24', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
          Gambchop · For entertainment purposes only · Not affiliated with any sports league
        </p>
      </footer>
    </div>
  )
}
