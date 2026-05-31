import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

type PackId = 'pack_25' | 'pack_100'

type PackDefinition = {
  priceIdEnv: string
  sessions: number
  label: string
}

const PACKS: Record<PackId, PackDefinition> = {
  pack_25: {
    priceIdEnv: 'STRIPE_PRICE_CHOPPER_PACK_25',
    sessions: 25,
    label: '25 Chopper sessions',
  },
  pack_100: {
    priceIdEnv: 'STRIPE_PRICE_CHOPPER_PACK_100',
    sessions: 100,
    label: '100 Chopper sessions',
  },
}

export async function POST(req: NextRequest) {
  try {
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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_pro, email')
      .eq('id', user.id)
      .single()

    if (profile?.is_pro !== true) {
      return Response.json(
        { error: 'Chopper top-ups are available to Pro members only.' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const packId = body?.pack_id as PackId | undefined

    if (!packId || !(packId in PACKS)) {
      return Response.json(
        { error: 'Invalid pack id. Must be "pack_25" or "pack_100".' },
        { status: 400 }
      )
    }

    const pack = PACKS[packId]
    const priceId = process.env[pack.priceIdEnv]

    if (!priceId) {
      console.error(`Missing env var: ${pack.priceIdEnv}`)
      return Response.json(
        { error: 'Pricing configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: profile.email ?? user.email ?? undefined,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/chopper?topup_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/chopper?topup_canceled=true`,
      metadata: {
        user_id: user.id,
        purchase_type: 'chopper_topup',
        pack_id: packId,
        pack_sessions: String(pack.sessions),
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          purchase_type: 'chopper_topup',
          pack_id: packId,
          pack_sessions: String(pack.sessions),
        },
      },
    })

    return Response.json({
      checkout_url: checkoutSession.url,
      session_id: checkoutSession.id,
    })
  } catch (error: any) {
    console.error('Chopper topup route error:', error)
    return Response.json(
      { error: 'Failed to start checkout. Try again.', details: error.message },
      { status: 500 }
    )
  }
}