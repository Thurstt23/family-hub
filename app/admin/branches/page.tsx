import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { BranchEditor, StewardControls } from './branch-forms'
import { plural } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Branches' }

type Branch = { id: string; name: string; slug: string; description: string | null; parent_id: string | null; sort_order: number }
type StewardRow = { user_id: string; branch_id: string; profile: { full_name: string; handle: string } | { full_name: string; handle: string }[] | null }

export default async function BranchesAdminPage() {
  const { supabase, roles } = await requireRole(['admin', 'owner'])
  const isOwner = roles.includes('owner')

  const [{ data: branches }, { data: stewards }, { data: counts }] = await Promise.all([
    supabase.from('family_branches').select('id, name, slug, description, parent_id, sort_order').order('sort_order'),
    supabase.from('branch_stewards').select('user_id, branch_id, profile:profiles(full_name, handle)'),
    supabase.rpc('branch_member_counts'),
  ])

  const all = (branches ?? []) as Branch[]
  const countBy = new Map((counts ?? []).map((c: { branch_id: string; member_count: number }) => [c.branch_id, c.member_count]))
  const stewardsBy = new Map<string, { user_id: string; full_name: string; handle: string }[]>()
  for (const s of (stewards ?? []) as unknown as StewardRow[]) {
    const p = Array.isArray(s.profile) ? s.profile[0] : s.profile
    if (!p) continue
    stewardsBy.set(s.branch_id, [...(stewardsBy.get(s.branch_id) ?? []), { user_id: s.user_id, ...p }])
  }

  // Two level tree: roots in sort order, each followed by its children.
  const roots = all.filter(b => !b.parent_id || !all.some(p => p.id === b.parent_id))
  const ordered = roots.flatMap(r => [{ ...r, depth: 0 }, ...all.filter(c => c.parent_id === r.id).map(c => ({ ...c, depth: 1 }))])
  const parents = roots.map(r => ({ id: r.id, name: r.name }))

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-3xl font-serif">Branches</h1>
        <p className="text-slate">
          {isOwner ? 'Edit the branch tree and choose who stewards each branch.' : 'Edit the branch tree. Only an owner can assign stewards.'}
        </p>
      </div>

      <ol className="border-t border-rule">
        {ordered.map(b => (
          <li key={b.id} className={`border-b border-rule py-4 ${b.depth ? 'pl-6 sm:pl-10' : ''}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-medium">
                {b.depth ? <span aria-hidden="true" className="text-slate mr-2">└</span> : null}
                {b.name}
              </h2>
              <span className="text-sm text-slate tabular-nums">
                <Link href={`/admin/members?branch=${b.id}`} className="hover:underline">{plural(Number(countBy.get(b.id) ?? 0), 'active member')}</Link>
              </span>
            </div>
            {b.description ? <p className="text-sm text-slate">{b.description}</p> : null}
            <p className="mt-1 text-sm">
              Stewards:{' '}
              {stewardsBy.get(b.id)?.length
                ? stewardsBy.get(b.id)!.map(s => s.full_name).join(', ')
                : <span className="text-slate">none yet, so only admins can approve this branch</span>}
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <BranchEditor branch={b} parents={parents.filter(p => p.id !== b.id)} />
              {isOwner ? <StewardControls branchId={b.id} stewards={stewardsBy.get(b.id) ?? []} /> : null}
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="new-branch" className="space-y-3">
        <h2 id="new-branch" className="text-xl font-serif">Add a branch</h2>
        <BranchEditor branch={null} parents={parents} />
      </section>
    </div>
  )
}
