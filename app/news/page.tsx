export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase-admin'
import NewsPageClient from '@/components/news/NewsPageClient'
import type { NewsArticle, StreakArticle } from '@/lib/news'

export const metadata = {
  title: 'News & Analysis | Gambchop',
  description: 'Daily sports news and betting analysis — MLB, NBA, NFL, NHL, WNBA, ATP',
}

export default async function NewsPage() {
  let articles:       NewsArticle[]   = []
  let streakArticles: StreakArticle[] = []

  try {
    const [newsResult, streakResult] = await Promise.all([
      supabaseAdmin
        .from('news_articles')
        .select('id, external_id, headline, summary, image_url, source, article_url, sport, published_at, fetched_at')
        .order('published_at', { ascending: false })
        .limit(120),
      supabaseAdmin
        .from('streak_articles')
        .select('id, team_name, league, bet_type, streak_length, streak_direction, headline, body, outcome_cells, generated_at')
        .order('generated_at', { ascending: false })
        .limit(50),
    ])

    if (newsResult.error)   console.error('[news page] news_articles error:',   newsResult.error.message)
    else                    articles       = (newsResult.data   ?? []) as NewsArticle[]

    if (streakResult.error) console.error('[news page] streak_articles error:', streakResult.error.message)
    else                    streakArticles = (streakResult.data ?? []) as StreakArticle[]

  } catch (err) {
    console.error('[news page] unexpected error:', err)
  }

  return <NewsPageClient articles={articles} streakArticles={streakArticles} />
}
