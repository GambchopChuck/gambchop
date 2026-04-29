import { notFound } from 'next/navigation'
import Link from 'next/link'
import GambchopChart from '@/components/GambchopChart'
import { LEAGUE_MAP, generateChartData, slugify } from '@/lib/leagues-data'

interface Props {
  params: Promise<{ league: string; team: string }>
}

export async function generateStaticParams() {
  const { LEAGUES } = await import('@/lib/leagues-data')
  return LEAGUES.flatMap(l =>
    l.entities.map(name => ({ league: l.id, team: slugify(name) }))
  )
}

// ─── Stat blocks ─────────────────────────────────────────────────────────────

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 10, padding: '16px 20px', minWidth: 120, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '0.02em' }}>{value}</div>
      <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function fakeRecord(seed: number, offset: number): string {
  const w = 3 + ((seed + offset) % 8)
  const l = 2 + ((seed + offset + 3) % 6)
  return `${w}-${l}`
}

export default async function TeamPage({ params }: Props) {
  const { league: leagueId, team: teamSlug } = await params
  const meta = LEAGUE_MAP[leagueId]
  if (!meta) notFound()

  const entity = meta.entities.find(n => slugify(n) === teamSlug)
  if (!entity) notFound()

  const chartData = generateChartData([entity], 10)
  const seed = hash(entity)
  const isPlayer = meta.entityType === 'player'

  const stats = isPlayer
    ? [
        { label: 'ML Record',      value: fakeRecord(seed, 0), color: '#22c55e' },
        { label: 'Fav Record',     value: fakeRecord(seed, 1), color: '#eab308' },
        { label: 'Dog Record',     value: fakeRecord(seed, 2), color: '#f97316' },
        { label: 'O/U',            value: fakeRecord(seed, 3), color: '#8b5cf6' },
      ]
    : [
        { label: 'ML Record',      value: fakeRecord(seed, 0), color: '#22c55e' },
        { label: 'Spread ATS',     value: fakeRecord(seed, 1), color: '#3b82f6' },
        { label: 'Home',           value: fakeRecord(seed, 2), color: '#14b8a6' },
        { label: 'Away',           value: fakeRecord(seed, 3), color: '#94a3b8' },
        { label: 'As Favorite',    value: fakeRecord(seed, 4), color: '#eab308' },
        { label: 'As Underdog',    value: fakeRecord(seed, 5), color: '#f97316' },
        { label: 'Over',           value: `${4 + seed % 5}-${3 + (seed + 2) % 4}`, color: '#8b5cf6' },
        { label: 'Under',          value: `${3 + seed % 4}-${4 + (seed + 1) % 5}`, color: '#b45309' },
      ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace' }}>

      {/* Breadcrumb */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #14141c' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#3f3f46', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#3f3f46' }}>Home</Link>
          <span>/</span>
          <Link href={`/leagues/${leagueId}`} style={{ textDecoration: 'none', color: '#52525b' }}>{meta.name}</Link>
          <span>/</span>
          <span style={{ color: meta.accent }}>{entity}</span>
        </div>
      </div>

      {/* Entity header */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #1a1a24' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ fontSize: 9, color: meta.accent, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
            {meta.full} · {isPlayer ? 'Player' : 'Team'} Analysis
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 24px' }}>
            {entity}
          </h1>

          {/* Stats row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {stats.map(s => <StatBlock key={s.label} {...s} />)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 8px' }}>
        <div style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0 12px 12px' }}>
          Last 10 Games
        </div>
        <GambchopChart data={chartData} accent={meta.accent} />
      </div>

      {/* Back to league */}
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Link href={`/leagues/${leagueId}`} style={{
          textDecoration: 'none', fontSize: 11, color: '#52525b',
          border: '1px solid #2a2a34', borderRadius: 6, padding: '10px 20px',
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          ← Back to {meta.name}
        </Link>
      </div>

      <footer style={{ borderTop: '1px solid #1a1a24', padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
          Gambchop · For entertainment purposes only
        </p>
      </footer>
    </div>
  )
}
