import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

const PRICE_MAP: Record<string, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  annual:  process.env.STRIPE_PRICE_ANNUAL,
}

export async function POST(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'

  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Resolve price ID ───────────────────────────────────────────────────
    const body = await req.json() as { priceId?: string }
    const stripePriceId = PRICE_MAP[body.priceId ?? '']
    if (!stripePriceId) {
      return Response.json({ error: 'Invalid plan — must be "monthly" or "annual"' }, { status: 400 })
    }

    // ── Get or create Stripe customer ──────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId: string = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? ''

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabaseAdmin
        .from('profiles')
        .upsert({ id: user.id, stripe_customer_id: customerId }, { onConflict: 'id' })
    }

    // ── Create Checkout Session ────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      subscription_data: { trial_period_days: 3 },
      payment_method_collection: 'always',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?canceled=true`,
      metadata: { user_id: user.id },
    })

    return Response.json({ url: session.url })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[create-checkout-session]', message)
    return Response.json(
      { error: isDev ? message : 'Failed to create checkout session. Please try again.' },
      { status: 500 },
    )
  }
}
