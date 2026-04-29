import Link from 'next/link'

const MOCK_GAMES = [
  { time: '1:05 PM', home: 'New York Yankees', away: 'Boston Red Sox',    league: 'MLB', homeML: '-145', awayML: '+125', total: '8.5' },
  { time: '1:10 PM', home: 'Los Angeles Dodgers', away: 'San Diego Padres', league: 'MLB', homeML: '-165', awayML: '+145', total: '7.5' },
  { time: '4:05 PM', home: 'Houston Astros', away: 'Texas Rangers',        league: 'MLB', homeML: '-120', awayML: '+102', total: '9.0' },
  { time: '7:05 PM', home: 'Atlanta Braves', away: 'Philadelphia Phillies', league: 'MLB', homeML: '-110', awayML: '-108', total: '8.0' },
  { time: '7:10 PM', home: 'Chicago Cubs', away: 'Milwaukee Brewers',      league: 'MLB', homeML: '+115', awayML: '-135', total: '7.5' },
  { time: '7:40 PM', home: 'San Francisco Giants', away: 'Arizona Diamondbacks', league: 'MLB', homeML: '+105', awayML: '-122', total: '8.0' },
]

export default function TodaysBoardPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, color: '#22c55e', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>▦ Live</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Today&apos;s Board
          </h1>
          <p style={{ fontSize: 11, color: '#52525b', letterSpacing: '0.1em', margin: 0 }}>
            All games · Opening lines · Last updated live
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_GAMES.map((g, i) => (
            <div key={i} style={{ background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.1em', minWidth: 60 }}>{g.time}</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{g.away}</div>
                <div style={{ fontSize: 13, color: '#f4f4f5', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{g.home}</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Away ML</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: g.awayML.startsWith('+') ? '#22c55e' : '#f4f4f5' }}>{g.awayML}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Home ML</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: g.homeML.startsWith('+') ? '#22c55e' : '#f4f4f5' }}>{g.homeML}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Total</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#8b5cf6' }}>{g.total}</div>
                </div>
              </div>
              <div style={{ fontSize: 9, color: '#22c55e', background: '#22c55e0d', border: '1px solid #22c55e22', borderRadius: 4, padding: '3px 8px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                {g.league}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, background: '#0f0f14', border: '1px solid #8b5cf633', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            Full Board Coming Soon
          </div>
          <p style={{ fontSize: 11, color: '#52525b', margin: '0 0 20px' }}>
            Live lines, props, and same-game parlays for all leagues
          </p>
          <Link href="/" style={{ textDecoration: 'none', fontSize: 11, color: '#52525b', border: '1px solid #2a2a34', borderRadius: 6, padding: '10px 20px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
