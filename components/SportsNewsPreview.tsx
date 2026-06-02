import Link from 'next/link'
import { SPORT_COLORS, timeAgo } from '@/lib/news'

const ACCENT = '#39ff9a'

type Article = {
  id:           string
  headline:     string
  source:       string | null
  sport:        string | null
  published_at: string | null
  article_url:  string | null
  image_url:    string | null
}

function SportBadge({ sport }: { sport: string | null }) {
  if (!sport) return null
  const sc = SPORT_COLORS[sport]
  if (!sc) return null
  return (
    <span style={{
      display: 'inline-block',
      background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
      fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
      padding: '2px 7px',
      fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
      flexShrink: 0,
    }}>
      {sport}
    </span>
  )
}

export default function SportsNewsPreview({ articles }: { articles: Article[] }) {
  const [hero, ...rest] = articles
  const cards = rest.slice(0, 2)

  return (
    <section style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 24px 0' }}>
      <style>{`
        .snp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        @media (max-width: 640px) {
          .snp-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Section header ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`,
          }} />
          <h2 style={{
            fontSize: 12, fontWeight: 700, color: ACCENT,
            letterSpacing: '0.28em', textTransform: 'uppercase', margin: 0,
            fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
          }}>
            Sports News
          </h2>
        </div>
        <Link href="/news?tab=sports" style={{
          fontSize: 10, color: '#ffffff',
          fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
          textDecoration: 'none', letterSpacing: '0.14em',
          textTransform: 'uppercase', transition: 'color 0.15s',
        }}>
          View All Sports News →
        </Link>
      </div>

      {/* ── Hero card ───────────────────────────────────────────────────────── */}
      {hero && (
        <Link
          href={hero.article_url ?? '/news?tab=sports'}
          target={hero.article_url ? '_blank' : undefined}
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: '#0f0f14', border: '1px solid #1a1a24',
            height: 160, cursor: 'pointer',
          }}>
            {/* Background image */}
            {hero.image_url && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image_url} alt=""
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center top',
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(2,4,2,0.95) 0%, rgba(5,6,10,0.65) 55%, rgba(5,6,10,0.20) 100%)',
                }} />
              </>
            )}

            {/* Content */}
            <div style={{
              position: 'relative', zIndex: 1,
              padding: '14px 20px 16px',
              height: '100%', boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            }}>
              <SportBadge sport={hero.sport} />
              <p style={{
                fontSize: 14, fontWeight: 700, color: '#f4f4f5',
                margin: '8px 0 6px', lineHeight: 1.3,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
                letterSpacing: '0.02em',
              }}>
                {hero.headline}
              </p>
              <div style={{ display: 'flex', gap: 6, fontSize: 9, color: '#ffffff', letterSpacing: '0.06em' }}>
                {hero.source && <span>{hero.source}</span>}
                {hero.source && hero.published_at && <span>·</span>}
                {hero.published_at && <span>{timeAgo(hero.published_at)}</span>}
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ── Two compact article cards ──────────────────────────────────────── */}
      {cards.length > 0 && (
        <div className="snp-grid">
          {cards.map(a => (
            <Link
              key={a.id}
              href={a.article_url ?? '/news?tab=sports'}
              target={a.article_url ? '_blank' : undefined}
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                background: '#0f0f14', border: '1px solid #1a1a24',
                padding: '14px 16px', height: '100%', boxSizing: 'border-box',
              }}>
                <div style={{ marginBottom: 8 }}>
                  <SportBadge sport={a.sport} />
                </div>
                <p style={{
                  fontSize: 12, fontWeight: 600, color: '#f4f4f5',
                  margin: '0 0 8px', lineHeight: 1.35,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                  fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
                  letterSpacing: '0.02em',
                }}>
                  {a.headline}
                </p>
                <div style={{ display: 'flex', gap: 5, fontSize: 9, color: '#ffffff', letterSpacing: '0.06em' }}>
                  {a.source && <span>{a.source}</span>}
                  {a.source && a.published_at && <span>·</span>}
                  {a.published_at && <span>{timeAgo(a.published_at)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── More button ─────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/news?tab=sports" style={{
          display: 'inline-block', textDecoration: 'none',
          fontSize: 10, color: '#ffffff',
          border: '1px solid #1a1a24',
          padding: '10px 28px', letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 600,
          fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
          transition: 'border-color 0.15s',
        }}>
          More Sports News →
        </Link>
      </div>
    </section>
  )
}
