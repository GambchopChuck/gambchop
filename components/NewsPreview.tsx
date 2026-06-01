import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SPORT_COLORS, timeAgo } from '@/lib/news'

const ACCENT = '#39ff9a'

const ARTICLE_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  streak:   { bg: '#0a1a0f', color: '#4ade80', border: '#4ade8033', label: 'STREAK'   },
  record:   { bg: '#0a0f1a', color: '#60a5fa', border: '#60a5fa33', label: 'RECORD'   },
  reversal: { bg: '#1a1000', color: '#fbbf24', border: '#fbbf2433', label: 'REVERSAL' },
  leader:   { bg: '#150a1a', color: '#a855f7', border: '#a855f733', label: 'LEADER'   },
}

export default async function NewsPreview() {
  const [newsResult, streakResult] = await Promise.all([
    supabaseAdmin
      .from('news_articles')
      .select('id, headline, source, sport, published_at, article_url')
      .order('published_at', { ascending: false })
      .limit(4),
    supabaseAdmin
      .from('streak_articles')
      .select('id, team_name, article_type, chart_svg, headline, generated_at')
      .order('generated_at', { ascending: false })
      .limit(4),
  ])

  const newsArticles   = newsResult.data   ?? []
  const streakArticles = streakResult.data ?? []

  return (
    <section style={{ maxWidth: 1400, margin: '0 auto', padding: '72px 24px' }}>
      <style>{`
        .news-preview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        @media (max-width: 768px) {
          .news-preview-grid { grid-template-columns: 1fr; }
        }
        .news-preview-see-more {
          display: block;
          text-align: center;
          margin-top: 16px;
          font-size: 10px;
          color: #52525b;
          font-family: var(--font-geist-mono), monospace;
          text-decoration: none;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 10px 0 2px;
          border-top: 1px solid #1a1a24;
          transition: color 0.15s;
        }
        .news-preview-see-more:hover { color: #39ff9a; }
        .news-preview-row-link { text-decoration: none; display: block; }
        .news-preview-row { transition: background 0.12s; border-radius: 4px; }
        .news-preview-row:hover { background: #0f0f14; }
      `}</style>

      {/* ── Section header ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`,
          }} />
          <h2 style={{
            fontSize: 12, fontWeight: 700, color: ACCENT,
            letterSpacing: '0.28em', textTransform: 'uppercase', margin: 0,
            fontFamily: 'var(--font-geist-mono), monospace',
          }}>
            Gambchop News
          </h2>
        </div>
        <Link href="/news" style={{
          fontSize: 10, color: '#52525b',
          fontFamily: 'var(--font-geist-mono), monospace',
          textDecoration: 'none', letterSpacing: '0.14em',
          textTransform: 'uppercase', transition: 'color 0.15s',
        }}>
          View All News →
        </Link>
      </div>

      {/* ── Two columns ─────────────────────────────────────────────────────── */}
      <div className="news-preview-grid">

        {/* ── Sports News ──────────────────────────────────────────────────── */}
        <div className="fp-card" style={{ padding: '20px 20px 4px' }}>
          <p style={{
            fontSize: 9, color: '#52525b', letterSpacing: '0.22em',
            textTransform: 'uppercase', margin: '0 0 14px',
            fontFamily: 'var(--font-geist-mono), monospace', fontWeight: 700,
          }}>
            Sports News
          </p>

          {newsArticles.length === 0 ? (
            <p style={{ fontSize: 12, color: '#3f3f46', margin: '0 0 16px' }}>
              No articles yet.
            </p>
          ) : (
            newsArticles.map((a: any, i: number) => {
              const sc = a.sport ? SPORT_COLORS[a.sport] : null
              return (
                <Link
                  key={a.id}
                  href={a.article_url ?? '/news?tab=sports'}
                  target={a.article_url ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="news-preview-row-link"
                >
                  <div
                    className="news-preview-row"
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '11px 6px',
                      borderBottom: i < newsArticles.length - 1 ? '1px solid #1a1a24' : 'none',
                    }}
                  >
                    {/* Sport badge */}
                    <div style={{ flexShrink: 0, paddingTop: 2, width: 40 }}>
                      {sc && (
                        <span style={{
                          display: 'inline-block',
                          background: sc.bg, color: sc.text,
                          border: `1px solid ${sc.border}`,
                          fontSize: 8, fontWeight: 700,
                          letterSpacing: '0.13em', textTransform: 'uppercase',
                          padding: '2px 5px', borderRadius: 3,
                          fontFamily: 'var(--font-geist-mono), monospace',
                          whiteSpace: 'nowrap',
                        }}>
                          {a.sport}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 600, color: '#e4e4e7',
                        margin: '0 0 4px', lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}>
                        {a.headline}
                      </p>
                      <div style={{
                        display: 'flex', gap: 4,
                        fontSize: 10, color: '#52525b',
                      }}>
                        {a.source && (
                          <span style={{ color: '#71717a' }}>{a.source}</span>
                        )}
                        {a.source && a.published_at && <span>·</span>}
                        {a.published_at && <span>{timeAgo(a.published_at)}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })
          )}

          <Link href="/news?tab=sports" className="news-preview-see-more">
            See More →
          </Link>
        </div>

        {/* ── Chart News ───────────────────────────────────────────────────── */}
        <div className="fp-card" style={{ padding: '20px 20px 4px' }}>
          <p style={{
            fontSize: 9, color: '#52525b', letterSpacing: '0.22em',
            textTransform: 'uppercase', margin: '0 0 14px',
            fontFamily: 'var(--font-geist-mono), monospace', fontWeight: 700,
          }}>
            Chart News
          </p>

          {streakArticles.length === 0 ? (
            <p style={{ fontSize: 12, color: '#3f3f46', margin: '0 0 16px' }}>
              No articles yet.
            </p>
          ) : (
            streakArticles.map((a: any, i: number) => {
              const badge = ARTICLE_BADGE[a.article_type ?? 'streak'] ?? ARTICLE_BADGE.streak
              return (
                <div
                  key={a.id}
                  className="news-preview-row"
                  style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '11px 6px',
                    borderBottom: i < streakArticles.length - 1 ? '1px solid #1a1a24' : 'none',
                  }}
                >
                  {/* Type badge */}
                  <div style={{ flexShrink: 0, paddingTop: 2, width: 56 }}>
                    <span style={{
                      display: 'inline-block',
                      background: badge.bg, color: badge.color,
                      border: `1px solid ${badge.border}`,
                      fontSize: 7, fontWeight: 700,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '2px 5px', borderRadius: 3,
                      fontFamily: 'var(--font-geist-mono), monospace',
                      whiteSpace: 'nowrap',
                    }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: '#e4e4e7',
                      margin: '0 0 6px', lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                    }}>
                      {a.headline}
                    </p>

                    {/* SVG chart strip */}
                    {a.chart_svg && (
                      <div
                        style={{ marginBottom: 6 }}
                        dangerouslySetInnerHTML={{ __html: a.chart_svg }}
                      />
                    )}

                    <div style={{ display: 'flex', gap: 4, fontSize: 10, color: '#52525b' }}>
                      <span style={{ color: badge.color, fontWeight: 600 }}>
                        {a.team_name}
                      </span>
                      {a.generated_at && (
                        <><span>·</span><span>{timeAgo(a.generated_at)}</span></>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}

          <Link href="/news?tab=chart" className="news-preview-see-more">
            See More →
          </Link>
        </div>

      </div>
    </section>
  )
}
