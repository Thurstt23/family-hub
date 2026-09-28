import { requireActiveMember } from '@/lib/auth/guards'
import { notFound } from 'next/navigation'
import { IndexRow } from '@/components/member/index-row'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default async function BranchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { supabase } = await requireActiveMember()
  const { slug } = await params
  
  const { data: branch } = await supabase
    .from('family_branches')
    .select('*')
    .eq('slug', slug)
    .single()
    
  if (!branch) notFound()
  
  const { data: members } = await supabase
    .from('profiles')
    .select('id, handle, full_name, avatar_url, city, generation')
    .eq('branch_id', branch.id)
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif mb-2">{branch.name} Branch</h1>
        {branch.description && <p className="text-slate">{branch.description}</p>}
        <p className="text-sm text-slate tabular-nums mt-2">{members?.length || 0} active members</p>
      </div>

      <div className="border-t border-rule">
        {members?.map(p => (
          <IndexRow key={p.id} href={`/directory/${p.handle}`}>
            <div className="flex items-center gap-4 py-3 px-2 w-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.avatar_url || ''} alt={p.full_name} sizes="32px" />
                <AvatarFallback className="bg-paper text-ink border border-rule text-sm">
                  {p.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.full_name}</p>
              </div>
              
              <div className="w-32 truncate text-sm text-slate hidden sm:block">
                {p.city}
              </div>
              <div className="w-16 text-sm text-slate tabular-nums text-right hidden sm:block">
                {p.generation ? `G${p.generation}` : ''}
              </div>
            </div>
          </IndexRow>
        ))}
      </div>
    </div>
  )
}
