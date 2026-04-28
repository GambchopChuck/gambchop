import Link from 'next/link'

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
]

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = ['Leagues', 'Team Pages', 'Merchandise', 'News', 'Filters']

function Navbar() {
  return (
    <header style={{ borderBottom: '1px solid #1a1a24', background: 'rgba(12,12,16,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontSize: 22, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #22c55e 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 16px rgba(34,197,94,0.25))',
          }}>
            Gambchop
          </span>
        </Link>

        {/* Nav links — hidden on small screens */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden md:flex">
          {NAV_LINKS.map(link => (
            <Link key={link} href={link === 'Leagues' ? '/chart' : '#'} style={{
              textDecoration: 'none', color: '#a1a1aa', fontSize: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500,
              padding: '6px 12px', borderRadius: 6, transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f4f4f5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#a1a1aa')}
            >
              {link}
            </Link>
          ))}
        </nav>

        {/* Auth buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="#" style={{
            textDecoration: 'none', color: '#a1a1aa', fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
            padding: '6px 12px',
          }}>Login</Link>
          <Link href="#" style={{
            textDecoration: 'none', color: '#f4f4f5', fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
            padding: '6px 14px', border: '1px solid #3f3f46', borderRadius: 6,
          }}>Join Free</Link>
          <Link href="#" style={{
            textDecoration: 'none', color: '#000', fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 800,
            padding: '7px 16px', borderRadius: 6,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 0 16px rgba(34,197,94,0.35)',
          }}>Go Pro</Link>
        </div>
      </div>
    </header>
  )
}

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

// ─── League Cards ─────────────────────────────────────────────────────────────

function LeagueCard({ league }: { league: typeof LEAGUES[0] }) {
  return (
    <Link href={league.href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 12,
        padding: '24px 20px', cursor: 'pointer', transition: 'all 0.2s',
        position: 'relative', overflow: 'hidden', height: '100%',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = league.accent + '60'
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = `0 8px 32px ${league.accent}18`
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = '#1a1a24'
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
        }}
      >
        {/* Accent glow top-left */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: league.accent, borderRadius: '12px 0 0 12px', opacity: 0.8 }} />

        <div style={{ paddingLeft: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{league.emoji}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {league.name}
                </div>
                <div style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                  {league.full}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: league.accent, fontWeight: 700, letterSpacing: '0.1em', background: league.accent + '18', padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              {league.teams} Teams
            </div>
          </div>

          <p style={{ fontSize: 12, color: '#71717a', lineHeight: 1.6, margin: 0, letterSpacing: '0.02em' }}>
            {league.description}
          </p>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: league.accent, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {league.id === 'mlb' ? 'View Analysis →' : 'Coming Soon'}
            </span>
          </div>
        </div>
      </div>
    </Link>
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
