import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import {
  MEMBERS_PAGE_SIZE,
  MEMBER_GRID_COLUMNS,
  buildMembersQuery,
  filtersToQueryString,
  parseMemberFilters,
  type MemberGridRow,
} from '@/lib/admin/members-query'
import { MembersFilters } from './members-filters'
import { MembersGrid } from './members-grid'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Members' }

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supabase } = await requireRole(['admin', 'owner'])
  const sp = await searchParams
  const filters = parseMemberFilters(sp)
  const page = Math.max(0, parseInt(typeof sp.page === 'string' ? sp.page : '0', 10) || 0)

  // Server side pagination only, never client side filtering (06, section 3).
  const [{ data, count, error }, { data: branches }, { data: tiers }] = await Promise.all([
    buildMembersQuery(supabase, filters, MEMBER_GRID_COLUMNS)
      .order('created_at', { ascending: false })
      .range(page * MEMBERS_PAGE_SIZE, page * MEMBERS_PAGE_SIZE + MEMBERS_PAGE_SIZE - 1),
    supabase.from('family_branches').select('id, name').order('sort_order'),
    supabase.from('membership_tiers').select('id, name').order('sort_order'),
  ])
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as MemberGridRow[]
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE))
  const qs = filtersToQueryString(filters)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-serif">Members</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate tabular-nums">{total.toLocaleString()} matching</span>
          {/* A plain link: the route handler streams the file and records the export. */}
          <a href={`/admin/members/export${qs ? `?${qs}` : ''}`} className="text-brass hover:underline">
            Export CSV
          </a>
        </div>
      </div>

      <MembersFilters filters={filters} branches={branches ?? []} tiers={tiers ?? []} />

      <MembersGrid rows={rows} branches={branches ?? []} />

      <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
        {page > 0 ? (
          <Link href={`/admin/members?${filtersToQueryString(filters, { page: String(page - 1) })}`} className="text-brass hover:underline">
            Previous page
          </Link>
        ) : (
          <span />
        )}
        <span className="text-slate tabular-nums">
          Page {page + 1} of {pageCount.toLocaleString()}
        </span>
        {page + 1 < pageCount ? (
          <Link href={`/admin/members?${filtersToQueryString(filters, { page: String(page + 1) })}`} className="text-brass hover:underline">
            Next page
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  )
}
