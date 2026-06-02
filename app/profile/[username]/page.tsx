'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { fetchTeamOutcomes } from '@/lib/chart-data'
import { slugify } from '@/lib/leagues-data'
import type { Favorite } from '@/lib/favorites'
import type { GameEntry } from '@/lib/leagues-data'
import { BET_TYPE_LABELS, BET_TYPE_ACCENTS } from '@/lib/favorites'
import { BETTOR_TYPES } from '@/app/profile/settings/page'

// ─── Design tokens ─────────────────────────────────────────────────────────────

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const ACCENT = '#39ff9a'
const GREEN  = '#22c55e'
const PURPLE = '#8b5cf6'
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'
const MONO   = 'var(--font-oswald), "Oswald", sans-serif'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── Profile row type from Supabase ───────────────────────────────────────────

interface PublicProfile {
  id:                    string
  display_name:          string | null
  username:              string
  bio:                   string | null
  status_text:           string | null
  status_updated_at:     string | null
  bettor_type:           string | null
  created_at:            string | null
  is_pro:                boolean
  show_favorites_public: boolean | null
  twitter_handle:        string | null
  instagram_handle:      string | null
  tiktok_handle:         string | null
  youtube_handle:        string | null
  display_social_1:      string | null
  display_social_2:      string | null
}

// ─── Social badge ──────────────────────────────────────────────────────────────

type SocialPlatform = 'twitter' | 'instagram' | 'tiktok' | 'youtube'

const SOCIAL_META: Record<SocialPlatform, { url: (h: string) => string; color: string; label: string }> = {
  twitter:   { url: h => `https://x.com/${h.replace(/^@/, '')}`,          color: '#94a3b8', label: 'X'  },
  instagram: { url: h => `https://instagram.com/${h.replace(/^@/, '')}`,  color: '#e1306c', label: 'IG' },
  tiktok:    { url: h => `https://tiktok.com/@${h.replace(/^@/, '')}`,    color: '#ff0050', label: 'TT' },
  youtube:   { url: h => `https://youtube.com/@${h.replace(/^@/, '')}`,   color: '#ff0000', label: 'YT' },
}

function SocialBadge({ platform, handle, size = 16 }: { platform: string; handle: string; size?: number }) {
  const meta = SOCIAL_META[platform as SocialPlatform]
  if (!meta || !handle) return null
  return (
    <a
      href={meta.url(handle)}
      target="_blank"
      rel="noopener noreferrer"
      title={`${platform}: @${handle}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size,
        background: meta.color + '22', border: `1px solid ${meta.color}55`,
        color: meta.color, fontSize: size * 0.45, fontWeight: 900,
        textDecoration: 'none', letterSpacing: '0.03em',
        fontFamily: MONO, flexShrink: 0,
      }}
    >
      {meta.label}
    </a>
  )
}

// ─── Mini chart strip ──────────────────────────────────────────────────────────

function MiniChartStrip({ leagueId, teamName }: { leagueId: string; teamName: string }) {
  const [games, setGames] = useState<GameEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchTeamOutcomes(leagueId, slugify(teamName), 10)
      .then(g => { setGames(g); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [leagueId, teamName])

  if (!loaded) return <div style={{ height: 14, width: 120, background: BORDER }} />

  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {games.map((g, i) => {
        const bg =
          g.moneylineResult === 'win'  ? GREEN :
          g.moneylineResult === 'loss' ? '#ef4444' :
          g.moneylineResult === 'push' ? '#f4f4f5' : '#2a2a34'
        return (
          <div
            key={i}
            style={{
              width: 14, height: 14,
              background: bg, opacity: g.moneylineResult ? 1 : 0.25,
              boxShadow: g.moneylineResult === 'win' ? `0 0 4px ${GREEN}88` : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Favorite row ──────────────────────────────────────────────────────────────

function FavoriteRow({ fav }: { fav: Favorite }) {
  const accent = BET_TYPE_ACCENTS[fav.bet_type] ?? GREEN
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      padding: '14px 0', borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT, letterSpacing: '0.03em', fontFamily: OSWALD }}>
            {fav.team_name}
          </span>
          <span style={{
            fontSize: 8, color: accent, background: `${accent}18`,
            border: `1px solid ${accent}44`,
            padding: '1px 6px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {BET_TYPE_LABELS[fav.bet_type]}
          </span>
          <span style={{ fontSize: 8, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {fav.league_name}
          </span>
        </div>
        <MiniChartStrip leagueId={fav.league_id} teamName={fav.team_name} />
      </div>
      <Link
        href={`/leagues/${fav.league_id}/${slugify(fav.team_name)}`}
        style={{
          fontSize: 9, color: accent, border: `1px solid ${accent}44`,
          padding: '5px 10px', textDecoration: 'none',
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        Chart →
      </Link>
    </div>
  )
}

// ─── Main public profile page ──────────────────────────────────────────────────

export default function PublicProfilePage() {
  const { username: paramUsername } = useParams<{ username: string }>()
  const { username: myUsername, user: myUser, isPro: viewerIsPro } = useAuth()

  const [profile,   setProfile]   = useState<PublicProfile | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [notFound,  setNotFound]  = useState(false)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!paramUsername) return

    supabase
      .from('profiles')
      .select('id, display_name, username, bio, status_text, status_updated_at, bettor_type, created_at, is_pro, show_favorites_public, twitter_handle, instagram_handle, tiktok_handle, youtube_handle, display_social_1, display_social_2')
      .eq('username', paramUsername)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }

        setProfile(data as PublicProfile)

        // Always fetch favorites — display logic controls visibility
        const { data: favs } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', data.id)
          .order('display_order', { ascending: true })
        setFavorites((favs ?? []) as Favorite[])

        setLoading(false)
      })
  }, [paramUsername])

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.1em', fontFamily: MONO }}>
      Loading profile…
    </div>
  )

  if (notFound || !profile) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', background: BG, fontFamily: MONO }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
        <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10 }}>Profile Not Found</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px', fontFamily: OSWALD }}>
          @{paramUsername} doesn&apos;t exist
        </h1>
        <p style={{ fontSize: 11, color: MUTED, margin: '0 0 24px' }}>
          This profile URL doesn&apos;t match any Gambchop member.
        </p>
        <Link href="/" style={{ color: ACCENT, fontSize: 11, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  )

  const isOwnProfile  = !!myUser && myUsername === profile.username
  const memberSince   = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null
  const displaySocials = [profile.display_social_1, profile.display_social_2].filter(Boolean) as string[]
  const handleFor = (p: string): string | null => {
    if (p === 'twitter')   return profile.twitter_handle
    if (p === 'instagram') return profile.instagram_handle
    if (p === 'tiktok')    return profile.tiktok_handle
    if (p === 'youtube')   return profile.youtube_handle
    return null
  }
  const initial      = (profile.display_name ?? profile.username)[0].toUpperCase()
  const bettorConfig = profile.bettor_type ? BETTOR_TYPES.find(b => b.id === profile.bettor_type) : null

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 80, paddingLeft: 80, fontFamily: MONO }}>

      {/* ── Profile header ──────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '36px 24px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${ACCENT}, #22c55e)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900, color: '#000', fontFamily: OSWALD,
              boxShadow: `0 0 24px ${ACCENT}44`,
            }}>
              {initial}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, letterSpacing: '0.04em', margin: 0, fontFamily: OSWALD }}>
                  {profile.display_name ?? profile.username}
                </h1>
                {profile.is_pro && (
                  <span style={{
                    fontSize: 8, color: PURPLE, background: `${PURPLE}18`,
                    border: `1px solid ${PURPLE}44`,
                    padding: '2px 8px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>⚡ Pro</span>
                )}
                {bettorConfig && (
                  <span style={{
                    fontSize: 8, color: bettorConfig.color,
                    background: `${bettorConfig.color}15`,
                    border: `1px solid ${bettorConfig.color}44`,
                    padding: '2px 8px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    {bettorConfig.icon} {bettorConfig.label}
                  </span>
                )}
                {isOwnProfile && (
                  <Link
                    href="/profile/settings"
                    style={{
                      fontSize: 9, color: ACCENT, border: `1px solid ${ACCENT}44`,
                      padding: '3px 10px', textDecoration: 'none',
                      letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
                    }}
                  >
                    Edit Profile
                  </Link>
                )}
              </div>

              {/* Username */}
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, letterSpacing: '0.04em' }}>
                @{profile.username}
              </div>

              {/* Meta row: member since + social icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {memberSince && (
                  <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>
                    Member since {memberSince}
                  </span>
                )}
                {displaySocials.map(platform => {
                  const handle = handleFor(platform)
                  if (!handle) return null
                  return <SocialBadge key={platform} platform={platform} handle={handle} size={20} />
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Status quote block */}
        {profile.status_text && (
          <div style={{
            borderLeft: `3px solid ${ACCENT}`,
            padding: '14px 20px',
            background: `${ACCENT}07`,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 8, left: 12,
              fontSize: 28, color: ACCENT, opacity: 0.25,
              fontFamily: 'Georgia, serif', lineHeight: 1,
            }}>"</div>
            <p style={{
              fontSize: 14, fontWeight: 600, color: TEXT,
              margin: '0 0 8px', lineHeight: 1.5,
              fontFamily: OSWALD, letterSpacing: '0.03em',
              paddingLeft: 12,
            }}>
              {profile.status_text}
            </p>
            {profile.status_updated_at && (
              <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em', paddingLeft: 12 }}>
                Updated {timeAgo(profile.status_updated_at)}
              </div>
            )}
          </div>
        )}

        {/* About / Bio */}
        {profile.bio && (
          <div>
            <div style={{ fontSize: 9, color: ACCENT, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
              About
            </div>
            <p style={{ fontSize: 12, color: SUB, lineHeight: 1.75, margin: 0, maxWidth: 620 }}>
              {profile.bio}
            </p>
          </div>
        )}

        {/* Bettor Type (read-only) */}
        {bettorConfig && (
          <div>
            <div style={{ fontSize: 9, color: ACCENT, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
              Bettor Type
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'flex-start', gap: 14,
              background: `${bettorConfig.color}0c`,
              border: `1px solid ${bettorConfig.color}33`,
              padding: '16px 20px', maxWidth: 480,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{bettorConfig.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: bettorConfig.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {bettorConfig.label}
                </div>
                <p style={{ fontSize: 10, color: MUTED, margin: 0, lineHeight: 1.6 }}>
                  {bettorConfig.flavor}
                </p>
              </div>
            </div>
            {isOwnProfile && (
              <div style={{ marginTop: 8 }}>
                <Link href="/profile/settings" style={{ fontSize: 9, color: ACCENT, textDecoration: 'none', letterSpacing: '0.08em' }}>
                  Change bettor type →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Favorites ─────────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 9, color: ACCENT, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
            Favorites
          </div>

          {/* Visitor is not Pro — show note */}
          {!isOwnProfile && !viewerIsPro && (
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: '0.04em' }}>
              Favorites are a Pro feature.
            </div>
          )}

          {/* Favorites hidden by owner */}
          {(isOwnProfile || viewerIsPro) && profile.show_favorites_public === false && !isOwnProfile && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: MUTED, letterSpacing: '0.06em' }}>
                This member&apos;s favorites are private.
              </div>
            </div>
          )}

          {/* Show favorites: own profile always, visitors if public */}
          {(isOwnProfile || (viewerIsPro && profile.show_favorites_public !== false)) && (
            favorites.length === 0 ? (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: MUTED }}>
                  {isOwnProfile ? 'No favorites saved yet.' : 'No public favorites yet.'}
                </div>
              </div>
            ) : (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, padding: '4px 20px' }}>
                {favorites.map(fav => <FavoriteRow key={fav.id} fav={fav} />)}
              </div>
            )
          )}
        </div>

      </div>
    </div>
  )
}
