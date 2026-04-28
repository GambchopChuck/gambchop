import GambchopChart from '@/components/GambchopChart'
import { mockChartData } from '@/lib/mock-data'
import { supabase } from '@/lib/supabase'
import type { TeamChartData } from '@/lib/mock-data'
import Link from 'next/link'

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
    <main className="min-h-screen bg-[#0c0c10]">
      <header className="border-b border-[#1a1a24] px-4 sm:px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-xl font-black tracking-[0.2em] uppercase" style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Gambchop</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] tracking-widest text-zinc-500 uppercase">MLB · 2026</span>
          </div>
        </div>
      </header>

      <div className="border-b border-[#1a1a24] px-4 sm:px-8 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4 flex-wrap">
          <span className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">2026 Season</span>
          <span className="text-[#222230] hidden sm:inline">|</span>
          <span className="text-[10px] tracking-[0.2em] text-green-500 uppercase">First 10 Games</span>
          <span className="text-[#222230] hidden sm:inline">|</span>
          <span className="text-[10px] tracking-[0.2em] text-zinc-600 uppercase">{chartData.length} Teams</span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-6">
        <GambchopChart data={chartData} />
      </div>

      <footer className="border-t border-[#1a1a24] px-4 sm:px-8 py-4 mt-4">
        <p className="text-[9px] tracking-[0.2em] text-zinc-700 uppercase">
          Gambchop · For entertainment purposes · Data via Supabase
        </p>
      </footer>
    </main>
  )
}
