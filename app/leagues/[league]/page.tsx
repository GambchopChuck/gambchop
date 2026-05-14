'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import GambchopChart from '@/components/GambchopChart'
import { LEAGUE_MAP, generateChartData, slugify } from '@/lib/leagues-data'
import type { TeamChartData } from '@/lib/leagues-data'
import { fetchLeagueOutcomes, computeStreak } from '@/lib/chart-data'
import { useAuth } from '@/lib/auth-context'
import { type Favorite, type BetType, fetchFavorites, addFavorite, removeFavorite } from '@/lib/favorites'

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortMode = 'az' | 'za' | 'best-record' | 'hot' | 'cold'

const SORT_LABELS: Record<SortMode, string> = {
  'az':          'A–Z',
  'za':          'Z–A',
  'best-record': 'Best Record',
  'hot':         'Hottest Streak',
  'cold':        'Coldest Streak',
}

const LEAGUE_SORT_LS_KEY = 'gambchop-league-sort'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaguePage() {
  const params = useParams<{ league: string }>()
  const router = useRouter()
  const { user, memberTier, loading: authLoading } = useAuth()

  const leagueId = params?.league ?? ''
  const meta = LEAGUE_MAP[leagueId]
  if (!meta) return notFound()

  // MLB → real Supabase data; all other leagues → mock fallback
  const [chartData, setChartData]     = useState<TeamChartData[]>(() => generateChartData(meta.entities, 10))
  const [dataLoading, setDataLoading] = useState(leagueId === 'mlb')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    if (leagueId !== 'mlb') return
    fetchLeagueOutcomes('mlb').then(data => {
      if (data.length > 0) {
        setChartData(data)
      } else {
        console.warn('[gambchop] fetchLeagueOutcomes returned empty — using mock fallback')
      }
      setDataLoading(false)
    })
  }, [leagueId])

  useEffect(() => {
    if (leagueId !== 'mlb') return
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('ingestion_runs')
        .select('completed_at')
        .eq('status', 'success')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data?.completed_at) setLastUpdated(data.completed_at as string)
        })
    })
  }, [leagueId])

  // ── Sort ────────────────────────────────────────────────────────────────────
  const [sortMode, setSortMode] = useState<SortMode>('az')

  useEffect(() => {
    const saved = localStorage.getItem(LEAGUE_SORT_LS_KEY) as SortMode | null
    if (saved && saved in SORT_LABELS) setSortMode(saved)
  }, [])

  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode)
    localStorage.setItem(LEAGUE_SORT_LS_KEY, mode)
  }

  const sortedChartData = useMemo((): TeamChartData[] => {
    const sorted = [...chartData]
    switch (sortMode) {
      case 'az':
        return sorted.sort((a, b) => a.teamName.localeCompare(b.teamName))
      case 'za':
        return sorted.sort((a, b) => b.teamName.localeCompare(a.teamName))
      case 'best-record': {
        const rate = (d: TeamChartData) => {
          const w = d.games.filter(g => g.moneylineResult === 'win').length
          const l = d.games.filter(g => g.moneylineResult === 'loss').length
          return (w + l) === 0 ? -1 : w / (w + l)
        }
        return sorted.sort((a, b) => {
          const diff = rate(b) - rate(a)
          return diff !== 0 ? diff : a.teamName.localeCompare(b.teamName)
        })
      }
      case 'hot':
        return sorted.sort((a, b) => {
          const aW = computeStreak(a.games, 'moneyline')?.type === 'W' ? (computeStreak(a.games, 'moneyline')?.count ?? 0) : 0
          const bW = computeStreak(b.games, 'moneyline')?.type === 'W' ? (computeStreak(b.games, 'moneyline')?.count ?? 0) : 0
          return aW !== bW ? bW - aW : a.teamName.localeCompare(b.teamName)
        })
      case 'cold':
        return sorted.sort((a, b) => {
          const aL = computeStreak(a.games, 'moneyline')?.type === 'L' ? (computeStreak(a.games, 'moneyline')?.count ?? 0) : 0
          const bL = computeStreak(b.games, 'moneyline')?.type === 'L' ? (computeStreak(b.games, 'moneyline')?.count ?? 0) : 0
          return aL !== bL ? bL - aL : a.teamName.localeCompare(b.teamName)
        })
      default:
        return sorted
    }
  }, [chartData, sortMode])

  // ── Favorites ────────────────────────────────────────────────────────────────
  const [allFavorites, setAllFavorites] = useState<Favorite[]>([])
  const [favError, setFavError]         = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    fetchFavorites(user.id).then(setAllFavorites)
  }, [user?.id])

  const starredBetTypes = useMemo(
    () => new Set(allFavorites.map(f => `${f.team_name}|${f.bet_type}`)),
    [allFavorites],
  )

  async function handleStarClick(betType: string, teamName: string) {
    if (!user?.id) return
    const bt = betType as BetType
    const existing = allFavorites.find(f => f.team_name === teamName && f.bet_type === bt)
    if (existing) {
      const ok = await removeFavorite(existing.id)
      if (ok) setAllFavorites(prev => prev.filter(f => f.id !== existing.id))
    } else {
      if (memberTier !== 'pro') { router.push('/pricing'); return }
      const result = await addFavorite(
        user.id,
        { team_name: teamName, league_id: leagueId, league_name: meta.name, bet_type: bt },
        allFavorites.length,
      )
      if (result.error) {
        setFavError(result.error)
        setTimeout(() => setFavError(null), 4000)
      } else {
        setAllFavorites(prev => [...prev, result.data!])
      }
    }
  }

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

      {favError && (
        <div style={{ maxWidth: 1400, margin: '12px auto 0', padding: '0 8px' }}>
          <div style={{ background: '#ef444418', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#ef4444', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{favError}</span>
            <button onClick={() => setFavError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, fontFamily: 'inherit' }}>✕</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 8px' }}>

        {/* Sort controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sort:</span>
          <select
            value={sortMode}
            onChange={e => handleSortChange(e.target.value as SortMode)}
            style={{
              background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 6,
              color: '#a1a1aa', fontSize: 10, padding: '7px 10px',
              fontFamily: 'var(--font-geist-mono), monospace',
              cursor: 'pointer', outline: 'none',
            }}
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map(k => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>
        </div>

        {dataLoading || authLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#52525b', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Loading game data…
          </div>
        ) : (
          <GambchopChart
            data={sortedChartData}
            memberTier={memberTier}
            accent={meta.accent}
            starredBetTypes={user ? starredBetTypes : undefined}
            onStarClick={user ? handleStarClick : undefined}
            lastUpdated={lastUpdated}
          />
        )}
      </div>

      <footer style={{ borderTop: '1px solid #1a1a24', padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
          Gambchop · For entertainment purposes only
        </p>
      </footer>
    </div>
  )
}
