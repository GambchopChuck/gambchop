'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { NewsArticle, StreakArticle, OutcomeCell, SportTag } from '@/lib/news'
import { SPORT_TAGS, SPORT_COLORS, timeAgo } from '@/lib/news'
import { TEAM_ROUTES, linkifyTeamNames } from '@/lib/teamRoutes'

const ACCENT = '#39ff9a'

const BET_TYPE_LABELS: Record<string, string> = {
  moneyline:  'Moneyline',
  spread:     'Spread',
  over_under: 'Over/Under',
}

// Article type badge styles — streak=green, record=blue, reversal=amber, leader=purple
const ARTICLE_TYPE_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  streak:   { bg: '#0a1a0f', color: '#4ade80', border: '#4ade8033', label: 'STREAK'   },
  record:   { bg: '#0a0f1a', color: '#60a5fa', border: '#60a5fa33', label: 'RECORD'   },
  reversal: { bg: '#1a1000', color: '#fbbf24', border: '#fbbf2433', label: 'REVERSAL' },
  leader:   { bg: '#150a1a', color: '#a855f7', border: '#a855f733', label: 'LEADER'   },
}
const DEFAULT_BADGE = ARTICLE_TYPE_BADGE.streak

type PrimaryTab = 'sports' | 'chart'

interface Props {
  articles:       NewsArticle[]
  streakArticles: StreakArticle[]
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function NewsPageClient({ articles, streakArticles }: Props) {
  const searchParams = useSearchParams()
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('sports')
  const [leagueTab,  setLeagueTab]  = useState<SportTag>('ALL')

  // Honour ?tab=sports or ?tab=chart from deep links (e.g. homepage "See More" buttons)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'chart' || tab === 'sports') setPrimaryTab(tab)
  }, [searchParams])

  const filteredNews = useMemo(
    () => leagueTab === 'ALL' ? articles : articles.filter(a => a.sport === leagueTab),
    [articles, leagueTab],
  )

  const hero     = filteredNews[0] ?? null
  const newsFeed = filteredNews.slice(1)
  const trending = articles.slice(0, 5)

  return (
    <div style={{ paddingLeft: 64, minHeight: '100vh' }}>

      {/* ── Sticky header: primary tabs + optional league filter ───────────── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 30,
        background: 'rgba(8,8,13,0.97)',
        borderBottom: '1px solid #1a1a24',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Primary tabs */}
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 2, height: 48,
          borderBottom: primaryTab === 'sports' ? '1px solid #1a1a24' : 'none',
        }}>
          {(['sports', 'chart'] as PrimaryTab[]).map(tab => {
            const active = tab === primaryTab
            const label  = tab === 'sports' ? 'Sports News' : 'Chart News'
            return (
              <button
                key={tab}
                onClick={() => setPrimaryTab(tab)}
                style={{
                  background:    active ? ACCENT       : 'transparent',
                  color:         active ? '#000'        : '#71717a',
                  border:        active ? 'none'        : '1px solid transparent',
                  borderRadius:  6,
                  padding:       '5px 16px',
                  fontSize:      12,
                  fontWeight:    700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor:        'pointer',
                  fontFamily:    'var(--font-geist-mono), monospace',
                  transition:    'all 0.15s',
                  boxShadow:     active ? `0 0 12px ${ACCENT}55` : 'none',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#d4d4d8' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#71717a' }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* League filter — only under Sports News */}
        {primaryTab === 'sports' && (
          <div style={{
            maxWidth: 1400, margin: '0 auto', padding: '0 24px',
            display: 'flex', alignItems: 'center', gap: 4, height: 40,
          }}>
            {SPORT_TAGS.map(tag => {
              const active = tag === leagueTab
              return (
                <button
                  key={tag}
                  onClick={() => setLeagueTab(tag)}
                  style={{
                    background:    active ? `${ACCENT}18` : 'transparent',
                    color:         active ? ACCENT         : '#52525b',
                    border:        active ? `1px solid ${ACCENT}44` : '1px solid transparent',
                    borderRadius:  5,
                    padding:       '3px 12px',
                    fontSize:      10,
                    fontWeight:    700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor:        'pointer',
                    fontFamily:    'var(--font-geist-mono), monospace',
                    transition:    'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#52525b' }}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{
          fontSize: 10, color: '#52525b', letterSpacing: '0.3em',
          textTransform: 'uppercase', margin: '0 0 6px',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}>
          {primaryTab === 'sports' ? 'Daily feed' : 'Gambchop data'}
        </p>
        <h1 style={{
          fontSize: 28, fontWeight: 900, color: '#f4f4f5',
          letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
        }}>
          {primaryTab === 'sports' ? 'News & Analysis' : 'Streak Spotlights'}
        </h1>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 64px' }}>
        {primaryTab === 'sports' ? (
          <SportsNewsFeed
            hero={hero}
            feed={newsFeed}
            trending={trending}
            allArticles={articles}
            leagueTab={leagueTab}
          />
        ) : (
          <ChartNewsFeed
            streakArticles={streakArticles}
          />
        )}
      </div>
    </div>
  )
}

// ─── Sports News feed ─────────────────────────────────────────────────────────

function SportsNewsFeed({
  hero,
  feed,
  trending,
  allArticles,
  leagueTab,
}: {
  hero:        NewsArticle | null
  feed:        NewsArticle[]
  trending:    NewsArticle[]
  allArticles: NewsArticle[]
  leagueTab:   SportTag
}) {
  if (!hero && feed.length === 0) {
    return <EmptyState label={leagueTab === 'ALL' ? 'Sports News' : leagueTab} />
  }

  return (
    <>
      {hero && <HeroCard article={hero} />}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 300px',
        gap: 32, marginTop: 32,
      }}>
        <div>
          {feed.length === 0 ? (
            <p style={{ fontSize: 13, color: '#52525b', padding: '12px 0' }}>
              Only one article found for this league right now.
            </p>
          ) : (
            feed.map(a => <ArticleRow key={a.id} article={a} />)
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <StoryCountWidget count={allArticles.length} label="news articles in feed" />
          <TrendingWidget trending={trending} />
        </aside>
      </div>
    </>
  )
}

// ─── Chart News feed ──────────────────────────────────────────────────────────

function ChartNewsFeed({ streakArticles }: { streakArticles: StreakArticle[] }) {
  if (streakArticles.length === 0) {
    return <EmptyState label="Chart News" />
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 300px',
      gap: 32,
    }}>
      <div>
        {streakArticles.map(a => <StreakArticleRow key={a.id} article={a} />)}
      </div>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <StoryCountWidget count={streakArticles.length} label="streak spotlights today" />
        <ChartLegend />
      </aside>
    </div>
  )
}

// ─── Hero card ────────────────────────────────────────────────────────────────

function HeroCard({ article }: { article: NewsArticle }) {
  const sc = article.sport ? SPORT_COLORS[article.sport] : null

  return (
    <Link
      href={article.article_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          position: 'relative', borderRadius: 14, overflow: 'hidden',
          background: '#0f0f14', border: '1px solid #1a1a24',
          minHeight: 380, cursor: 'pointer', transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = `${ACCENT}44`}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#1a1a24'}
      >
        {article.image_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image_url} alt=""
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center top',
              }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(2,4,2,0.96) 0%, rgba(5,6,10,0.72) 45%, rgba(5,6,10,0.25) 100%)',
            }} />
          </>
        )}

        <div style={{
          position: 'relative', zIndex: 1, padding: '32px 32px 28px',
          display: 'flex', flexDirection: 'column', minHeight: 380,
        }}>
          <div style={{ marginBottom: 'auto' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.25em',
              textTransform: 'uppercase', color: ACCENT,
              fontFamily: 'var(--font-geist-mono), monospace',
              background: `${ACCENT}15`, border: `1px solid ${ACCENT}33`,
              padding: '3px 10px', borderRadius: 4,
            }}>
              Top Story
            </span>
          </div>

          <div style={{ marginTop: 'auto' }}>
            {sc && (
              <span style={{
                display: 'inline-block', background: sc.bg, color: sc.text,
                border: `1px solid ${sc.border}`, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                padding: '3px 10px', borderRadius: 4, marginBottom: 14,
                fontFamily: 'var(--font-geist-mono), monospace',
              }}>
                {article.sport}
              </span>
            )}

            <h2 style={{
              fontSize: clamp(22, 28), fontWeight: 800, color: '#f4f4f5',
              margin: '0 0 12px', lineHeight: 1.25, maxWidth: 780,
            }}>
              {article.headline}
            </h2>

            {article.summary && (
              <p style={{
                fontSize: 15, color: '#a1a1aa', margin: '0 0 16px',
                lineHeight: 1.55, maxWidth: 680,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>
                {article.summary}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#71717a' }}>
              {article.source && <span style={{ color: ACCENT, fontWeight: 600 }}>{article.source}</span>}
              {article.source && article.published_at && <span>·</span>}
              {article.published_at && <span>{timeAgo(article.published_at)}</span>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── News article row ─────────────────────────────────────────────────────────

function ArticleRow({ article }: { article: NewsArticle }) {
  const sc = article.sport ? SPORT_COLORS[article.sport] : null

  return (
    <Link
      href={article.article_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          display: 'flex', gap: 16, alignItems: 'flex-start',
          padding: '16px 4px', borderBottom: '1px solid #1a1a24',
          transition: 'background 0.12s', cursor: 'pointer', borderRadius: 4,
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#0f0f14'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
      >
        <div style={{ paddingTop: 2, flexShrink: 0, width: 52 }}>
          {sc && (
            <span style={{
              display: 'inline-block', background: sc.bg, color: sc.text,
              border: `1px solid ${sc.border}`, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 3,
              fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap',
            }}>
              {article.sport}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 15, fontWeight: 600, color: '#e4e4e7', margin: '0 0 5px',
            lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {article.headline}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#52525b' }}>
            {article.source && <span style={{ color: '#71717a' }}>{article.source}</span>}
            {article.source && article.published_at && <span>·</span>}
            {article.published_at && <span>{timeAgo(article.published_at)}</span>}
          </div>
        </div>

        {article.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url} alt=""
            style={{
              width: 88, height: 64, objectFit: 'cover',
              borderRadius: 6, flexShrink: 0, background: '#1a1a24',
            }}
          />
        )}
      </div>
    </Link>
  )
}

// ─── Streak article row ───────────────────────────────────────────────────────

function StreakArticleRow({ article }: { article: StreakArticle }) {
  const badge = ARTICLE_TYPE_BADGE[article.article_type ?? 'streak'] ?? DEFAULT_BADGE

  const footerSuffix =
    article.article_type === 'reversal' ? `${article.streak_length}-game ${article.streak_direction} streak ended`
    : article.article_type === 'record'  ? 'season record'
    : article.article_type === 'leader'  ? 'this month'
    : `${article.streak_length}-game ${article.streak_direction} streak`

  return (
    <div
      style={{
        display: 'flex', gap: 16, alignItems: 'flex-start',
        padding: '20px 4px', borderBottom: '1px solid #1a1a24',
        borderRadius: 4, transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#0a0f0a'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
      {/* Type badge */}
      <div style={{ paddingTop: 2, flexShrink: 0, width: 64 }}>
        <span style={{
          display: 'inline-block',
          background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
          fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '3px 6px', borderRadius: 3,
          fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap',
        }}>
          {badge.label}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* eslint-disable-next-line react/no-danger */}
        <p
          style={{ fontSize: 15, fontWeight: 600, color: '#e4e4e7', margin: '0 0 6px', lineHeight: 1.35 }}
          dangerouslySetInnerHTML={{ __html: linkifyTeamNames(article.headline) }}
        />

        {/* eslint-disable-next-line react/no-danger */}
        <p
          style={{ fontSize: 13, color: '#71717a', margin: '0 0 10px', lineHeight: 1.55 }}
          dangerouslySetInnerHTML={{ __html: linkifyTeamNames(article.body) }}
        />

        {/* Inline SVG chart strip — rendered directly from server-generated SVG */}
        <OutcomeStripSvg svg={article.chart_svg} fallbackCells={article.outcome_cells} />

        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          gap: 6, fontSize: 11, color: '#52525b', marginTop: 8,
        }}>
          {TEAM_ROUTES[article.team_name] ? (
            <Link
              href={TEAM_ROUTES[article.team_name]}
              style={{ color: badge.color, fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              {article.team_name}
            </Link>
          ) : (
            <span style={{ color: badge.color, fontWeight: 600 }}>{article.team_name}</span>
          )}
          <span>·</span>
          <span>{article.league}</span>
          <span>·</span>
          <span>{BET_TYPE_LABELS[article.bet_type] ?? article.bet_type}</span>
          <span>·</span>
          <span style={{ color: '#a1a1aa' }}>{footerSuffix}</span>
          {article.generated_at && <><span>·</span><span>{timeAgo(article.generated_at)}</span></>}
        </div>
      </div>
    </div>
  )
}

// ─── SVG chart strip ──────────────────────────────────────────────────────────
// Renders the server-generated SVG string inline. Falls back to CSS squares
// for legacy articles that predate chart_svg (before this deploy).

const OUTCOME_COLORS: Record<string, string> = {
  win: '#4ade80', loss: '#ef4444', over: '#a855f7', under: '#7dd3fc', push: '#fbbf24',
}

function OutcomeStripSvg({
  svg,
  fallbackCells,
}: {
  svg:           string | null
  fallbackCells: OutcomeCell[]
}) {
  if (svg) {
    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }
  // Fallback for rows without chart_svg
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {fallbackCells.map((cell, i) => (
        <div
          key={i}
          title={`${cell.result} · ${cell.date}`}
          style={{
            width: 12, height: 12, borderRadius: 2, flexShrink: 0,
            background: OUTCOME_COLORS[cell.result] ?? '#3f3f46',
          }}
        />
      ))}
    </div>
  )
}

// ─── Sidebar: story count ─────────────────────────────────────────────────────

function StoryCountWidget({ count, label }: { count: number; label: string }) {
  return (
    <div style={{
      background: '#0a0a0f', border: '1px solid #1a1a24', borderRadius: 10, padding: '18px 20px',
    }}>
      <p style={{
        fontSize: 10, color: '#52525b', letterSpacing: '0.22em', textTransform: 'uppercase',
        margin: '0 0 10px', fontFamily: 'var(--font-geist-mono), monospace',
      }}>
        In feed
      </p>
      <p style={{
        fontSize: 38, fontWeight: 900, color: ACCENT, margin: 0,
        lineHeight: 1, textShadow: `0 0 20px ${ACCENT}55`,
      }}>
        {count}
      </p>
      <p style={{ fontSize: 11, color: '#52525b', margin: '6px 0 0' }}>{label}</p>
    </div>
  )
}

// ─── Sidebar: chart legend (Chart News tab) ───────────────────────────────────

function ChartLegend() {
  const entries = [
    { color: OUTCOME_COLORS.win,   label: 'Win / Cover'   },
    { color: OUTCOME_COLORS.loss,  label: 'Loss / No-cover' },
    { color: OUTCOME_COLORS.over,  label: 'Over'          },
    { color: OUTCOME_COLORS.under, label: 'Under'         },
    { color: OUTCOME_COLORS.push,  label: 'Push'          },
  ]

  return (
    <div style={{
      background: '#0a0a0f', border: '1px solid #1a1a24', borderRadius: 10, padding: '18px 20px',
    }}>
      <p style={{
        fontSize: 10, color: '#52525b', letterSpacing: '0.22em', textTransform: 'uppercase',
        margin: '0 0 14px', fontFamily: 'var(--font-geist-mono), monospace',
      }}>
        Chart key
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#71717a' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sidebar: trending (Sports News tab) ─────────────────────────────────────

function TrendingWidget({ trending }: { trending: NewsArticle[] }) {
  if (trending.length === 0) return null

  return (
    <div style={{
      background: '#0a0a0f', border: '1px solid #1a1a24', borderRadius: 10, padding: '18px 20px',
    }}>
      <p style={{
        fontSize: 10, color: '#52525b', letterSpacing: '0.22em', textTransform: 'uppercase',
        margin: '0 0 16px', fontFamily: 'var(--font-geist-mono), monospace',
      }}>
        Trending
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {trending.map((article, i) => {
          const sc = article.sport ? SPORT_COLORS[article.sport] : null
          return (
            <Link
              key={article.id}
              href={article.article_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}
            >
              <span style={{
                fontSize: 22, fontWeight: 900, color: '#1f1f2a', lineHeight: 1.1,
                minWidth: 22, flexShrink: 0, fontFamily: 'var(--font-geist-mono), monospace',
              }}>
                {i + 1}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                {sc && (
                  <span style={{
                    display: 'inline-block', background: sc.bg, color: sc.text,
                    border: `1px solid ${sc.border}`, fontSize: 8, fontWeight: 700,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    padding: '2px 6px', borderRadius: 3, marginBottom: 5,
                    fontFamily: 'var(--font-geist-mono), monospace',
                  }}>
                    {article.sport}
                  </span>
                )}
                <p
                  style={{
                    fontSize: 13, fontWeight: 600, color: '#d4d4d8', margin: 0,
                    lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                    transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLParagraphElement).style.color = ACCENT}
                  onMouseLeave={e => (e.currentTarget as HTMLParagraphElement).style.color = '#d4d4d8'}
                >
                  {article.headline}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 24px', textAlign: 'center',
    }}>
      <div style={{
        fontSize: 32, fontWeight: 900, color: '#1a1a24',
        letterSpacing: '0.1em', marginBottom: 16,
      }}>
        {label}
      </div>
      <p style={{ fontSize: 14, color: '#52525b', margin: 0 }}>
        No articles yet. Check back after the next daily refresh.
      </p>
    </div>
  )
}

// ─── Responsive font clamp ────────────────────────────────────────────────────

function clamp(min: number, max: number): string {
  return `clamp(${min}px, 3vw, ${max}px)`
}
