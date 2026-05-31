import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getOrStartSession,
  getSessionAvailability,
  recordSessionMessage,
} from '@/lib/chopper/sessions'
import { buildChopperSystemPrompt } from '@/lib/chopper/system-prompt'
import {
  identifyChartContent,
  searchSubject,
  getRecord,
  getCurrentStreaks,
  getSplit,
  getLeaders,
} from '@/lib/chopper/tools'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-5-20250929'

// =============================================================================
// Tool definitions for Anthropic
// =============================================================================

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'identifyChartContent',
    description:
      'Call this first when the user has uploaded an image. Returns a reminder to describe the image and confirm subject, chart row, and time range with the user before querying data.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'searchSubject',
    description:
      'Resolves a plain-language reference to a team ("Yankees", "NYY", "D-Backs") into a database record. Call this before any other data tool when the user names a subject by a non-canonical name.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The team name, abbreviation, or nickname the user mentioned.',
        },
        league: { type: 'string', description: 'Optional league filter (e.g. "MLB").' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getRecord',
    description:
      "Returns wins/losses/pushes for one team in one chart row over a date range. Use after searchSubject has given you the team's id.",
    input_schema: {
      type: 'object',
      properties: {
        subject_id: { type: 'string' },
        subject_type: { type: 'string', enum: ['team', 'player'] },
        chart_row: {
          type: 'string',
          enum: [
            'moneyline',
            'spread',
            'ml_favorite',
            'ml_underdog',
            'spread_favorite',
            'spread_dog',
            'home',
            'away',
            'over_under',
          ],
        },
        start_date: { type: 'string', description: 'ISO date (YYYY-MM-DD). Optional.' },
        end_date: { type: 'string', description: 'ISO date (YYYY-MM-DD). Optional.' },
      },
      required: ['subject_id', 'subject_type', 'chart_row'],
    },
  },
  {
    name: 'getCurrentStreaks',
    description:
      'Returns active streaks across a league (or all active leagues) for a chart row, at or above a minimum length. Use for questions like "who is on the longest losing streak", "what teams are on under streaks". When no league is specified, pass league: "all" to search every active league.',
    input_schema: {
      type: 'object',
      properties: {
        league: {
          type: 'string',
          description: 'League slug ("mlb") or "all" to query every active league. Omit or pass "all" when the user does not specify a league.',
        },
        chart_row: {
          type: 'string',
          enum: [
            'moneyline',
            'spread',
            'ml_favorite',
            'ml_underdog',
            'spread_favorite',
            'spread_dog',
            'home',
            'away',
            'over_under',
          ],
        },
        min_length: { type: 'integer', description: 'Minimum streak length to include. Defaults to 3.' },
        direction: {
          type: 'string',
          enum: ['win', 'loss', 'over', 'under'],
          description: 'Filter to only streaks in this direction. Omit to return all directions.',
        },
      },
      required: ['chart_row'],
    },
  },
  {
    name: 'getSplit',
    description:
      'Returns a home/away or favorite/underdog comparison, either for one team or league-wide.',
    input_schema: {
      type: 'object',
      properties: {
        subject_id: { type: 'string', description: 'Optional team id; omit for league-wide.' },
        league: { type: 'string' },
        split_type: { type: 'string', enum: ['home_away', 'favorite_underdog'] },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
      },
      required: ['league', 'split_type'],
    },
  },
  {
    name: 'getLeaders',
    description: 'Returns the top N teams in a given category over a date range, across one or all active leagues. Use for questions like "who has the most moneyline wins in the last 14 days", "which team leads in overs this month". When no league is specified, pass league: "all".',
    input_schema: {
      type: 'object',
      properties: {
        league: {
          type: 'string',
          description: 'League slug ("mlb") or "all" to query every active league. Omit or pass "all" when the user does not specify a league.',
        },
        category: {
          type: 'string',
          enum: [
            'moneyline_wins',
            'spread_covers',
            'overs',
            'unders',
            'home_wins',
            'away_wins',
            'ml_favorite_wins',
            'ml_underdog_wins',
          ],
        },
        start_date: {
          type: 'string',
          description: 'ISO date YYYY-MM-DD. Compute from natural language: "last 14 days" = today minus 14, "this month" = first of current month.',
        },
        end_date: { type: 'string', description: 'ISO date YYYY-MM-DD. Usually omit (defaults to today).' },
        limit: { type: 'integer', description: 'Number of teams to return. Defaults to 10.' },
      },
      required: ['category'],
    },
  },
]

// =============================================================================
// Tool dispatcher
// =============================================================================

async function executeToolCall(name: string, input: any): Promise<unknown> {
  switch (name) {
    case 'identifyChartContent':
      return identifyChartContent()
    case 'searchSubject':
      return searchSubject(input)
    case 'getRecord':
      return getRecord(input)
    case 'getCurrentStreaks':
      return getCurrentStreaks(input)
    case 'getSplit':
      return getSplit(input)
    case 'getLeaders':
      return getLeaders(input)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// =============================================================================
// POST handler
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // 1. Authenticate via Bearer token
    // -----------------------------------------------------------------------
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // -----------------------------------------------------------------------
    // 2. Verify Pro subscription
    // -----------------------------------------------------------------------
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single()

    if (profile?.is_pro !== true) {
      return Response.json(
        { error: 'Chopper is a Pro feature. Upgrade to access.' },
        { status: 403 }
      )
    }

    // -----------------------------------------------------------------------
    // 3. Get or start a session (and check availability)
    // -----------------------------------------------------------------------
    const { session, availability } = await getOrStartSession(user.id)

    if (!session) {
      // User has no sessions in either bucket — surface the upsell
      return Response.json(
        {
          error: 'no_sessions_remaining',
          message:
            "You've used all your Chopper sessions for this month. Top up for more, or your monthly allowance resets on the 1st.",
          availability,
        },
        { status: 402 }
      )
    }

    // -----------------------------------------------------------------------
    // 4. Parse the request body
    // -----------------------------------------------------------------------
    const body = await req.json()
    const { messages, imageBase64 } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: any }>
      imageBase64?: string
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'No messages provided.' }, { status: 400 })
    }

    // Attach the image to the latest user message if provided
    const conversationMessages: Anthropic.MessageParam[] = messages.map((m, i) => {
      const isLastUserMessage = i === messages.length - 1 && m.role === 'user'
      if (isLastUserMessage && imageBase64) {
        return {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: typeof m.content === 'string' ? m.content : '',
            },
          ],
        }
      }
      return {
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      }
    })

    // -----------------------------------------------------------------------
    // 5. Tool loop
    // -----------------------------------------------------------------------
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let finalText = ''
    let iteration = 0
    const MAX_ITERATIONS = 6

    while (iteration < MAX_ITERATIONS) {
      iteration++

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: buildChopperSystemPrompt(new Date().toISOString().split('T')[0]),
        tools: TOOLS,
        messages: conversationMessages,
      })

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text'
      )
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      if (toolUseBlocks.length === 0) {
        finalText = textBlocks.map((b) => b.text).join('\n')
        break
      }

      conversationMessages.push({
        role: 'assistant',
        content: response.content,
      })

      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        const result = await executeToolCall(toolUse.name, toolUse.input)
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        })
      }

      conversationMessages.push({
        role: 'user',
        content: toolResultBlocks,
      })

      if (response.stop_reason !== 'tool_use') {
        finalText = textBlocks.map((b) => b.text).join('\n')
        break
      }
    }

    if (!finalText) {
      finalText =
        'Chopper ran into a loop trying to answer that. Try rephrasing or breaking the question into smaller parts.'
    }

    // -----------------------------------------------------------------------
    // 6. Record the message against the session (updates last_message_at)
    // -----------------------------------------------------------------------
    await recordSessionMessage({
      sessionId: session.id,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    })

    // -----------------------------------------------------------------------
    // 7. Return reply + fresh availability so the UI updates the counter
    // -----------------------------------------------------------------------
    const freshAvailability = await getSessionAvailability(user.id)

    return Response.json({
      reply: finalText,
      session_id: session.id,
      bucket: session.bucket,
      availability: freshAvailability,
    })
  } catch (error: any) {
    console.error('Chopper route error:', error)
    return Response.json(
      { error: 'Chopper failed to respond. Try again.', details: error.message },
      { status: 500 }
    )
  }
}