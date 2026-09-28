import { requireActiveMember } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const { user } = await requireActiveMember()
  const supabase = await createClient()
  const sp = await searchParams

  const { data: membership } = await supabase
    .from('memberships')
    .select(`
      status, current_period_end, cancel_at_period_end,
      tier:membership_tiers(slug, name, description, level, price_cents, billing_interval)
    `)
    .eq('user_id', user.id)
    .single()

  const { data: tiers } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const tierData = membership?.tier as any
  const currentTierSlug = Array.isArray(tierData) ? tierData[0]?.slug : tierData?.slug
  const currentTierLevel = Array.isArray(tierData) ? tierData[0]?.level : tierData?.level
  const currentTierName = Array.isArray(tierData) ? tierData[0]?.name : tierData?.name
  const isFree = currentTierSlug === 'free'

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-serif">Membership</h1>
        <p className="text-slate">Manage your tier and billing settings.</p>
      </div>

      {sp.checkout === 'success' && (
        <div className="bg-green-50 text-green-800 p-4 rounded-md border border-green-200">
          Payment successful! Your membership has been updated.
        </div>
      )}

      <div className="bg-card border border-rule p-6 rounded-md shadow-sm">
        <h2 className="text-xl font-medium mb-4">Current Plan: {currentTierName}</h2>
        <div className="space-y-4 text-slate">
          {membership?.status === 'active' && !isFree && membership.current_period_end && (
            <p>
              Your subscription is active and will {membership.cancel_at_period_end ? 'end' : 'renew'} on{' '}
              <span className="font-medium text-ink">{format(new Date(membership.current_period_end), 'MMM d, yyyy')}</span>.
            </p>
          )}
          {membership?.status === 'active' && !isFree && !membership.current_period_end && (
            <p>You have a lifetime membership. It never expires.</p>
          )}
          {membership?.status === 'past_due' && (
            <p className="text-red-600 font-medium">Your last payment failed. Please update your payment method.</p>
          )}
          
          {!isFree && (
            <form action="/api/portal" method="POST">
              <button type="submit" className={buttonVariants({ variant: 'outline' })}>
                Manage Billing & Payment Methods
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-serif">Available Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers?.map(tier => {
            const isCurrent = tier.slug === currentTierSlug
            return (
              <div key={tier.id} className={`border p-6 rounded-md flex flex-col ${isCurrent ? 'border-brass ring-1 ring-brass bg-brass/5' : 'border-rule bg-card'}`}>
                <h3 className="font-medium text-lg text-ink">{tier.name}</h3>
                <p className="text-xl font-bold mt-2 mb-4 text-ink">
                  {tier.price_cents === 0 ? 'Free' : `$${tier.price_cents / 100}`}
                  {tier.billing_interval === 'year' ? '/yr' : ''}
                </p>
                <p className="text-sm text-slate flex-1 mb-6">{tier.description}</p>
                
                {isCurrent ? (
                  <button disabled className={buttonVariants({ variant: 'outline', className: 'w-full opacity-50 cursor-not-allowed' })}>
                    Current Plan
                  </button>
                ) : tier.level > currentTierLevel ? (
                  <form action="/api/checkout" method="POST">
                    <input type="hidden" name="tierSlug" value={tier.slug} />
                    <button type="submit" className={buttonVariants({ className: 'w-full bg-brass hover:bg-brass/90 text-card' })}>
                      Upgrade
                    </button>
                  </form>
                ) : (
                  <button disabled className={buttonVariants({ variant: 'outline', className: 'w-full opacity-50 cursor-not-allowed' })}>
                    Manage in Portal
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
