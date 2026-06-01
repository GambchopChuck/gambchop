export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

// Fetches sports news from NewsAPI /v2/top-headlines?category=sports for 6 leagues,
// validates each article against sport-specific keywords, and upserts into news_articles.
// Runs daily at 6am UTC via Vercel cron.
// Protected by CRON_SECRET (Vercel-managed) or INGESTION_ADMIN_TOKEN (local dev).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SPORT_QUERIES: { sport: string; q: string }[] = [
  { sport: 'MLB',  q: 'MLB baseball' },
  { sport: 'NBA',  q: 'NBA basketball' },
  { sport: 'NFL',  q: 'NFL football' },
  { sport: 'NHL',  q: 'NHL hockey' },
  { sport: 'WNBA', q: 'WNBA' },
  { sport: 'ATP',  q: 'ATP tennis' },
]

// Article must match at least one keyword to be saved; non-matching articles are dropped.
// Terms like "serve" and "Finals" were removed — too ambiguous outside their sport context.
const SPORT_KEYWORDS: Record<string, RegExp> = {
  MLB:  /\b(MLB|baseball|World Series|ALCS|NLCS|home run|pitcher|batting|bullpen|outfielder|shortstop|strikeout)\b/i,
  NBA:  /\b(NBA|basketball|dunk|three.pointer|point guard|slam dunk|free throw|NBA Finals|NBA Playoffs)\b/i,
  NFL:  /\b(NFL|football|Super Bowl|touchdown|quarterback|gridiron|NFL Draft|wide receiver|running back)\b/i,
  NHL:  /\b(NHL|hockey|puck|Stanley Cup|goalie|power play|hat trick|ice hockey|faceoff)\b/i,
  WNBA: /\b(WNBA|women.s basketball|women.s NBA)\b/i,
  ATP:  /\b(ATP|WTA|tennis|Wimbledon|Grand Slam|US Open|French Open|Australian Open|Roland Garros|match point|tiebreak|clay court|hard court)\b/i,
}

// Belt-and-suspenders: any article surviving the per-sport filter must still mention
// at least one of the six sports by their primary identifier.
const ANY_SPORT_RE = /\b(MLB|baseball|NBA|basketball|NFL|football|NHL|hockey|WNBA|ATP|WTA|tennis)\b/i

type NewsApiArticle = {
  source: { id: string | null; name: string }
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

type NewsApiResponse = {
  status: string
  totalResults?: number
  articles?: NewsApiArticle[]
  message?: string
  code?: string
}

type SportResult = {
  sport: string
  fetched: number
  skipped: number
  upserted: number
  error?: string
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const adminToken = process.env.INGESTION_ADMIN_TOKEN
  const tokenParam = new URL(req.url).searchParams.get('token')

  const viaCron  = cronSecret && authHeader === `Bearer ${cronSecret}`
  const viaToken = adminToken && tokenParam === adminToken

  if (!viaCron && !viaToken) {
    console.warn('[fetch-news] unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'NEWSAPI_KEY not configured' }, { status: 500 })
  }

  const startedAt = Date.now()
  const results: SportResult[] = []
  let totalUpserted = 0

  for (const { sport, q } of SPORT_QUERIES) {
    const result = await fetchAndStore(apiKey, sport, q)
    results.push(result)
    totalUpserted += result.upserted
  }

  const anyFailed = results.some(r => r.error !== undefined)
  console.log(`[fetch-news] done — total:${totalUpserted} duration:${((Date.now() - startedAt) / 1000).toFixed(1)}s`)

  return NextResponse.json(
    {
      success:          !anyFailed,
      total_upserted:   totalUpserted,
      duration_seconds: parseFloat(((Date.now() - startedAt) / 1000).toFixed(1)),
      results,
    },
    { status: anyFailed ? 207 : 200 },
  )
}

async function fetchAndStore(apiKey: string, sport: string, q: string): Promise<SportResult> {
  try {
    const url = new URL('https://newsapi.org/v2/top-headlines')
    url.searchParams.set('category', 'sports')
    url.searchParams.set('language', 'en')
    url.searchParams.set('q', q)
    url.searchParams.set('pageSize', '20')
    url.searchParams.set('apiKey', apiKey)

    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) {
      throw new Error(`NewsAPI HTTP ${res.status}`)
    }

    const json: NewsApiResponse = await res.json()
    if (json.status !== 'ok') {
      throw new Error(`NewsAPI error [${json.code ?? 'unknown'}]: ${json.message ?? JSON.stringify(json)}`)
    }

    const articles = (json.articles ?? []).filter(
      a => a.url && a.title && a.title !== '[Removed]',
    )

    // Drop any article whose headline+description doesn't mention the expected sport
    // AND doesn't pass the cross-sport sanity check.
    const matched = articles.filter(a => {
      const text = `${a.title} ${a.description ?? ''}`
      return (SPORT_KEYWORDS[sport]?.test(text) ?? false) && ANY_SPORT_RE.test(text)
    })

    const skipped = articles.length - matched.length

    if (matched.length === 0) {
      console.log(`[fetch-news:${sport}] 0 matched (${skipped} skipped out of ${articles.length} fetched)`)
      return { sport, fetched: articles.length, skipped, upserted: 0 }
    }

    const rows = matched.map(a => ({
      external_id:  a.url,
      headline:     a.title,
      summary:      a.description ?? null,
      image_url:    a.urlToImage ?? null,
      source:       a.source.name ?? null,
      article_url:  a.url,
      sport,
      published_at: a.publishedAt,
    }))

    const { error } = await supabaseAdmin
      .from('news_articles')
      .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: false })

    if (error) throw new Error(`Supabase upsert: ${error.message}`)

    console.log(`[fetch-news:${sport}] upserted ${rows.length} (${skipped} skipped)`)
    return { sport, fetched: articles.length, skipped, upserted: rows.length }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[fetch-news:${sport}] error: ${msg}`)
    return { sport, fetched: 0, skipped: 0, upserted: 0, error: msg }
  }
}
