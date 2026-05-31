import { supabaseAdmin } from '@/lib/supabase-admin'

// =============================================================================
// Constants
// =============================================================================

export const MONTHLY_SESSION_ALLOWANCE = 50
export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
export const TOPUP_EXPIRATION_DAYS = 45

// =============================================================================
// Types
// =============================================================================

export type SessionBucket = 'monthly_allowance' | 'paid_topup'

export type SessionAvailability = {
  monthly_used: number
  monthly_remaining: number
  paid_remaining: number
  total_remaining: number
  can_start_session: boolean
}

export type CurrentSession = {
  id: string
  bucket: SessionBucket
  message_count: number
  started_at: string
  last_message_at: string
}

// =============================================================================
// Availability check — how many sessions does the user have right now?
// =============================================================================

export async function getSessionAvailability(
  userId: string
): Promise<SessionAvailability> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Count sessions this user has started this month from the monthly allowance
  const { count: monthlyUsed, error: monthlyError } = await supabaseAdmin
    .from('chopper_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('bucket', 'monthly_allowance')
    .gte('started_at', startOfMonth)

  if (monthlyError) {
    console.error('Error counting monthly sessions:', monthlyError)
  }

  // Sum remaining sessions from non-expired credit batches
  const { data: credits, error: creditsError } = await supabaseAdmin
    .from('chopper_session_credits')
    .select('sessions_remaining')
    .eq('user_id', userId)
    .gt('sessions_remaining', 0)
    .gt('expires_at', now.toISOString())

  if (creditsError) {
    console.error('Error fetching credit batches:', creditsError)
  }

  const monthlyUsedCount = monthlyUsed ?? 0
  const monthlyRemaining = Math.max(0, MONTHLY_SESSION_ALLOWANCE - monthlyUsedCount)
  const paidRemaining = (credits ?? []).reduce(
    (sum, c) => sum + (c.sessions_remaining ?? 0),
    0
  )

  return {
    monthly_used: monthlyUsedCount,
    monthly_remaining: monthlyRemaining,
    paid_remaining: paidRemaining,
    total_remaining: monthlyRemaining + paidRemaining,
    can_start_session: monthlyRemaining + paidRemaining > 0,
  }
}

// =============================================================================
// Find the user's currently-active session, if any
// (last_message_at within the inactivity window)
// =============================================================================

export async function getActiveSession(
  userId: string
): Promise<CurrentSession | null> {
  const cutoff = new Date(Date.now() - SESSION_INACTIVITY_TIMEOUT_MS).toISOString()

  const { data, error } = await supabaseAdmin
    .from('chopper_sessions')
    .select('id, bucket, message_count, started_at, last_message_at')
    .eq('user_id', userId)
    .gte('last_message_at', cutoff)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching active session:', error)
    return null
  }

  return data as CurrentSession | null
}

// =============================================================================
// Start a new session — consumes from the correct bucket
// Returns null if the user has no sessions available
// =============================================================================

export async function startNewSession(
  userId: string
): Promise<CurrentSession | null> {
  const availability = await getSessionAvailability(userId)
  if (!availability.can_start_session) return null

  // Prefer monthly allowance first; only use paid sessions after monthly runs out
  const bucket: SessionBucket =
    availability.monthly_remaining > 0 ? 'monthly_allowance' : 'paid_topup'

  // If using a paid session, decrement the oldest non-expired credit batch
  if (bucket === 'paid_topup') {
    const decremented = await consumeOldestPaidCredit(userId)
    if (!decremented) {
      // Race condition — credits were drained between check and consume
      return null
    }
  }

  const { data, error } = await supabaseAdmin
    .from('chopper_sessions')
    .insert({
      user_id: userId,
      bucket,
      message_count: 0,
    })
    .select('id, bucket, message_count, started_at, last_message_at')
    .single()

  if (error || !data) {
    console.error('Error creating new session:', error)
    return null
  }

  return data as CurrentSession
}

// =============================================================================
// Get-or-create — the main entry point used by the chat route
// =============================================================================

export async function getOrStartSession(
  userId: string
): Promise<{ session: CurrentSession | null; availability: SessionAvailability }> {
  const existing = await getActiveSession(userId)
  if (existing) {
    const availability = await getSessionAvailability(userId)
    return { session: existing, availability }
  }

  const newSession = await startNewSession(userId)
  const availability = await getSessionAvailability(userId)
  return { session: newSession, availability }
}

// =============================================================================
// Decrement the oldest non-expired credit batch by 1 session
// Returns true if successful, false if no credits available
// =============================================================================

async function consumeOldestPaidCredit(userId: string): Promise<boolean> {
  const now = new Date().toISOString()

  // Find the oldest non-expired batch with sessions remaining
  const { data: batch, error: fetchError } = await supabaseAdmin
    .from('chopper_session_credits')
    .select('id, sessions_remaining')
    .eq('user_id', userId)
    .gt('sessions_remaining', 0)
    .gt('expires_at', now)
    .order('expires_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (fetchError || !batch) {
    return false
  }

  const { error: updateError } = await supabaseAdmin
    .from('chopper_session_credits')
    .update({ sessions_remaining: batch.sessions_remaining - 1 })
    .eq('id', batch.id)
    .eq('sessions_remaining', batch.sessions_remaining) // optimistic lock

  if (updateError) {
    console.error('Error decrementing credit batch:', updateError)
    return false
  }

  return true
}

// =============================================================================
// Update session usage after a Chopper request completes
// Called from the chat API route after each successful response
// =============================================================================

export async function recordSessionMessage(params: {
  sessionId: string
  inputTokens: number
  outputTokens: number
}): Promise<void> {
  // Claude Sonnet pricing: $3/M input, $15/M output
  const inputCost = (params.inputTokens / 1_000_000) * 3
  const outputCost = (params.outputTokens / 1_000_000) * 15
  const messageCost = inputCost + outputCost

  // Fetch current totals so we can add to them
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('chopper_sessions')
    .select('message_count, total_input_tokens, total_output_tokens, estimated_cost_usd')
    .eq('id', params.sessionId)
    .single()

  if (fetchError || !current) {
    console.error('Error fetching session to update:', fetchError)
    return
  }

  const { error: updateError } = await supabaseAdmin
    .from('chopper_sessions')
    .update({
      message_count: (current.message_count ?? 0) + 1,
      total_input_tokens: (current.total_input_tokens ?? 0) + params.inputTokens,
      total_output_tokens: (current.total_output_tokens ?? 0) + params.outputTokens,
      estimated_cost_usd: Number(
        ((current.estimated_cost_usd ?? 0) + messageCost).toFixed(6)
      ),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', params.sessionId)

  if (updateError) {
    console.error('Error updating session:', updateError)
  }
}

// =============================================================================
// Add a top-up credit batch to a user's account
// Called from the Stripe webhook after a successful top-up purchase
// =============================================================================

export async function addTopupCredits(params: {
  userId: string
  packSize: number
  amountPaidUsd: number
  stripePaymentIntentId: string
}): Promise<void> {
  const expiresAt = new Date(
    Date.now() + TOPUP_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // Insert the credit batch
  const { error: creditError } = await supabaseAdmin
    .from('chopper_session_credits')
    .insert({
      user_id: params.userId,
      sessions_remaining: params.packSize,
      sessions_original: params.packSize,
      expires_at: expiresAt,
      stripe_payment_intent_id: params.stripePaymentIntentId,
    })

  if (creditError) {
    // If the payment intent id conflicts, the webhook fired twice — that's fine, ignore
    if (creditError.code === '23505') {
      console.log('Top-up already credited (duplicate webhook):', params.stripePaymentIntentId)
      return
    }
    console.error('Error inserting credit batch:', creditError)
    throw creditError
  }

  // Also record the purchase for audit trail
  const { error: purchaseError } = await supabaseAdmin
    .from('chopper_topup_purchases')
    .insert({
      user_id: params.userId,
      stripe_payment_intent_id: params.stripePaymentIntentId,
      pack_size: params.packSize,
      amount_paid_usd: params.amountPaidUsd,
    })

  if (purchaseError && purchaseError.code !== '23505') {
    console.error('Error inserting purchase record:', purchaseError)
  }
}