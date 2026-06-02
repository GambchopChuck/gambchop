const FILTER_GROUPS = [
  {
    label: 'League',
    options: ['MLB', 'NFL', 'NBA', 'NHL', 'NCAAF', 'NCAAB', 'WNBA', 'ATP', 'WTA'],
  },
  {
    label: 'Bet Type',
    options: ['Moneyline', 'Spread / ATS', 'Over', 'Under', 'As Favorite', 'As Underdog', 'Home', 'Away'],
  },
  {
    label: 'Record Filter',
    options: ['Win Streak 3+', 'Win Streak 5+', 'Cover Streak 3+', 'Over Streak 3+', 'Under Streak 3+'],
  },
  {
    label: 'Date Range',
    options: ['Last 5 Games', 'Last 10 Games', 'Last 30 Days', 'Season to Date', 'Custom Range'],
  },
]

export default function FiltersPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, color: '#ffffff', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>◧ Advanced</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Filters
          </h1>
          <p style={{ fontSize: 11, color: '#ffffff', letterSpacing: '0.1em', margin: 0 }}>
            Narrow down trends across leagues, bet types, and date ranges
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 32 }}>
          {FILTER_GROUPS.map(group => (
            <div key={group.label} style={{ background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 12, padding: '20px' }}>
              <div style={{ fontSize: 9, color: '#ffffff', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14, fontWeight: 700 }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {group.options.map(opt => (
                  <div key={opt} style={{
                    fontSize: 10, color: '#ffffff', background: '#0c0c10',
                    border: '1px solid #2a2a34', borderRadius: 4, padding: '5px 10px',
                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'not-allowed',
                    opacity: 0.7,
                  }}>
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#8b5cf60d', border: '1px solid #8b5cf633', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            Advanced Filters — Pro Feature
          </div>
          <p style={{ fontSize: 11, color: '#ffffff', margin: '0 0 20px', lineHeight: 1.6 }}>
            Filter across every league, metric, and date range. Export results to CSV.
          </p>
          <button style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: 8,
            padding: '12px 24px', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
            textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 0 20px rgba(139,92,246,0.4)',
          }}>
            Go Pro to Unlock Filters
          </button>
        </div>
      </div>
    </div>
  )
}
