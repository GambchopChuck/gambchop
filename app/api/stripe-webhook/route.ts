export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { addTopupCredits } from '@/lib/chopper/sessions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

// ─── API-version notes ────────────────────────────────────────────────────────
// Stripe API 2026-04-22.dahlia changed two things we rely on:
//   • Subscription.current_period_end was removed from the Subscription root;
//     it is now on each SubscriptionItem (sub.items.data[0].current_period_end)
//   • Invoice.subscription was removed from the Invoice root;
//     it is now at invoice.parent?.subscription_details?.subscription

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unixToIso(ts: number): string {
  return new Date(ts * 1000).toISOString()
}

function toId(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref.id
}

function subPeriodEnd(sub: Stripe.Subscription): number | null {
  return sub.items.data[0]?.current_period_end ?? null
}

async function markIdempotent(eventId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({ event_id: eventId })

  if (error) {
    if (error.code === '23505') {
      // Duplicate key — event already processed
      return false
    }
    // Other DB errors — log and proceed (better to double-process than drop)
    console.error('[webhook] idempotency insert error:', error.code, error.message)
  }
  return true
}

async function getProfileByCustomer(customerId: string): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (error || !data) {
    console.error('[webhook] no profile for stripe_customer_id:', customerId, error?.message)
    return null
  }
  return data as { id: string }
}

async function updateProfile(userId: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    console.error('[webhook] profile update failed — userId:', userId, ':', error.message)
    throw new Error(`Profile update failed: ${error.message}`)
  }
  console.log('[webhook] profile updated — userId:', userId, 'fields:', Object.keys(updates).join(', '))
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleSubscriptionCreated(sub: Stripe.Subscription): Promise<void> {
  const customerId = toId(sub.customer)
  console.log('[webhook] subscription.created — sub:', sub.id, 'customer:', customerId, 'status:', sub.status)
  if (!customerId) { console.error('[webhook] subscription.created missing customer id'); return }

  const profile = await getProfileByCustomer(customerId)
  if (!profile) return

  const periodEnd = subPeriodEnd(sub)
  await updateProfile(profile.id, {
    is_pro:                  true,
    pro_since:               new Date().toISOString(),
    pro_expires_at:          periodEnd ? unixToIso(periodEnd) : null,
    stripe_subscription_id:  sub.id,
  })
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const customerId = toId(sub.customer)
  console.log('[webhook] subscription.updated — sub:', sub.id, 'status:', sub.status, 'cancel_at_period_end:', sub.cancel_at_period_end, 'customer:', customerId)
  if (!customerId) { console.error('[webhook] subscription.updated missing customer id'); return }

  const profile = await getProfileByCustomer(customerId)
  if (!profile) return

  const revokedStatuses: Stripe.Subscription.Status[] = ['canceled', 'unpaid', 'incomplete_expired', 'past_due']
  let isProNow: boolean

  if (revokedStatuses.includes(sub.status)) {
    isProNow = false
  } else if (sub.cancel_at_period_end && (sub.status === 'active' || sub.status === 'trialing')) {
    // Cancelled but billing period hasn't expired — keep access until it does
    isProNow = true
  } else {
    isProNow = sub.status === 'active' || sub.status === 'trialing'
  }

  const periodEnd = subPeriodEnd(sub)
  await updateProfile(profile.id, {
    is_pro:                  isProNow,
    pro_expires_at:          periodEnd ? unixToIso(periodEnd) : null,
    stripe_subscription_id:  sub.id,
  })
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const customerId = toId(sub.customer)
  console.log('[webhook] subscription.deleted — sub:', sub.id, 'customer:', customerId)
  if (!customerId) { console.error('[webhook] subscription.deleted missing customer id'); return }

  const profile = await getProfileByCustomer(customerId)
  if (!profile) return

  // Revoke Pro access; preserve stripe_customer_id and stripe_subscription_id for records
  await updateProfile(profile.id, {
    is_pro:          false,
    pro_expires_at:  null,
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = toId(invoice.customer)
  console.log('[webhook] invoice.payment_succeeded — invoice:', invoice.id, 'customer:', customerId)
  if (!customerId) { console.error('[webhook] payment_succeeded missing customer id'); return }

  // In API 2026-04-22.dahlia, subscription id lives at invoice.parent.subscription_details.subscription
  const subRef = invoice.parent?.type === 'subscription_details'
    ? invoice.parent.subscription_details?.subscription
    : null
  const subscriptionId = toId(subRef ?? null)

  if (!subscriptionId) {
    console.log('[webhook] payment_succeeded has no subscription parent — skipping (one-time payment?)')
    return
  }

  const profile = await getProfileByCustomer(customerId)
  if (!profile) return

  // invoice.period_end is the end of this billing period — use it as pro_expires_at
  const periodEnd = invoice.period_end
  console.log('[webhook] payment_succeeded — period_end:', periodEnd, 'sub:', subscriptionId)

  await updateProfile(profile.id, {
    is_pro:          true,
    pro_expires_at:  periodEnd ? unixToIso(periodEnd) : null,
  })
}
async function handleChopperTopupPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const metadata = paymentIntent.metadata ?? {}

  // Only process payments tagged as Chopper top-ups
  if (metadata.purchase_type !== 'chopper_topup') {
    console.log('[webhook] payment_intent.succeeded not a chopper_topup — skipping')
    return
  }

  const userId = metadata.user_id
  const packId = metadata.pack_id
  const packSessionsRaw = metadata.pack_sessions
  const packSessions = packSessionsRaw ? parseInt(packSessionsRaw, 10) : NaN

  if (!userId || !packId || !packSessions || isNaN(packSessions)) {
    console.error('[webhook] chopper_topup missing or invalid metadata — payment_intent:', paymentIntent.id, 'metadata:', metadata)
    return
  }

  // Stripe amounts are in cents; convert to dollars for our records
  const amountPaidUsd = (paymentIntent.amount ?? 0) / 100

  console.log('[webhook] chopper_topup — user:', userId, 'pack:', packId, 'sessions:', packSessions, 'amount:', amountPaidUsd)

  await addTopupCredits({
    userId,
    packSize: packSessions,
    amountPaidUsd,
    stripePaymentIntentId: paymentIntent.id,
  })

  console.log('[webhook] chopper_topup credited — user:', userId, 'sessions:', packSessions)
}
// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    console.error('[webhook] missing stripe-signature header')
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature error'
    console.error('[webhook] signature verification failed:', message)
    return Response.json({ error: `Webhook signature invalid: ${message}` }, { status: 400 })
  }

  console.log('[webhook] received:', event.type, '—', event.id)

  const shouldProcess = await markIdempotent(event.id)
  if (!shouldProcess) {
    console.log('[webhook] duplicate event skipped:', event.id)
    return Response.json({ received: true, duplicate: true })
  }

  // Wrap handler — code bugs return 200 so Stripe doesn't retry infinitely
  // Replay manually from Stripe dashboard after fixing the bug
  try {
    switch (event.type) {

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.trial_will_end':
        // 3-day trial fires this almost immediately after subscription.created — no action needed
        console.log('[webhook] trial_will_end received — no action at this time')
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        // Log only — Stripe retries for several days; revocation handled by subscription.updated
        console.log('[webhook] invoice.payment_failed — Stripe will retry; monitoring only')
        break
      case 'payment_intent.succeeded':
      default:
        console.log('[webhook] unhandled event type (200 returned):', event.type)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] handler threw for', event.type, ':', message)
  }

  return Response.json({ received: true })
}
