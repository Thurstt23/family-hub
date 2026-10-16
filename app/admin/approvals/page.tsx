import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { DateStamp } from '@/components/admin/marks'
import { EmptyState } from '@/components/member/empty-state'
import { ApprovalActions } from './approval-actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Approvals' }

const PAGE = 50

type PendingRow = {
  id: string
  full_name: string
  email: string | null
  city: string | null
  country: string | null
  bio: string | null
  created_at: string
  rejection_reason: string | null
  reviewed_at: string | null
  branch: { name: string } | null
}

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, roles } = await requireRole(['steward', 'admin', 'owner'])
  const isAdmin = roles.includes('admin') || roles.includes('owner')
  const page = Math.max(0, parseInt((await searchParams).page ?? '0', 10) || 0)

  // No branch filter here on purpose: RLS returns only the branches a steward
  // looks after, and everything for admins (06, section 6).
  const { data, count, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, city, country, bio, created_at, rejection_reason, reviewed_at, branch:family_branches(name)', { count: 'exact' })
    .eq('status', 'pending')
    .not('branch_id', 'is', null)
    .order('created_at', { ascending: true })
    .range(page * PAGE, page * PAGE + PAGE - 1)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as PendingRow[]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-serif">Approvals</h1>
        <p className="text-sm text-slate tabular-nums">
          {(count ?? 0).toLocaleString()} waiting{isAdmin ? '' : ' in your branches'}, oldest first
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="The queue is empty."
          description="New requests appear here once a member finishes onboarding."
          action={<Link href="/admin" className="text-brass hover:underline">Back to the dashboard</Link>}
        />
      ) : (
        <ol className="border-t border-rule">
          {rows.map(r => (
            <li key={r.id} className="grid gap-4 border-b border-rule py-5 md:grid-cols-[1fr_auto]">
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-lg">
                  {isAdmin ? <Link href={`/admin/members/${r.id}`} className="hover:underline">{r.full_name}</Link> : r.full_name}
                </p>
                <p className="text-sm text-slate">
                  {[r.branch?.name, [r.city, r.country].filter(Boolean).join(', '), r.email].filter(Boolean).join(' · ')}
                </p>
                <p className="text-sm text-slate">
                  Requested <DateStamp value={r.created_at} />
                </p>
                {r.bio ? <p className="text-sm max-w-[68ch]">{r.bio}</p> : null}
                {r.rejection_reason ? (
                  <p className="text-sm text-clay">
                    Previously declined{r.reviewed_at ? <> on <DateStamp value={r.reviewed_at} /></> : null}: {r.rejection_reason}
                  </p>
                ) : null}
              </div>
              <ApprovalActions id={r.id} name={r.full_name} />
            </li>
          ))}
        </ol>
      )}

      <nav aria-label="Pagination" className="flex justify-between text-sm">
        {page > 0 ? <Link href={`/admin/approvals?page=${page - 1}`} className="text-brass hover:underline">Previous page</Link> : <span />}
        {(count ?? 0) > (page + 1) * PAGE ? <Link href={`/admin/approvals?page=${page + 1}`} className="text-brass hover:underline">Next page</Link> : null}
      </nav>
    </div>
  )
}
