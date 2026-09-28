import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { join } from 'path'

// Load .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function main() {
  console.log('Fetching active prices from Stripe...')
  
  // We fetch prices and expand the product to match it by name or metadata
  const prices = await stripe.prices.list({ active: true, expand: ['data.product'] })

  console.log(`Found ${prices.data.length} prices.`)

  const { data: tiers, error } = await supabase.from('membership_tiers').select('id, slug, name')
  if (error) throw error

  console.log(`Found ${tiers.length} membership tiers in DB.`)

  for (const tier of tiers) {
    if (tier.slug === 'free') continue // Free tier doesn't have a Stripe price

    // Try to find a matching price. We can match by product name == tier name,
    // or you can set metadata in Stripe to map slug -> price
    const matchedPrice = prices.data.find(p => {
      const product = p.product as Stripe.Product
      return product.name.toLowerCase() === tier.name.toLowerCase() || product.metadata?.slug === tier.slug
    })

    if (matchedPrice) {
      console.log(`Updating ${tier.slug} with price ${matchedPrice.id}`)
      const { error: updateError } = await supabase
        .from('membership_tiers')
        .update({ stripe_price_id: matchedPrice.id })
        .eq('id', tier.id)

      if (updateError) {
        console.error(`Failed to update ${tier.slug}:`, updateError)
      }
    } else {
      console.warn(`No matching Stripe price found for tier: ${tier.slug} (${tier.name})`)
    }
  }

  console.log('Sync complete.')
}

main().catch(console.error)
