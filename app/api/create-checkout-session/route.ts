import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { billing, userId, email } = await req.json() as {
    billing: 'monthly' | 'annual'
    userId: string
    email?: string
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const priceId = billing === 'annual'
    ? process.env.STRIPE_PRICE_ANNUAL!
    : process.env.STRIPE_PRICE_MONTHLY!

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    // No card required during trial — Stripe asks after 7 days
    payment_method_collection: 'if_required',
    subscription_data: {
      trial_period_days: 7,
      metadata: { supabase_user_id: userId },
    },
    client_reference_id: userId,
    customer_email:      email ?? undefined,
    metadata:            { supabase_user_id: userId },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/pricing`,
  })

  return NextResponse.json({ url: session.url })
}
