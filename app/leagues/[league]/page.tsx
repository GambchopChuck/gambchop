import { notFound } from 'next/navigation'
import Link from 'next/link'
import GambchopChart from '@/components/GambchopChart'
import { LEAGUE_MAP, generateChartData, slugify } from '@/lib/leagues-data'

interface Props {
  params: Promise<{ league: string }>
}

export async function generateStaticParams() {
  const { LEAGUES } = await import('@/lib/leagues-data')
  return LEAGUES.map(l => ({ league: l.id }))
}

export default async function LeaguePage({ params }: Props) {
  const { league: leagueId } = await params
  const meta = LEAGUE_MAP[leagueId]
  if (!meta) notFound()

  const chartData = generateChartData(meta.entities, 10)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace' }}>

      {/* League header */}
      <div style={{ borderBottom: '1px solid #1a1a24', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 36 }}>{meta.emoji}</span>
          <div>
            <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>
              {meta.full}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              <span style={{ color: meta.accent }}>{meta.name}</span> Betting Chart
            </h1>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.accent, boxShadow: `0 0 10px ${meta.accent}` }} />
            <span style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {meta.entities.length} {meta.entityType === 'player' ? 'Players' : 'Teams'}
            </span>
          </div>
        </div>

        {/* Entity nav pills */}
        <div style={{ maxWidth: 1400, margin: '12px auto 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {meta.entities.map(name => (
            <Link
              key={name}
              href={`/leagues/${leagueId}/${slugify(name)}`}
              style={{
                textDecoration: 'none', fontSize: 9, color: '#52525b',
                background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 4,
                padding: '4px 10px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              {name}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 8px' }}>
        <GambchopChart data={chartData} accent={meta.accent} />
      </div>

      <footer style={{ borderTop: '1px solid #1a1a24', padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
          Gambchop · For entertainment purposes only
        </p>
      </footer>
    </div>
  )
}
