import { requireActiveMember } from '@/lib/auth/guards'
import { IndexRow } from '@/components/member/index-row'
import { EmptyState } from '@/components/member/empty-state'
import { DirectoryFilters } from '@/components/member/directory-filters'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 24

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { supabase } = await requireActiveMember()
  const params = await searchParams
  
  const search = typeof params.search === 'string' ? params.search : ''
  const branchId = typeof params.branch === 'string' ? params.branch : ''
  const city = typeof params.city === 'string' ? params.city : ''
  const generation = typeof params.generation === 'string' ? params.generation : ''
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 0

  let q = supabase
    .from('profiles')
    .select('id, handle, full_name, avatar_url, city, generation, family_branches(name)', { count: 'estimated' })
    .eq('status', 'active')

  if (search) q = q.textSearch('search_vector', search, { type: 'websearch' })
  if (branchId) q = q.eq('branch_id', branchId)
  if (city) q = q.ilike('city', `%${city}%`)
  if (generation) q = q.eq('generation', parseInt(generation, 10))

  const { data: profiles, count, error } = await q
    .order('full_name', { ascending: true })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (error) {
    throw error
  }
  
  const { data: branches } = await supabase
    .from('family_branches')
    .select('id, name')
    .order('sort_order')
    
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-serif">Directory</h1>
        {count !== null && (
          <p className="text-sm text-slate tabular-nums">{count.toLocaleString()} members</p>
        )}
      </div>

      <DirectoryFilters branches={branches || []} />

      {!profiles?.length ? (
        <EmptyState
          title="No one matches that."
          description="Try a surname or a city."
          action={<Link href="/directory" className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-8 px-2.5 hover:bg-muted hover:text-foreground">Clear filters</Link>}
        />
      ) : (
        <div className="flex flex-col">
          <div className="border-t border-rule">
            {profiles.map(p => {
              const branchName = (p.family_branches as any)?.name || ''
              return (
                <IndexRow key={p.id} href={`/directory/${p.handle}`}>
                  <div className="flex items-center gap-4 py-3 w-full px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.avatar_url || ''} alt={p.full_name} sizes="32px" />
                      <AvatarFallback className="bg-paper text-ink border border-rule text-sm">
                        {p.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.full_name}</p>
                      <p className="text-sm text-slate truncate sm:hidden">
                        {branchName}
                      </p>
                    </div>
                    
                    <div className="hidden sm:block w-40 truncate text-sm text-slate">
                      {branchName}
                    </div>
                    <div className="hidden sm:block w-32 truncate text-sm text-slate">
                      {p.city}
                    </div>
                    <div className="hidden sm:block w-16 text-sm text-slate tabular-nums text-right">
                      {p.generation ? `G${p.generation}` : ''}
                    </div>
                  </div>
                </IndexRow>
              )
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 pt-4">
        {page > 0 && (
          <Link 
            href={`/directory?page=${page - 1}&search=${search}&branch=${branchId}&city=${city}&generation=${generation}`}
            className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-8 px-2.5 hover:bg-muted hover:text-foreground"
          >
            Previous
          </Link>
        )}
        {count !== null && count > (page + 1) * PAGE_SIZE && (
          <Link 
            href={`/directory?page=${page + 1}&search=${search}&branch=${branchId}&city=${city}&generation=${generation}`}
            className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-8 px-2.5 hover:bg-muted hover:text-foreground"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  )
}
