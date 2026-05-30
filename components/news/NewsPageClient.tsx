'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { NewsArticle, SportTag } from '@/lib/news'
import { SPORT_TAGS, SPORT_COLORS, timeAgo } from '@/lib/news'

// ─── Accent used throughout this page ────────────────────────────────────────
const ACCENT = '#39ff9a'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  articles: NewsArticle[]
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function NewsPageClient({ articles }: Props) {
  const [activeTab, setActiveTab] = useState<SportTag>('ALL')

  const filtered = useMemo(
    () => activeTab === 'ALL' ? articles : articles.filter(a => a.sport === activeTab),
    [articles, activeTab],
  )

  const hero    = filtered[0] ?? null
  const feed    = filtered.slice(1)
  const trending = articles.slice(0, 5)

  return (
    <div style={{ paddingLeft: 64, minHeight: '100vh', background: '#05060a' }}>

      {/* ── League filter bar ──────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 30,
        background: 'rgba(8,8,13,0.97)',
        borderBottom: '1px solid #1a1a24',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 4, height: 48,
        }}>
          {SPORT_TAGS.map(tag => {
            const active = tag === activeTab
            return (
              <button
                key={tag}
                onClick={() => setActiveTab(tag)}
                style={{
                  background:    active ? ACCENT : 'transparent',
                  color:         active ? '#000'  : '#71717a',
                  border:        active ? 'none'  : '1px solid transparent',
                  borderRadius:  6,
                  padding:       '5px 14px',
                  fontSize:      11,
                  fontWeight:    700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor:        'pointer',
                  fontFamily:    'var(--font-geist-mono), monospace',
                  transition:    'all 0.15s',
                  boxShadow:     active ? `0 0 12px ${ACCENT}55` : 'none',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#d4d4d8' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#71717a' }}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
        <p style={{
          fontSize: 10, color: '#52525b', letterSpacing: '0.3em',
          textTransform: 'uppercase', margin: '0 0 6px',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}>
          Daily feed
        </p>
        <h1 style={{
          fontSize: 28, fontWeight: 900, color: '#f4f4f5',
          letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
        }}>
          News &amp; Analysis
        </h1>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 64px' }}>
        {filtered.length === 0 ? (
          <EmptyState sport={activeTab} />
        ) : (
          <>
            {/* Hero */}
            {hero && <HeroCard article={hero} />}

            {/* Two-column layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) 300px',
              gap: 32,
              marginTop: 32,
            }}>
              {/* Article feed */}
              <div>
                {feed.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#52525b', padding: '12px 0' }}>
                    Only one article found for this league right now.
                  </p>
                ) : (
                  feed.map(article => (
                    <ArticleRow key={article.id} article={article} />
                  ))
                )}
              </div>

              {/* Sidebar */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <StoryCountWidget articles={articles} />
                <TrendingWidget trending={trending} />
              </aside>
            </div>
          </>
        )}
      </div>
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
          position:     'relative',
          borderRadius: 14,
          overflow:     'hidden',
          background:   '#0f0f14',
          border:       `1px solid #1a1a24`,
          minHeight:    380,
          cursor:       'pointer',
          transition:   'border-color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = `${ACCENT}44`}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#1a1a24'}
      >
        {/* Background image */}
        {article.image_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image_url}
              alt=""
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

        {/* Content overlay */}
        <div style={{
          position:      'relative', zIndex: 1,
          padding:       '32px 32px 28px',
          display:       'flex',
          flexDirection: 'column',
          minHeight:     380,
        }}>
          {/* HERO tag */}
          <div style={{ marginBottom: 'auto' }}>
            <span style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color:         ACCENT,
              fontFamily:    'var(--font-geist-mono), monospace',
              background:    `${ACCENT}15`,
              border:        `1px solid ${ACCENT}33`,
              padding:       '3px 10px',
              borderRadius:  4,
            }}>
              Top Story
            </span>
          </div>

          {/* Bottom content */}
          <div style={{ marginTop: 'auto' }}>
            {sc && (
              <span style={{
                display:       'inline-block',
                background:    sc.bg,
                color:         sc.text,
                border:        `1px solid ${sc.border}`,
                fontSize:      10,
                fontWeight:    700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                padding:       '3px 10px',
                borderRadius:  4,
                marginBottom:  14,
                fontFamily:    'var(--font-geist-mono), monospace',
              }}>
                {article.sport}
              </span>
            )}

            <h2 style={{
              fontSize:   clamp(22, 28),
              fontWeight: 800,
              color:      '#f4f4f5',
              margin:     '0 0 12px',
              lineHeight: 1.25,
              maxWidth:   780,
            }}>
              {article.headline}
            </h2>

            {article.summary && (
              <p style={{
                fontSize:            15,
                color:               '#a1a1aa',
                margin:              '0 0 16px',
                lineHeight:          1.55,
                maxWidth:            680,
                display:             '-webkit-box',
                WebkitLineClamp:     2,
                WebkitBoxOrient:     'vertical' as const,
                overflow:            'hidden',
              }}>
                {article.summary}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#71717a' }}>
              {article.source && (
                <span style={{ color: ACCENT, fontWeight: 600 }}>{article.source}</span>
              )}
              {article.source && article.published_at && <span>·</span>}
              {article.published_at && <span>{timeAgo(article.published_at)}</span>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Article row (feed) ───────────────────────────────────────────────────────
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
          display:      'flex',
          gap:          16,
          alignItems:   'flex-start',
          padding:      '16px 4px',
          borderBottom: '1px solid #1a1a24',
          transition:   'background 0.12s',
          cursor:       'pointer',
          borderRadius: 4,
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#0f0f14'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
      >
        {/* Sport badge */}
        <div style={{ paddingTop: 2, flexShrink: 0, width: 52 }}>
          {sc ? (
            <span style={{
              display:       'inline-block',
              background:    sc.bg,
              color:         sc.text,
              border:        `1px solid ${sc.border}`,
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              padding:       '2px 8px',
              borderRadius:  3,
              fontFamily:    'var(--font-geist-mono), monospace',
              whiteSpace:    'nowrap',
            }}>
              {article.sport}
            </span>
          ) : null}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize:        15,
            fontWeight:      600,
            color:           '#e4e4e7',
            margin:          '0 0 5px',
            lineHeight:      1.35,
            display:         '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow:        'hidden',
          }}>
            {article.headline}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#52525b' }}>
            {article.source && <span style={{ color: '#71717a' }}>{article.source}</span>}
            {article.source && article.published_at && <span>·</span>}
            {article.published_at && <span>{timeAgo(article.published_at)}</span>}
          </div>
        </div>

        {/* Thumbnail */}
        {article.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt=""
            style={{
              width:      88,
              height:     64,
              objectFit:  'cover',
              borderRadius: 6,
              flexShrink: 0,
              background: '#1a1a24',
            }}
          />
        )}
      </div>
    </Link>
  )
}

// ─── Sidebar: story count ─────────────────────────────────────────────────────
function StoryCountWidget({ articles }: { articles: NewsArticle[] }) {
  const todayCount = articles.filter(a => {
    if (!a.published_at) return false
    const d = new Date(a.published_at)
    const n = new Date()
    return d.getUTCFullYear() === n.getUTCFullYear()
      && d.getUTCMonth()    === n.getUTCMonth()
      && d.getUTCDate()     === n.getUTCDate()
  }).length

  const count = todayCount > 0 ? todayCount : articles.length

  return (
    <div style={{
      background:   '#0a0a0f',
      border:       '1px solid #1a1a24',
      borderRadius: 10,
      padding:      '18px 20px',
    }}>
      <p style={{
        fontSize:      10,
        color:         '#52525b',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        margin:        '0 0 10px',
        fontFamily:    'var(--font-geist-mono), monospace',
      }}>
        {todayCount > 0 ? "Today's Stories" : 'Stories in Feed'}
      </p>
      <p style={{
        fontSize:   38,
        fontWeight: 900,
        color:      ACCENT,
        margin:     0,
        lineHeight: 1,
        textShadow: `0 0 20px ${ACCENT}55`,
      }}>
        {count}
      </p>
      <p style={{ fontSize: 11, color: '#52525b', margin: '6px 0 0' }}>
        articles across all leagues
      </p>
    </div>
  )
}

// ─── Sidebar: trending ────────────────────────────────────────────────────────
function TrendingWidget({ trending }: { trending: NewsArticle[] }) {
  if (trending.length === 0) return null

  return (
    <div style={{
      background:   '#0a0a0f',
      border:       '1px solid #1a1a24',
      borderRadius: 10,
      padding:      '18px 20px',
    }}>
      <p style={{
        fontSize:      10,
        color:         '#52525b',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        margin:        '0 0 16px',
        fontFamily:    'var(--font-geist-mono), monospace',
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
              {/* Rank number */}
              <span style={{
                fontSize:   22,
                fontWeight: 900,
                color:      '#1f1f2a',
                lineHeight: 1.1,
                minWidth:   22,
                flexShrink: 0,
                fontFamily: 'var(--font-geist-mono), monospace',
              }}>
                {i + 1}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                {sc && (
                  <span style={{
                    display:       'inline-block',
                    background:    sc.bg,
                    color:         sc.text,
                    border:        `1px solid ${sc.border}`,
                    fontSize:      8,
                    fontWeight:    700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    padding:       '2px 6px',
                    borderRadius:  3,
                    marginBottom:  5,
                    fontFamily:    'var(--font-geist-mono), monospace',
                  }}>
                    {article.sport}
                  </span>
                )}
                <p
                  style={{
                    fontSize:        13,
                    fontWeight:      600,
                    color:           '#d4d4d8',
                    margin:          0,
                    lineHeight:      1.3,
                    display:         '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow:        'hidden',
                    transition:      'color 0.12s',
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
function EmptyState({ sport }: { sport: SportTag }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      justifyContent:'center',
      padding:       '80px 24px',
      textAlign:     'center',
    }}>
      <div style={{
        fontSize:      32,
        fontWeight:    900,
        color:         '#1a1a24',
        letterSpacing: '0.1em',
        marginBottom:  16,
      }}>
        {sport}
      </div>
      <p style={{ fontSize: 14, color: '#52525b', margin: 0 }}>
        No articles yet. Check back after the next daily refresh at 6am UTC.
      </p>
    </div>
  )
}

// ─── Tiny helper — responsive font size via clamp string ─────────────────────
function clamp(min: number, max: number): string {
  return `clamp(${min}px, 3vw, ${max}px)`
}
