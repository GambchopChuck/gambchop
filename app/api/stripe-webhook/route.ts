import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const secret = process.env.STRIPE_WEBHOOK_SECRET!

async function setIsPro(userId: string, isPro: boolean) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, is_pro: isPro }, { onConflict: 'id' })
  if (error) console.error('[webhook] setIsPro failed', userId, error.message)
}

function extractUserId(obj: { metadata?: Stripe.Metadata | null; client_reference_id?: string | null }): string | null {
  return obj.metadata?.supabase_user_id ?? obj.client_reference_id ?? null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId  = extractUserId(session)
      if (userId) await setIsPro(userId, true)
      break
    }

    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = extractUserId(sub)
      if (userId) await setIsPro(userId, false)
      break
    }

    case 'invoice.payment_failed': {
      // Grace period — Stripe retries; flip Pro off only on subscription.deleted
      break
    }
  }

  return NextResponse.json({ received: true })
}
