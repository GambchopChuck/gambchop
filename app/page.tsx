import GambchopChart from '@/components/GambchopChart'
import { mockChartData } from '@/lib/mock-data'
import { supabase } from '@/lib/supabase'
import type { TeamChartData } from '@/lib/mock-data'

async function getChartData(): Promise<TeamChartData[]> {
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, abbreviation')
      .in('abbreviation', ['NYY', 'LAD', 'HOU'])

    if (error || !teams?.length) return mockChartData

    const { data: games } = await supabase
      .from('games')
      .select(`
        id, game_date, home_team_id, away_team_id,
        outcomes ( moneyline_result, spread_result, over_under_result, home_moneyline, away_moneyline )
      `)
      .in('home_team_id', teams.map(t => t.id))
      .eq('status', 'final')
      .order('game_date')
      .limit(30)

    if (!games?.length) return mockChartData

    return mockChartData // swap with real transform once games are populated
  } catch {
    return mockChartData
  }
}

export default async function HomePage() {
  const chartData = await getChartData()

  return (
    <main className="min-h-screen bg-[#05050f]" style={{
      background: `
        radial-gradient(ellipse at 15% 40%, rgba(67,20,140,0.08) 0%, transparent 55%),
        radial-gradient(ellipse at 85% 15%, rgba(20,67,140,0.06) 0%, transparent 50%),
        #05050f
      `
    }}>
      {/* Header */}
      <header className="border-b border-[#12121f] px-4 sm:px-8 py-5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-[0.2em] uppercase"
              style={{
                background: 'linear-gradient(135deg, #a3e635 0%, #22d3ee 50%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(163,230,53,0.3))',
              }}
            >
              Gambchop
            </h1>
            <p className="text-[10px] tracking-[0.3em] text-zinc-600 uppercase mt-0.5">
              MLB Betting Analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-[10px] tracking-widest text-zinc-500 uppercase">Live</span>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="border-b border-[#12121f] px-4 sm:px-8 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4 sm:gap-6 flex-wrap">
          <span className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase">2026 Season</span>
          <span className="text-[#1e1e3a] hidden sm:inline">|</span>
          <span className="text-[10px] tracking-[0.25em] text-lime-500 uppercase">First 10 Games</span>
          <span className="text-[#1e1e3a] hidden sm:inline">|</span>
          <span className="text-[10px] tracking-[0.25em] text-zinc-600 uppercase">3 Teams</span>
        </div>
      </div>

      {/* Chart */}
      <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-6">
        <GambchopChart data={chartData} />
      </div>

      {/* Footer */}
      <footer className="border-t border-[#12121f] px-4 sm:px-8 py-4 mt-8">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[9px] tracking-[0.2em] text-zinc-700 uppercase">
            Gambchop · For entertainment purposes · Data via Supabase
          </p>
        </div>
      </footer>
    </main>
  )
}
