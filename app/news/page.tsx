// Revalidate every hour so the page picks up newly fetched articles
// without a full deploy. The cron runs at 6am UTC daily.
export const revalidate = 3600

import { supabaseAdmin } from '@/lib/supabase-admin'
import NewsPageClient from '@/components/news/NewsPageClient'
import type { NewsArticle } from '@/lib/news'

export const metadata = {
  title: 'News & Analysis | Gambchop',
  description: 'Daily sports news and betting analysis — MLB, NBA, NFL, NHL, WNBA, ATP',
}

export default async function NewsPage() {
  let articles: NewsArticle[] = []

  try {
    const { data, error } = await supabaseAdmin
      .from('news_articles')
      .select('id, external_id, headline, summary, image_url, source, article_url, sport, published_at, fetched_at')
      .order('published_at', { ascending: false })
      .limit(120)

    if (error) {
      console.error('[news page] supabase error:', error.message)
    } else {
      articles = (data ?? []) as NewsArticle[]
    }
  } catch (err) {
    console.error('[news page] unexpected error:', err)
  }

  return <NewsPageClient articles={articles} />
}
