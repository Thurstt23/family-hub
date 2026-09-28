import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { tierSlug } = await req.json()
    if (!tierSlug) return NextResponse.json({ error: 'Missing tierSlug' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Lookup tier
    const { data: tier } = await supabase
      .from('membership_tiers')
      .select('id, stripe_price_id, billing_interval')
      .eq('slug', tierSlug)
      .single()

    if (!tier || !tier.stripe_price_id) {
      return NextResponse.json({ error: 'Tier not found or missing price' }, { status: 400 })
    }

    // Lookup existing stripe customer
    const { data: membership } = await supabase
      .from('memberships')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = membership?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      })
      customerId = customer.id
      // We don't necessarily need to save the customer ID back to memberships here, 
      // the webhook will upsert the membership row anyway.
    }

    const origin = req.nextUrl.origin

    const sessionData: any = {
      mode: tier.billing_interval === 'one_time' ? 'payment' : 'subscription',
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      customer: customerId,
      client_reference_id: user.id,
      metadata: { user_id: user.id, tier_id: tier.id },
      success_url: `${origin}/me/membership?checkout=success`,
      cancel_url: `${origin}/join?checkout=canceled`,
      allow_promotion_codes: true,
    }

    if (tier.billing_interval !== 'one_time') {
      sessionData.subscription_data = { metadata: { user_id: user.id, tier_id: tier.id } }
    }

    const session = await stripe.checkout.sessions.create(sessionData)

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
