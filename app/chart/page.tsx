import GambchopChart from '@/components/GambchopChart'
import { mockChartData } from '@/lib/mock-data'
import { supabase } from '@/lib/supabase'
import type { TeamChartData } from '@/lib/leagues-data'

async function getChartData(): Promise<TeamChartData[]> {
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, abbreviation')
      .in('abbreviation', ['NYY', 'LAD', 'HOU'])

    if (error || !teams?.length) return mockChartData

    const { data: games } = await supabase
      .from('games')
      .select(`id, game_date, home_team_id, away_team_id,
        outcomes ( moneyline_result, spread_result, over_under_result, home_moneyline, away_moneyline )`)
      .in('home_team_id', teams.map(t => t.id))
      .eq('status', 'final')
      .order('game_date')
      .limit(30)

    if (!games?.length) return mockChartData
    return mockChartData
  } catch {
    return mockChartData
  }
}

export default async function ChartPage() {
  const chartData = await getChartData()

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: 'var(--font-geist-mono), monospace' }}>
      <div style={{ borderBottom: '1px solid #1a1a24', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <span style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase' }}>MLB · 2026 Season · {chartData.length} Teams</span>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 8px' }}>
        <GambchopChart data={chartData} accent="#22c55e" />
      </div>
    </div>
  )
}
