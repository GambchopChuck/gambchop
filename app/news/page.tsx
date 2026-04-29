const ARTICLES = [
  { tag: 'MLB', title: "Yankees' Bullpen Struggles Continue — Impact on Moneyline Trends", time: '2h ago', color: '#22c55e' },
  { tag: 'NFL', title: "Chiefs ATS Record Defies Vegas: 7-Game Cover Streak Explained", time: '4h ago', color: '#f59e0b' },
  { tag: 'NBA', title: "Celtics Home Court Advantage by the Numbers — 2025-26 Deep Dive", time: '6h ago', color: '#f97316' },
  { tag: 'ATP', title: "Djokovic Dominates Hard Court — Match Winner Odds Analysis", time: '8h ago', color: '#84cc16' },
  { tag: 'NHL', title: "Puck Line Value: Where the Market Overreacts to Goalie Starts", time: '10h ago', color: '#3b82f6' },
]

export default function NewsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace', padding: '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>Latest</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            News & Analysis
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {ARTICLES.map((a, i) => (
            <div key={i} style={{ background: '#0f0f14', borderBottom: '1px solid #1a1a24', padding: '20px 0', display: 'flex', alignItems: 'flex-start', gap: 16, cursor: 'pointer' }}>
              <div style={{ fontSize: 9, color: a.color, background: a.color + '18', border: `1px solid ${a.color}33`, borderRadius: 4, padding: '3px 8px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap', marginTop: 2 }}>
                {a.tag}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7', letterSpacing: '0.02em', lineHeight: 1.4 }}>{a.title}</div>
                <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#52525b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Full news feed coming soon — daily articles, trend alerts & value picks
          </div>
        </div>
      </div>
    </div>
  )
}
