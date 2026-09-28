import { requireActiveMember } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export async function TierGate({ requiredLevel, tierName, children }: { requiredLevel: number, tierName: string, children: React.ReactNode }) {
  const supabase = await createClient()
  const { user } = await requireActiveMember()

  const { data: membership } = await supabase
    .from('memberships')
    .select('tier:membership_tiers(level)')
    .eq('user_id', user.id)
    .single()

  const currentLevel = Array.isArray(membership?.tier) ? membership?.tier[0]?.level : membership?.tier?.level || 0

  if (currentLevel >= requiredLevel) {
    return <>{children}</>
  }

  return (
    <div className="border border-rule bg-card rounded-md p-8 text-center space-y-4 max-w-md mx-auto my-12">
      <h3 className="text-xl font-serif">Member Exclusive</h3>
      <p className="text-slate text-sm">
        This content is exclusively available to members on the <span className="font-medium text-ink">{tierName}</span> plan or higher.
      </p>
      <div className="pt-4">
        <Link href="/me/membership" className={buttonVariants({ className: 'bg-brass hover:bg-brass/90 text-card' })}>
          Upgrade Membership
        </Link>
      </div>
    </div>
  )
}
