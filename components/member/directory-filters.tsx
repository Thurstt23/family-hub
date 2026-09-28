'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export function DirectoryFilters({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams()
    
    const search = fd.get('search') as string
    if (search) params.set('search', search)
      
    const branch = fd.get('branch') as string
    if (branch && branch !== 'all') params.set('branch', branch)
      
    const city = fd.get('city') as string
    if (city) params.set('city', city)
      
    const generation = fd.get('generation') as string
    if (generation && generation !== 'all') params.set('generation', generation)

    router.push(`/directory?${params.toString()}`)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-4 items-end sm:items-center bg-card p-4 rounded-md border border-rule">
      <div className="flex-1 w-full relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
        <Input 
          name="search"
          defaultValue={searchParams.get('search') ?? ''}
          placeholder="Search names or cities..." 
          className="pl-9 bg-transparent"
        />
      </div>
      
      <div className="w-full sm:w-40 shrink-0">
        <Select name="branch" defaultValue={searchParams.get('branch') ?? 'all'}>
          <SelectTrigger className="bg-transparent">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="w-full sm:w-32 shrink-0">
        <Select name="generation" defaultValue={searchParams.get('generation') ?? 'all'}>
          <SelectTrigger className="bg-transparent">
            <SelectValue placeholder="Gen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Gens</SelectItem>
            {[1,2,3,4,5,6].map(g => (
              <SelectItem key={g} value={g.toString()}>G{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button type="submit" variant="default" className="w-full sm:w-auto shrink-0">
        Search
      </Button>
    </form>
  )
}
