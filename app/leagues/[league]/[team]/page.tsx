'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import GambchopChart from '@/components/GambchopChart'
import { LEAGUE_MAP, generateChartData, slugify } from '@/lib/leagues-data'
import type { TeamChartData } from '@/lib/leagues-data'
import { fetchTeamOutcomes } from '@/lib/chart-data'
import { useAuth } from '@/lib/auth-context'
import { useUser, FREE_FOLLOWS } from '@/lib/user-context'
import { type Favorite, type BetType, fetchFavorites, addFavorite, removeFavorite } from '@/lib/favorites'
import ChartLegend from '@/components/ChartLegend'

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 18px', minWidth: 100, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: '0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
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

export default function TeamPage() {
  const params = useParams<{ league: string; team: string }>()
  const router = useRouter()
  const { memberTier, openModal, setIsMember, user } = useAuth()
  const { isFollowing, toggleFollow, follows } = useUser()

  const leagueId  = params?.league ?? ''
  const teamSlug  = params?.team ?? ''
  const meta      = LEAGUE_MAP[leagueId]
  const entity    = meta?.entities.find(n => slugify(n) === teamSlug)

  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])

  // MLB → real Supabase data; all other leagues → mock fallback
  const [chartData, setChartData]     = useState<TeamChartData[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    if (!meta || !entity) return
    if (leagueId !== 'mlb') {
      setChartData(generateChartData([entity], 10))
      setDataLoading(false)
      return
    }
    fetchTeamOutcomes('mlb', teamSlug, 10).then(games => {
      if (games.length > 0) {
        setChartData([{
          teamName:     entity,
          abbreviation: entity.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4),
          games,
        }])
      } else {
        console.warn('[gambchop] fetchTeamOutcomes returned empty — using mock fallback')
        setChartData(generateChartData([entity], 10))
      }
      setDataLoading(false)
    })
  }, [leagueId, teamSlug, entity])   // eslint-disable-line react-hooks/exhaustive-deps
    
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

  const [teamFavorites, setTeamFavorites] = useState<Favorite[]>([])
  const [favError, setFavError]           = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id || !ready) return
    fetchFavorites(user.id).then(all => setTeamFavorites(all.filter(f => f.team_name === entity)))
  }, [user?.id, ready, entity])

  const starredBetTypes = useMemo(
    () => new Set(teamFavorites.map(f => `${entity}|${f.bet_type}`)),
    [teamFavorites, entity],
  )

  async function handleStarClick(betType: string, _teamName: string) {
    if (!user?.id || !entity) return
    const bt = betType as BetType
    const existing = teamFavorites.find(f => f.bet_type === bt)
    if (existing) {
      const ok = await removeFavorite(existing.id)
      if (ok) setTeamFavorites(prev => prev.filter(f => f.id !== existing.id))
    } else {
      if (memberTier !== 'pro') { router.push('/pricing'); return }
      const all = await fetchFavorites(user.id)
      const result = await addFavorite(
        user.id,
        { team_name: entity, league_id: leagueId, league_name: meta.name, bet_type: bt },
        all.length,
      )
      if (result.error) {
        setFavError(result.error)
        setTimeout(() => setFavError(null), 4000)
      } else {
        setTeamFavorites(prev => [...prev, result.data!])
      }
    }
  }

  if (!meta || !entity) return notFound()

  const seed     = hash(entity)
  const isPlayer = meta.entityType === 'player'

  const stats = isPlayer
    ? [
        { label: 'ML Record',   value: fakeRecord(seed, 0), color: '#22c55e' },
        { label: 'Fav Record',  value: fakeRecord(seed, 1), color: '#eab308' },
        { label: 'Dog Record',  value: fakeRecord(seed, 2), color: '#f97316' },
        { label: 'O/U',         value: fakeRecord(seed, 3), color: '#8b5cf6' },
      ]
    : [
        { label: 'ML Record',   value: fakeRecord(seed, 0), color: '#22c55e' },
        { label: 'Spread ATS',  value: fakeRecord(seed, 1), color: '#3b82f6' },
        { label: 'Home',        value: fakeRecord(seed, 2), color: '#14b8a6' },
        { label: 'Away',        value: fakeRecord(seed, 3), color: '#94a3b8' },
        { label: 'As Favorite', value: fakeRecord(seed, 4), color: '#eab308' },
        { label: 'As Underdog', value: fakeRecord(seed, 5), color: '#f97316' },
        { label: 'Over',        value: `${4 + seed % 5}-${3 + (seed + 2) % 4}`, color: '#8b5cf6' },
        { label: 'Under',       value: `${3 + seed % 4}-${4 + (seed + 1) % 5}`, color: '#b45309' },
      ]

  const showStats = ready && memberTier !== 'none'

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'var(--font-geist-mono), monospace', padding: '0 0 80px' }}>

      {/* Breadcrumb */}
      <div style={{ padding: '12px 24px', borderBottom: `1px solid #14141c` }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: MUTED }}>Home</Link>
          <span>/</span>
          <Link href="/teams" style={{ textDecoration: 'none', color: MUTED }}>Teams</Link>
          <span>/</span>
          <Link href={`/leagues/${leagueId}`} style={{ textDecoration: 'none', color: MUTED }}>{meta.name}</Link>
          <span>/</span>
          <span style={{ color: meta.accent }}>{entity}</span>
        </div>
      </div>

      {/* Entity header */}
      <div style={{ padding: '28px 24px 20px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 48, lineHeight: 1 }}>{meta.emoji}</span>
            <div>
              <div style={{ fontSize: 9, color: meta.accent, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>
                {meta.full} · {isPlayer ? 'Player' : 'Team'} Analysis
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
                {entity}
              </h1>
            </div>
            {ready && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {memberTier === 'none' && (
                  <div style={{ fontSize: 9, color: MUTED, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    🔒 Sign in to view chart
                  </div>
                )}
                {memberTier === 'free' && (
                  <div style={{ fontSize: 9, color: '#22c55e', background: '#22c55e0d', border: '1px solid #22c55e33', borderRadius: 6, padding: '6px 12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                    Free · Last 3 Games
                  </div>
                )}
                {memberTier === 'pro' && (
                  <div style={{ fontSize: 9, color: '#8b5cf6', background: '#8b5cf60d', border: '1px solid #8b5cf633', borderRadius: 6, padding: '6px 12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                    ⚡ Pro · Full Season
                  </div>
                )}
                {memberTier !== 'none' && (() => {
                  const following = isFollowing(teamSlug)
                  const atLimit   = !following && memberTier === 'free' && follows.length >= FREE_FOLLOWS
                  return (
                    <button
                      onClick={() => { if (!atLimit) toggleFollow(teamSlug, leagueId, entity) }}
                      style={{
                        background: following ? `${meta.accent}22` : atLimit ? CARD : 'transparent',
                        border: `1px solid ${following ? meta.accent + '66' : atLimit ? BORDER : meta.accent + '55'}`,
                        borderRadius: 6, padding: '6px 14px', cursor: atLimit ? 'default' : 'pointer',
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: following ? meta.accent : atLimit ? MUTED : meta.accent,
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      {following ? '✓ Following' : atLimit ? '+ Follow (Pro)' : '+ Follow'}
                    </button>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Stats row */}
          {showStats ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {stats.map(s => <StatBlock key={s.label} {...s} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {stats.map(s => (
                <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 18px', minWidth: 100, textAlign: 'center', filter: 'blur(4px)', opacity: 0.4 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#3f3f46' }}>---</div>
                  <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart section */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 8px' }}>
        {ready && memberTier === 'none' && (
          <div style={{ margin: '0 16px 16px', background: '#0f0f14', border: '1px solid #1a1a24', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                Join to View {isPlayer ? 'Player' : 'Team'} Charts
              </div>
              <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.6 }}>
                Free members see the last 3 games. Pro members get the full season for every {isPlayer ? 'player' : 'team'}.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => { setIsMember(true); openModal('join') }}
                style={{ background: 'none', border: '1px solid #2a2a34', borderRadius: 8, color: SUB, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '10px 18px', fontFamily: 'inherit' }}
              >
                Join Free
              </button>
              <button
                onClick={() => openModal('pro')}
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 8, color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '10px 18px', fontFamily: 'inherit', boxShadow: '0 0 16px #22c55e44' }}
              >
                Go Pro →
              </button>
            </div>
          </div>
        )}

        <div style={{ fontSize: 10, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0 12px 12px' }}>
          {memberTier === 'pro' ? 'Last 10 Games — Full Season' : memberTier === 'free' ? 'Last 10 Games — Free Preview (3 shown)' : 'Last 10 Games'}
        </div>

        {favError && (
          <div style={{ margin: '0 12px 12px', background: '#ef444418', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#ef4444', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{favError}</span>
            <button onClick={() => setFavError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, fontFamily: 'inherit' }}>✕</button>
          </div>
        )}

        {ready && (
          dataLoading ? (
            <div style={{ padding: 60, textAlign: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Loading game data…
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', paddingLeft: 196 }}>
              <ChartLegend />
              <div style={{ flex: 1, minWidth: 0 }}>
                <GambchopChart
                  data={chartData}
                  memberTier={memberTier}
                  accent={meta.accent}
                  onJoin={() => { setIsMember(true); openModal('join') }}
                  onUpgrade={() => openModal('pro')}
                  starredBetTypes={user ? starredBetTypes : undefined}
                  onStarClick={user ? handleStarClick : undefined}
                />
              </div>
            </div>
          )
        )}
      </div>

      {/* Back links */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 12, maxWidth: 1400, margin: '0 auto', flexWrap: 'wrap' }}>
        <Link href={`/leagues/${leagueId}`} style={{ textDecoration: 'none', fontSize: 11, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '9px 18px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          ← {meta.name} Chart
        </Link>
        <Link href="/teams" style={{ textDecoration: 'none', fontSize: 11, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '9px 18px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          ← All Teams
        </Link>
      </div>
    </div>
  )
}
