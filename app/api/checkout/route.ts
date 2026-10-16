import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { NextRequest, NextResponse } from 'next/server'

// /me/membership posts a plain HTML form; API callers send JSON. A form gets
// a 303 to Stripe (or back to the page with an error), JSON gets JSON.
function isForm(req: NextRequest) {
  const type = req.headers.get('content-type') ?? ''
  return type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')
}

export async function POST(req: NextRequest) {
  const form = isForm(req)
  const fail = (error: string, status: number) =>
    form
      ? NextResponse.redirect(new URL(`/me/membership?checkout=error&reason=${encodeURIComponent(error)}`, req.nextUrl.origin), 303)
      : NextResponse.json({ error }, { status })

  try {
    const tierSlug = form ? (await req.formData()).get('tierSlug')?.toString() : (await req.json()).tierSlug
    if (!tierSlug) return fail('Missing tierSlug', 400)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return form
        ? NextResponse.redirect(new URL('/login?next=/me/membership', req.nextUrl.origin), 303)
        : NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Lookup tier
    const { data: tier } = await supabase
      .from('membership_tiers')
      .select('id, stripe_price_id, billing_interval')
      .eq('slug', tierSlug)
      .single()

    if (!tier || !tier.stripe_price_id) {
      return fail('Tier not found or missing price', 400)
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

    if (form && session.url) return NextResponse.redirect(session.url, 303)
    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return fail('Checkout could not be started', 500)
  }
}
