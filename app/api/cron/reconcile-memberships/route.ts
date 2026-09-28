import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const cronSecret = (await headers()).get('CRON_SECRET')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Select memberships where current_period_end < now() and status = 'active'
  const { data: expired } = await supabaseAdmin
    .from('memberships')
    .select('*')
    .lt('current_period_end', new Date().toISOString())
    .eq('status', 'active')
    .not('stripe_subscription_id', 'is', null)

  if (!expired || expired.length === 0) {
    return NextResponse.json({ message: 'Nothing to reconcile' })
  }

  const { data: freeTier } = await supabaseAdmin.from('membership_tiers').select('id').eq('slug', 'free').single()

  let count = 0
  for (const m of expired) {
    // 2. Fetch the live subscription from Stripe
    try {
      const sub = await stripe.subscriptions.retrieve(m.stripe_subscription_id!)
      
      if (sub.status === 'canceled' || sub.status === 'unpaid') {
        // 3. Downgrade to free
        await supabaseAdmin.from('memberships').update({
          tier_id: freeTier!.id,
          status: 'canceled',
        }).eq('id', m.id)

        await supabaseAdmin.from('audit_log').insert({
          action: 'membership.reconcile',
          entity: 'memberships',
          entity_id: m.user_id,
          meta: { action: 'downgraded', reason: sub.status }
        })
        count++
      } else if (sub.status === 'active' || sub.status === 'past_due' || sub.status === 'trialing') {
        // 4. Correct the local row
        const newPeriodEnd = new Date((sub as any).current_period_end * 1000).toISOString()
        
        // Find tier id corresponding to price
        const priceId = (sub as any).items.data[0].price.id
        const { data: tier } = await supabaseAdmin
          .from('membership_tiers')
          .select('id, level')
          .eq('stripe_price_id', priceId)
          .single()
        
        await supabaseAdmin.from('memberships').update({
          status: sub.status,
          current_period_end: newPeriodEnd,
          tier_id: tier ? tier.id : m.tier_id
        }).eq('id', m.id)

        await supabaseAdmin.from('audit_log').insert({
          action: 'membership.reconcile',
          entity: 'memberships',
          entity_id: m.user_id,
          meta: { action: 'corrected', new_status: sub.status, new_period_end: newPeriodEnd }
        })
        count++
      }
    } catch (err: any) {
      console.error(`Error reconciling membership ${m.id}:`, err)
    }
  }

  return NextResponse.json({ message: 'Reconciled', count })
}
