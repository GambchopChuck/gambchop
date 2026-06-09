import Image from 'next/image'
import LeagueGrid from '@/components/LeagueGrid'
import CommunityPreview from '@/components/CommunityPreview'
import ActivationBanner from '@/components/ActivationBanner'
import FeaturedPagesWithAuth from '@/components/landing/FeaturedPagesWithAuth'
import ChopperBanner from '@/components/ChopperBanner'
import NewsPreview from '@/components/NewsPreview'
import ProTrialBanner from '@/components/ProTrialBanner'
import TopMatchupTicker from '@/components/TopMatchupTicker'
import OurMission from '@/components/OurMission'
import HomepagePricingSection from '@/components/HomepagePricingSection'
import SportsNewsPreview from '@/components/SportsNewsPreview'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isEnglishArticle } from '@/lib/news'
import { rowToTopMatchup } from '@/lib/topMatchups'
import type { TopMatchupData } from '@/lib/topMatchups'
import { X, ShoppingBag } from 'lucide-react'

export const revalidate = 3600   // re-render at most once per hour

export default async function HomePage() {
  // Fetch today's MLB top matchup from the cron-populated table
  let mlbTopMatchup: TopMatchupData | null = null
  try {
    const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    const { data } = await supabaseAdmin
      .from('top_matchups')
      .select('*')
      .eq('league', 'mlb')
      .eq('game_date', todayET)
      .maybeSingle()
    mlbTopMatchup = data ? rowToTopMatchup(data) : null
  } catch {
    // Degrade gracefully if top_matchups table doesn't exist yet
  }

  // Fetch 3 most recent sports news articles for Sports News preview
  let sportsArticles: {
    id: string; headline: string; source: string | null
    sport: string | null; published_at: string | null
    article_url: string | null; image_url: string | null
  }[] = []
  try {
    const { data } = await supabaseAdmin
      .from('news_articles')
      .select('id, headline, source, sport, published_at, article_url, image_url')
      .order('published_at', { ascending: false })
      .limit(20)
    sportsArticles = (data ?? []).filter(a => isEnglishArticle(a.headline)).slice(0, 3)
  } catch {
    // Degrade gracefully
  }
  return (
    <div style={{ minHeight: '100vh' }}>
      <ActivationBanner />

      <style>{`
        .hero-grid { display: flex; align-items: center; gap: 48px; }
        .hero-headline {
          font-size: 56px; font-weight: 900; color: #f4f4f5;
          letter-spacing: 0.02em; text-transform: uppercase;
          line-height: 1.05; margin: 0;
          font-family: var(--font-geist-sans), sans-serif;
        }
        @media (max-width: 1100px) {
          .hero-headline { font-size: 44px; }
        }
        @media (max-width: 900px) {
          .hero-headline { font-size: 36px; }
        }
        @media (max-width: 600px) {
          .hero-headline { font-size: 28px; }
        }
        @keyframes neon-breathe {
          from { box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 100%, white 40%), 0 0 22px -2px var(--accent), 0 0 42px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.45); }
          to   { box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 100%, white 40%), 0 0 22px -2px var(--accent), 0 0 60px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.45); }
        }
        .league-card {
          background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 100%, white 18%), color-mix(in srgb, var(--accent) 100%, black 22%));
          border: 1px solid color-mix(in srgb, var(--accent) 100%, white 35%);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 100%, white 40%), 0 0 22px -2px var(--accent), 0 0 60px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.45);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          animation: neon-breathe 4.5s ease-in-out infinite alternate;
        }
        .league-card:hover {
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 100%, white 40%), 0 0 31px -2px var(--accent), 0 0 84px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.45);
          transform: translateY(-3px);
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .league-card { animation: none !important; }
        }
        .hiw-section { padding: 100px 24px; }
        .hiw-heading { font-size: clamp(32px, 5vw, 60px); font-weight: 700; margin: 0 0 28px; line-height: 1.06; color: #ffffff; letter-spacing: 0.01em; }
        .hiw-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 56px; }
        @media (max-width: 768px) {
          .hiw-section { padding: 64px 20px; }
          .hiw-cards { grid-template-columns: 1fr; gap: 20px; margin-top: 40px; }
        }
      `}</style>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>

        {/* Background image — fills hero section, clipped by overflow:hidden */}
        <Image
          src="/images/hero-bg.png"
          alt=""
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />

        {/* Dark gradient overlay — left darker for text legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(2,10,4,0.78) 0%, rgba(5,5,12,0.60) 50%, rgba(4,2,12,0.30) 100%)',
        }} />

        {/* Hero content — sits above image and overlay */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '60px 24px' }}>
        <div className="hero-grid">

          {/* Left: kicker + headline */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 11, color: '#22c55e', letterSpacing: '0.25em',
              textTransform: 'uppercase', fontWeight: 700,
              fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
              margin: '0 0 24px',
            }}>
              Your sports data assistant.
            </p>
            <h1 className="hero-headline">
              A broader view of sports results and outcomes.
            </h1>
          </div>

        </div>{/* /hero-grid */}
        </div>{/* /hero content */}
      </div>{/* /hero outer */}

      {/* ── Social divider bar ────────────────────────────────────────────── */}
      <div style={{
        width: '100%',
        height: 60,
        background: '#08080d',
        borderTop: '1px solid #22c55e',
        borderBottom: '1px solid #22c55e',
        boxShadow: '0 -8px 32px rgba(34,197,94,0.25), 0 8px 32px rgba(34,197,94,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>

          {/* X (Twitter) */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <X size={22} />
          </a>

          {/* Instagram */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>

          {/* TikTok */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.84 1.56V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
            </svg>
          </a>

          {/* YouTube */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19.1C5.12 19.56 12 19.56 12 19.56s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none"/>
            </svg>
          </a>

          {/* Merchandise */}
          <a href="/merchandise" aria-label="Merchandise"
            className="flex text-zinc-500 hover:text-green-500 hover:scale-110 transition-all duration-200"
          >
            <ShoppingBag size={22} />
          </a>

        </div>
      </div>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section
        className="hiw-section"
        style={{
          position: 'relative',
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.38), rgba(0,0,0,0.38)), url(/images/stp-bg-v2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>

          {/* Eyebrow */}
          <p style={{
            fontSize: 14, fontWeight: 500, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
            margin: '0 0 20px',
          }}>
            How It Works
          </p>

          {/* Heading */}
          <h2 className="hiw-heading">
            Spot the patterns. Build smarter tickets.
          </h2>

          {/* Intro */}
          <p style={{
            fontSize: 18, fontWeight: 400, color: '#ffffff',
            lineHeight: 1.55, maxWidth: 720, margin: 0,
          }}>
            Gambchop turns months of game results into a single color-coded view
            so streaks, slumps, and trends jump off the page. Pair that visual
            context with your personal favorites list and build off the broader
            picture of history&#8212;not a hunch.
          </p>

          {/* Feature cards */}
          <div className="hiw-cards">
            {([
              {
                n: '01',
                heading: 'Analyze the Charts',
                body: 'Use Gambchop\'s color-coded historic charts to fast-track what\'s hot and what\'s not. Every game becomes a colored cell — read the streaks, slumps, and patterns at a glance, or hand it off to Chopper, your Gambchop AI assistant, for a deeper breakdown. Built for high-volume bettors who move fast.',
              },
              {
                n: '02',
                heading: 'Do Your Research',
                body: 'Dig into the Stats, Leaderboard, and Streaks on Streaks to see who\'s running hot across every market. The Trends and Props pages give you a different angle — perfect if you\'re building something unique. Need a head-to-head? Use Compare to size up any two teams and let Chopper walk you through the matchup.',
              },
              {
                n: '03',
                heading: 'Build the Chop',
                body: 'Curate your 32 best betting rows across four personal cards — then cut it down to your sharpest 16. That\'s The CHOP. Your most trusted team and market combinations, displayed side by side in one clean color-coded chart. No noise. Just your best reads, ready to go.',
              },
            ] as const).map(({ n, heading, body }) => (
              <div key={n} className="league-card" style={{
                '--accent': '#22c55e',
                borderRadius: 12,
                padding: '28px 28px 32px',
              } as React.CSSProperties}>
                <div style={{
                  fontSize: 14, fontWeight: 500, color: '#22c55e',
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  marginBottom: 18,
                }}>
                  {n}
                </div>
                <h3 style={{
                  fontSize: 26, fontWeight: 600, color: '#ffffff',
                  margin: '0 0 14px', letterSpacing: '0.01em', lineHeight: 1.2,
                }}>
                  {heading}
                </h3>
                <p style={{
                  fontSize: 16, fontWeight: 400, color: '#ffffff',
                  lineHeight: 1.5, margin: 0,
                }}>
                  {body}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Creator Marketplace ───────────────────────────────────────────── */}
      <section
        className="hiw-section"
        style={{ background: '#08080d' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>

          {/* Eyebrow */}
          <p style={{
            fontSize: 14, fontWeight: 500, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
            margin: '0 0 20px',
          }}>
            Creator Marketplace
          </p>

          {/* Heading */}
          <h2 className="hiw-heading">
            Turn your research into income.
          </h2>

          {/* Feature cards */}
          <div className="hiw-cards">
            {([
              {
                n: '01',
                heading: 'Build your charts',
                body: 'Pick a row or set your own threshold, and Gambchop generates a custom color-coded chart straight from real historical data.',
              },
              {
                n: '02',
                heading: 'Win % on display',
                body: "Your chart's monthly hit rate is calculated automatically and shown publicly — other members can see exactly how often your chart has been hitting and purchase it if they feel confident the charts will continue at a high win rate.",
              },
              {
                n: '03',
                heading: 'Set your price. Get paid.',
                body: 'Price your chart. Every time a member unlocks it, you earn. The sharper your charts, the more your charts sell.',
              },
            ] as const).map(({ n, heading, body }) => (
              <div key={n} className="league-card" style={{
                '--accent': '#22c55e',
                borderRadius: 12,
                padding: '28px 28px 32px',
              } as React.CSSProperties}>
                <div style={{
                  fontSize: 14, fontWeight: 500, color: '#22c55e',
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  marginBottom: 18,
                }}>
                  {n}
                </div>
                <h3 style={{
                  fontSize: 26, fontWeight: 600, color: '#ffffff',
                  margin: '0 0 14px', letterSpacing: '0.01em', lineHeight: 1.2,
                }}>
                  {heading}
                </h3>
                <p style={{
                  fontSize: 16, fontWeight: 400, color: '#ffffff',
                  lineHeight: 1.5, margin: 0,
                }}>
                  {body}
                </p>
              </div>
            ))}
          </div>

          {/* Coming Soon badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
            <span style={{
              display: 'inline-block',
              padding: '8px 24px',
              borderRadius: 9999,
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.45)',
              color: '#f59e0b',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
            }}>
              Coming Soon
            </span>
          </div>

        </div>
      </section>

      {/* ── Creator Marketplace — Proof Block ──────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#0d0d16' }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap',
        }}>

          {/* Left — mock chart card */}
          <div style={{ flex: '1 1 340px' }}>
            <div style={{
              background: '#111118', border: '1px solid #1f1f2e',
              borderRadius: 16, padding: '24px', maxWidth: 400,
            }}>
              {/* Creator row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8,
                  borderRadius: '50%', background: '#22c55e', flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa' }}>
                  @sharplines_k
                </span>
              </div>

              {/* Chart name */}
              <div style={{ fontSize: 17, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>
                Yankees OVER 8.5 Runs
              </div>

              {/* Chart grid — blurred to simulate locked preview */}
              <div style={{ filter: 'blur(3px)', opacity: 0.5, marginBottom: 16 }}>
                {([
                  { label: 'Moneyline',  cells: ['#22c55e','#22c55e','#22c55e','#ef4444','#22c55e','#22c55e','#ef4444','#22c55e','#22c55e','#ef4444'] },
                  { label: 'Spread',     cells: ['#22c55e','#22c55e','#ef4444','#22c55e','#ef4444','#22c55e','#22c55e','#ef4444','#22c55e','#ef4444'] },
                  { label: 'Over/Under', cells: ['#a855f7','#a855f7','#a855f7','#67e8f9','#a855f7','#a855f7','#a855f7','#a855f7','#67e8f9','#67e8f9'] },
                  { label: 'Home',       cells: ['#22c55e','#22c55e','#22c55e','#22c55e','#ef4444','#22c55e','#22c55e','#22c55e','#22c55e','#ef4444'] },
                ] as const).map(({ label, cells }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 9, color: '#71717a', letterSpacing: '0.08em',
                      textTransform: 'uppercase', width: 76, flexShrink: 0,
                    }}>
                      {label}
                    </span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {(cells as readonly string[]).map((color, i) => (
                        <div key={i} style={{ width: 18, height: 18, borderRadius: 3, background: color, flexShrink: 0 }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em' }}>
                  68% MONTHLY HIT RATE
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 9999,
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
                  color: '#f59e0b', fontSize: 11, fontWeight: 700,
                }}>
                  🔥 HOT
                </span>
              </div>

              {/* Price */}
              <div style={{ fontSize: 13, color: '#a1a1aa', fontWeight: 400 }}>
                $2.99 to unlock
              </div>
            </div>
          </div>

          {/* Right — bullets */}
          <div style={{ flex: '1 1 340px' }}>
            <h3 style={{
              fontSize: 28, fontWeight: 700, color: '#ffffff',
              margin: '0 0 28px', lineHeight: 1.2, letterSpacing: '0.01em',
            }}>
              Real charts, real data, no false influencers slinging picks.
            </h3>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {([
                'Publish your chart to thousands of members in the discovery feed',
                'Your win % is calculated from real data — no fluff, no claims',
                'Earn real money when your research holds up',
              ] as const).map((text, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 16, flexShrink: 0, lineHeight: '1.5' }}>✓</span>
                  <span style={{ fontSize: 16, color: '#d4d4d8', lineHeight: 1.5 }}>{text}</span>
                </li>
              ))}
            </ul>

            {/* Coming Soon badge */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{
                display: 'inline-block', padding: '8px 24px', borderRadius: 9999,
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.45)',
                color: '#f59e0b', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
              }}>
                Coming Soon
              </span>
            </div>
          </div>

        </div>
      </section>

      <ChopperBanner />

      {/* ── Leagues section — video bg wraps header + cards ─────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>

        {/* Background video */}
        <video
          autoPlay muted loop playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        >
          <source src="/images/Leagues_herobg.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1 }} />

        {/* All content above video + overlay */}
        <div style={{ position: 'relative', zIndex: 2 }}>

          {/* Header + description */}
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 24px 0', fontFamily: 'var(--font-oswald), "Oswald", sans-serif' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px' }}>
              Leagues
            </h2>
            <p style={{ fontSize: 15, fontWeight: 400, color: '#ffffff', lineHeight: 1.7, margin: 0, maxWidth: 860 }}>
              Explore Gambchop&apos;s league cards for MLB, NBA, NFL, NHL, WNBA, college football, men&apos;s and women&apos;s college basketball, college baseball, ATP, WTA, and all-league streak tracking. Each hub is built to help members quickly review moneyline, spread, totals, team trends, player trends, and active streaks through Gambchop&apos;s visual chart system.
            </p>
            <p style={{ fontSize: 15, fontWeight: 400, color: '#ffffff', lineHeight: 1.7, margin: '14px 0 0', maxWidth: 860 }}>
              No hunting through messy stat pages. No switching between ten tabs like a sleep-deprived trader. Just pick a league and start skimming.
            </p>
          </div>

          {/* League cards — 2rem gap below description */}
          <div style={{ marginTop: '2rem' }}>
            <LeagueGrid showSectionHeader={false} showBackground={false} />
          </div>

        </div>
      </section>

      {/* ── Top Matchup Ticker — sits directly above Also Featured ──────────── */}
      <TopMatchupTicker matchups={mlbTopMatchup ? [mlbTopMatchup] : []} />

      <FeaturedPagesWithAuth />
      <ProTrialBanner />
      <NewsPreview />
      <SportsNewsPreview articles={sportsArticles} />

      <CommunityPreview />
      <OurMission />
      <HomepagePricingSection />

      <footer style={{ borderTop: '1px solid #1a1a24', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#f4f4f5', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-oswald), "Oswald", sans-serif' }}>
          Gambchop · For entertainment purposes only · Not affiliated with any sports league
        </p>
      </footer>
    </div>
  )
}
