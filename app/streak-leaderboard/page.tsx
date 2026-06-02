const STREAKS = [
  { rank: 1,  name: 'Los Angeles Dodgers',    league: 'MLB', metric: 'ML Win',     streak: 8,  record: '8-0',  accent: '#22c55e' },
  { rank: 2,  name: 'Kansas City Chiefs',      league: 'NFL', metric: 'ATS Cover',  streak: 7,  record: '7-1',  accent: '#f59e0b' },
  { rank: 3,  name: 'Boston Celtics',          league: 'NBA', metric: 'ML Win',     streak: 6,  record: '6-0',  accent: '#f97316' },
  { rank: 4,  name: 'Novak Djokovic',          league: 'ATP', metric: 'ML Win',     streak: 6,  record: '6-0',  accent: '#84cc16' },
  { rank: 5,  name: 'Tampa Bay Lightning',     league: 'NHL', metric: 'Puck Line',  streak: 5,  record: '5-1',  accent: '#3b82f6' },
  { rank: 6,  name: 'Texas Longhorns',         league: 'NCAAF','metric': 'ATS Cover', streak: 5, record: '5-0', accent: '#ef4444' },
  { rank: 7,  name: 'South Carolina Gamecocks',league: 'NCAAWB','metric': 'ML Win',  streak: 5, record: '5-0', accent: '#6366f1' },
  { rank: 8,  name: 'Houston Astros',          league: 'MLB', metric: 'Under',      streak: 4,  record: '4-0',  accent: '#b45309' },
  { rank: 9,  name: 'Indiana Fever',           league: 'WNBA', metric: 'ML Win',    streak: 4,  record: '4-0',  accent: '#ec4899' },
  { rank: 10, name: 'Iga Swiatek',             league: 'WTA',  metric: 'ML Win',    streak: 4,  record: '4-0',  accent: '#f0abfc' },
]

export default function StreakLeaderboardPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, color: '#eab308', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>▲ Hot Streaks</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Streak Leaderboard
          </h1>
          <p style={{ fontSize: 11, color: '#ffffff', letterSpacing: '0.1em', margin: 0 }}>
            Current winning and covering streaks across all leagues
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {STREAKS.map((s) => (
            <div key={s.rank} style={{
              background: s.rank <= 3 ? '#0f0f14' : '#0c0c10',
              border: `1px solid ${s.rank <= 3 ? s.accent + '33' : '#1a1a24'}`,
              borderRadius: 10, padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              {/* Rank */}
              <div style={{ fontSize: s.rank <= 3 ? 20 : 16, fontWeight: 900, color: s.rank <= 3 ? s.accent : '#ffffff', minWidth: 32, textAlign: 'center' }}>
                {s.rank <= 3 ? ['🥇','🥈','🥉'][s.rank - 1] : `#${s.rank}`}
              </div>

              {/* Name */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.name}</div>
                <div style={{ fontSize: 9, color: '#ffffff', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                  {s.league} · {s.metric}
                </div>
              </div>

              {/* Streak */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.accent, lineHeight: 1 }}>{s.streak}</div>
                <div style={{ fontSize: 9, color: '#ffffff', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>Game Streak</div>
              </div>

              {/* Record */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', minWidth: 40, textAlign: 'right' }}>
                {s.record}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
