import 'server-only'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPaymentFailed } from '@/lib/email/send'
import { alertOps } from '@/lib/observability/alert'

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
      const session = event.data.object as any
      const userId = session.client_reference_id
      if (!userId) throw new Error('Missing client_reference_id')

      if (session.mode === 'payment') {
        const tierId = session.metadata?.tier_id
        if (!tierId) throw new Error('Missing tier_id in metadata')

        // Every user already has a membership row from signup, so the conflict
        // target must be user_id; without it the upsert collides and fails.
        const { error } = await supabaseAdmin.from('memberships').upsert({
          user_id: userId,
          tier_id: tierId,
          stripe_customer_id: session.customer as string,
          status: 'active',
          current_period_end: null, // lifetime
          cancel_at_period_end: false,
          override_note: null,
          override_by: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        if (error) throw new Error(`membership upsert failed: ${error.message}`)

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
          await handleSubscription(subscription as any)
        }
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as any
      await handleSubscription(subscription)
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any
      const userId = subscription.metadata?.user_id
      if (!userId) throw new Error('Missing user_id in subscription metadata')
      
      const { data: freeTier } = await supabaseAdmin.from('membership_tiers').select('id').eq('slug', 'free').single()
      
      const { error } = await supabaseAdmin.from('memberships').update({
        tier_id: freeTier!.id,
        status: 'canceled',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)
      if (error) throw new Error(`membership downgrade failed: ${error.message}`)

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

      const inv = invoice as any
      // Upsert on the invoice id: a replayed event, or a paid invoice that
      // earlier failed, updates the one row instead of adding another.
      const { error } = await supabaseAdmin.from('payments').upsert({
        user_id: finalUserId || null,
        stripe_invoice_id: inv.id,
        stripe_pi_id: (inv.payment_intent as string) ?? null,
        amount_cents: inv.amount_paid,
        currency: inv.currency,
        status: 'paid',
        description: inv.lines?.data?.[0]?.description ?? null,
        receipt_url: inv.hosted_invoice_url,
        paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
      }, { onConflict: 'stripe_invoice_id' })
      if (error) throw new Error(`payments upsert failed: ${error.message}`)
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const inv = invoice as any
      const customer = invoice.customer as string

      const { data: membership } = await supabaseAdmin.from('memberships').select('user_id').eq('stripe_customer_id', customer).maybeSingle()
      if (membership) {
        await supabaseAdmin.from('memberships').update({ status: 'past_due' }).eq('user_id', membership.user_id)
      }

      // Recorded so the admin dashboard can list failed payments (06, section 2).
      // Never overwrite a row that has since been paid.
      const { data: existing } = await supabaseAdmin.from('payments').select('status').eq('stripe_invoice_id', inv.id).maybeSingle()
      if (!existing) {
        await supabaseAdmin.from('payments').insert({
          user_id: membership?.user_id ?? null,
          stripe_invoice_id: inv.id,
          amount_cents: inv.amount_due ?? 0,
          currency: inv.currency,
          status: 'failed',
          receipt_url: inv.hosted_invoice_url ?? null,
        })
      } else if (existing.status !== 'paid') {
        await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('stripe_invoice_id', inv.id)
      }

      if (membership) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', membership.user_id).maybeSingle()
        if (profile) await sendPaymentFailed(profile)
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

  const s = sub as any
  const { error } = await supabaseAdmin.from('memberships').upsert({
    user_id: userId,
    tier_id: tier.id,
    status: s.status,
    stripe_customer_id: s.customer as string,
    stripe_subscription_id: s.id,
    current_period_end: new Date(s.current_period_end * 1000).toISOString(),
    cancel_at_period_end: s.cancel_at_period_end,
    override_note: null,
    override_by: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw new Error(`membership upsert failed: ${error.message}`)

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
    await alertOps('stripe.webhook.failed', {
      event_id: event.id,
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    })
    return new Response('handler failed', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}
