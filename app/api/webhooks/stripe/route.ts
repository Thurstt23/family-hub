import 'server-only'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'          // required: Edge cannot verify raw body reliably
export const dynamic = 'force-dynamic'

const RELEVANT = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
])

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id
      if (!userId) throw new Error('Missing client_reference_id')

      if (session.mode === 'payment') {
        const tierId = session.metadata?.tier_id
        if (!tierId) throw new Error('Missing tier_id in metadata')

        await supabaseAdmin.from('memberships').upsert({
          user_id: userId,
          tier_id: tierId,
          stripe_customer_id: session.customer as string,
          status: 'active',
          current_period_end: null // lifetime
        })

        await supabaseAdmin.from('audit_log').insert({
          action: 'membership.sync',
          entity: 'memberships',
          entity_id: userId,
          meta: { event: event.type, tier_id: tierId }
        })
      } else {
        // mode = subscription
        const subId = session.subscription as string
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId)
          await handleSubscription(subscription)
        }
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscription(subscription)
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.user_id
      if (!userId) throw new Error('Missing user_id in subscription metadata')
      
      const { data: freeTier } = await supabaseAdmin.from('membership_tiers').select('id').eq('slug', 'free').single()
      
      await supabaseAdmin.from('memberships').update({
        tier_id: freeTier!.id,
        status: 'canceled',
        stripe_subscription_id: null
      }).eq('user_id', userId)

      await supabaseAdmin.from('audit_log').insert({
        action: 'membership.sync',
        entity: 'memberships',
        entity_id: userId,
        meta: { event: event.type, status: 'canceled' }
      })
      break
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const userId = (invoice as any).subscription_details?.metadata?.user_id || invoice.metadata?.user_id
      
      let finalUserId = userId
      if (!finalUserId && invoice.customer) {
         const { data: m } = await supabaseAdmin.from('memberships').select('user_id').eq('stripe_customer_id', invoice.customer as string).single()
         finalUserId = m?.user_id
      }

      await supabaseAdmin.from('payments').insert({
        user_id: finalUserId || null,
        stripe_invoice_id: invoice.id,
        stripe_pi_id: invoice.payment_intent as string,
        amount_cents: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        receipt_url: invoice.hosted_invoice_url,
        paid_at: new Date(invoice.status_transitions.paid_at! * 1000).toISOString()
      })
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customer = invoice.customer as string
      
      const { data: membership } = await supabaseAdmin.from('memberships').select('user_id').eq('stripe_customer_id', customer).single()
      if (membership) {
        await supabaseAdmin.from('memberships').update({ status: 'past_due' }).eq('user_id', membership.user_id)
        // Note: sending the update your card email with a Billing Portal link is omitted for brevity,
        // but it would trigger Resend here.
      }
      break
    }
  }
}

async function handleSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id
  if (!userId) throw new Error('Missing user_id in subscription metadata')
  
  const priceId = (sub as any).items.data[0].price.id
  const { data: tier } = await supabaseAdmin
    .from('membership_tiers')
    .select('id, level')
    .eq('stripe_price_id', priceId)
    .single()
    
  if (!tier) throw new Error(`Unmapped price ${priceId}`)

  await supabaseAdmin.from('memberships').upsert({
    user_id: userId,
    tier_id: tier.id,
    status: sub.status,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end
  })

  await supabaseAdmin.from('audit_log').insert({
    action: 'membership.sync',
    entity: 'memberships',
    entity_id: userId,
    meta: { event: 'subscription.sync', tier_id: tier.id, status: sub.status }
  })
}

export async function POST(req: Request) {
  const body = await req.text()                       // raw body, never req.json()
  const sig = (await headers()).get('stripe-signature')
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response('Invalid signature', { status: 400 })
  }

  if (!RELEVANT.has(event.type)) return new Response('ignored', { status: 200 })

  // idempotency: insert first, duplicates are rejected by the primary key
  const { error: dupe } = await supabaseAdmin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type, payload: event as unknown as any })
  if (dupe) return new Response('already processed', { status: 200 })

  try {
    await handleEvent(event)
  } catch (err) {
    // remove the ledger row so Stripe's retry can reprocess
    await supabaseAdmin.from('stripe_events').delete().eq('id', event.id)
    console.error('Webhook error:', err)
    return new Response('handler failed', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}
