'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import type { MemberFilters } from '@/lib/admin/members-query'

type Option = { id: string; name: string }

// A GET form, so it works without JavaScript. With JavaScript, selects apply
// at once and the search box applies after 300ms of quiet (06, section 3).
export function MembersFilters({ filters, branches, tiers }: { filters: MemberFilters; branches: Option[]; tiers: Option[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const formRef = useRef<HTMLFormElement>(null)
  const [search, setSearch] = useState(filters.search ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function apply() {
    const form = formRef.current
    if (!form) return
    const params = new URLSearchParams()
    for (const [k, v] of new FormData(form)) if (typeof v === 'string' && v) params.set(k, v)
    router.replace(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    if ((filters.search ?? '') === search) return
    timer.current = setTimeout(apply, 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <form
      ref={formRef}
      method="get"
      onSubmit={e => {
        e.preventDefault()
        apply()
      }}
      className="grid gap-3 rounded-md border border-rule bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="sm:col-span-2">
        <label htmlFor="f-search" className="sr-only">Search names and cities</label>
        <Input id="f-search" name="search" placeholder="Search names and cities" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Filter label="Status" name="status" value={filters.status} onChange={apply}
        options={['pending', 'active', 'suspended', 'archived'].map(s => ({ id: s, name: s[0]!.toUpperCase() + s.slice(1) }))} />
      <Filter label="Role" name="role" value={filters.role} onChange={apply}
        options={['member', 'steward', 'admin', 'owner'].map(s => ({ id: s, name: s[0]!.toUpperCase() + s.slice(1) }))} />
      <Filter label="Tier" name="tier" value={filters.tier} onChange={apply} options={tiers} />
      <Filter label="Branch" name="branch" value={filters.branch} onChange={apply} options={branches} />
      <div>
        <label htmlFor="f-city" className="sr-only">City</label>
        <Input id="f-city" name="city" placeholder="City" defaultValue={filters.city} onBlur={apply} />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="f-from" className="text-sm text-slate shrink-0">Joined</label>
        <Input id="f-from" type="date" name="from" defaultValue={filters.from} onChange={apply} aria-label="Joined from" />
        <Input id="f-to" type="date" name="to" defaultValue={filters.to} onChange={apply} aria-label="Joined to" />
      </div>
      <div className="flex gap-2 lg:col-span-4 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            for (const el of Array.from(formRef.current?.elements ?? [])) {
              if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.value = ''
            }
            setSearch('')
            router.replace(pathname)
          }}
        >
          Clear filters
        </Button>
        <Button type="submit">Apply filters</Button>
      </div>
    </form>
  )
}

function Filter({ label, name, value, options, onChange }: { label: string; name: string; value?: string; options: Option[]; onChange: () => void }) {
  const id = `f-${name}`
  return (
    <div>
      <label htmlFor={id} className="sr-only">{label}</label>
      <NativeSelect id={id} name={name} defaultValue={value ?? ''} onChange={onChange}>
        <option value="">Any {label.toLowerCase()}</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </NativeSelect>
    </div>
  )
}
