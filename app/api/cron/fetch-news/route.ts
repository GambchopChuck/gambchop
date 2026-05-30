export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

// Fetches sports news from NewsAPI /everything for 6 leagues, upserts into
// news_articles. Runs daily at 6am UTC via Vercel cron.
// Protected by CRON_SECRET (Vercel-managed) or INGESTION_ADMIN_TOKEN (local dev).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SPORT_QUERIES: { sport: string; q: string }[] = [
  { sport: 'MLB',  q: 'MLB baseball betting odds spread moneyline' },
  { sport: 'NBA',  q: 'NBA basketball betting odds spread moneyline' },
  { sport: 'NFL',  q: 'NFL football betting odds spread moneyline' },
  { sport: 'NHL',  q: 'NHL hockey betting odds spread puck line' },
  { sport: 'WNBA', q: 'WNBA basketball betting odds' },
  { sport: 'ATP',  q: 'ATP tennis betting odds Wimbledon Grand Slam' },
]

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
    const url = new URL('https://newsapi.org/v2/everything')
    url.searchParams.set('q', q)
    url.searchParams.set('language', 'en')
    url.searchParams.set('sortBy', 'publishedAt')
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

    if (articles.length === 0) {
      return { sport, fetched: 0, upserted: 0 }
    }

    const rows = articles.map(a => ({
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

    console.log(`[fetch-news:${sport}] upserted ${rows.length} articles`)
    return { sport, fetched: articles.length, upserted: rows.length }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[fetch-news:${sport}] error: ${msg}`)
    return { sport, fetched: 0, upserted: 0, error: msg }
  }
}
