import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { NextRequest, NextResponse } from 'next/server'

// Called from a plain form on /me/membership (303 to Stripe) or as JSON.
export async function POST(req: NextRequest) {
  const type = req.headers.get('content-type') ?? ''
  const form = type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')
  const fail = (error: string, status: number) =>
    form
      ? NextResponse.redirect(new URL(`/me/membership?portal=error&reason=${encodeURIComponent(error)}`, req.nextUrl.origin), 303)
      : NextResponse.json({ error }, { status })

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return form
        ? NextResponse.redirect(new URL('/login?next=/me/membership', req.nextUrl.origin), 303)
        : NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('memberships')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!membership?.stripe_customer_id) {
      return fail('No billing account yet', 400)
    }

    const origin = req.nextUrl.origin
    const session = await stripe.billingPortal.sessions.create({
      customer: membership.stripe_customer_id,
      return_url: `${origin}/me/membership`,
    })

    if (form) return NextResponse.redirect(session.url, 303)
    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Portal error:', error)
    return fail('The billing portal could not be opened', 500)
  }
}
