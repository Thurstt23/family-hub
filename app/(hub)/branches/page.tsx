import { requireActiveMember } from '@/lib/auth/guards'
import { IndexRow } from '@/components/member/index-row'

export default async function BranchesPage() {
  const { supabase } = await requireActiveMember()
  
  const { data: branches } = await supabase
    .from('family_branches')
    .select('*, profiles(count)')
    .order('sort_order')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-serif">Family Branches</h1>
      
      <div className="border-t border-rule">
        {branches?.map((b: any) => (
          <IndexRow key={b.id} href={`/branches/${b.slug}`}>
            <div className="flex items-center justify-between py-4 px-2 w-full">
              <div>
                <p className="font-medium">{b.name}</p>
                {b.description && <p className="text-sm text-slate">{b.description}</p>}
              </div>
              <div className="text-sm text-slate tabular-nums">
                {b.profiles[0]?.count || 0} members
              </div>
            </div>
          </IndexRow>
        ))}
      </div>
    </div>
  )
}
