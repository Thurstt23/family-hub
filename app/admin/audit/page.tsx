import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DateStamp } from '@/components/admin/marks'
import { one } from '@/lib/admin/members-query'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Audit log' }

const PAGE = 50

// Known action strings (06, section 4, plus the webhook and cron entries).
const ACTIONS = [
  'member.approve', 'member.reject', 'member.request_info', 'member.suspend', 'member.reinstate', 'member.archive',
  'members.bulk_approve', 'members.bulk_suspend', 'members.bulk_assign_branch', 'members.export',
  'role.grant', 'role.revoke', 'steward.assign', 'steward.unassign',
  'membership.override', 'membership.sync', 'membership.reconcile',
  'content.create', 'content.update', 'content.publish', 'content.unpublish', 'event.create', 'event.update',
  'photo.approve', 'photo.reject', 'comment.remove', 'comment.restore',
  'branch.create', 'branch.update', 'tier.update',
]

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireRole(['admin', 'owner'])
  const sp = await searchParams
  const page = Math.max(0, parseInt(sp.page ?? '0', 10) || 0)
  const actor = sp.actor || ''
  const action = sp.action || ''
  const from = sp.from || ''
  const to = sp.to || ''

  let q = supabase
    .from('audit_log')
    .select('id, action, entity, entity_id, meta, created_at, actor_id, actor:profiles(full_name)', { count: 'estimated' })
  if (actor === 'system') q = q.is('actor_id', null)
  else if (actor) q = q.eq('actor_id', actor)
  if (action) q = q.eq('action', action)
  if (from) q = q.gte('created_at', from)
  if (to) q = q.lte('created_at', `${to}T23:59:59.999Z`)

  const [{ data: rows, count, error }, { data: staff }] = await Promise.all([
    q.order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1),
    supabase
      .from('user_roles')
      .select('user_id, profile:profiles!user_roles_user_id_fkey(full_name)')
      .in('role', ['steward', 'admin', 'owner']),
  ])
  if (error) throw new Error(error.message)

  const staffOptions = new Map<string, string>()
  for (const s of staff ?? []) staffOptions.set(s.user_id, one(s.profile)?.full_name ?? s.user_id)

  const qs = (extra: Record<string, string>) =>
    new URLSearchParams(Object.entries({ actor, action, from, to, ...extra }).filter(([, v]) => v)).toString()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif">Audit log</h1>

      <form method="get" className="grid gap-3 rounded-md border border-rule bg-card p-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <div>
          <label htmlFor="a-actor" className="block text-sm font-medium mb-1.5">Who</label>
          <NativeSelect id="a-actor" name="actor" defaultValue={actor}>
            <option value="">Anyone</option>
            <option value="system">System (webhooks, cron)</option>
            {[...staffOptions].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label htmlFor="a-action" className="block text-sm font-medium mb-1.5">Action</label>
          <NativeSelect id="a-action" name="action" defaultValue={action}>
            <option value="">Any action</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </NativeSelect>
        </div>
        <div>
          <label htmlFor="a-from" className="block text-sm font-medium mb-1.5">From</label>
          <Input id="a-from" type="date" name="from" defaultValue={from} />
        </div>
        <div>
          <label htmlFor="a-to" className="block text-sm font-medium mb-1.5">To</label>
          <Input id="a-to" type="date" name="to" defaultValue={to} />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Filter</Button>
          <Link href="/admin/audit" className="text-sm text-brass hover:underline self-center">Clear</Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border border-rule bg-card">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-rule text-slate">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">When</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Who</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Action</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Target</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule align-top">
            {rows?.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2"><DateStamp value={r.created_at} withTime /></td>
                <td className="px-3 py-2 whitespace-nowrap">{one(r.actor)?.full_name ?? 'System'}</td>
                <td className="px-3 py-2"><code className="text-xs">{r.action}</code></td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.entity === 'profiles' && r.entity_id && /^[0-9a-f-]{36}$/.test(r.entity_id) ? (
                    <Link href={`/admin/members/${r.entity_id}`} className="text-brass hover:underline">member</Link>
                  ) : (
                    <span className="text-slate">{r.entity}{r.entity_id ? ` · ${r.entity_id.slice(0, 12)}` : ''}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.meta && Object.keys(r.meta).length ? (
                    <details>
                      <summary className="cursor-pointer text-slate">Show</summary>
                      <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(r.meta, null, 2)}</pre>
                    </details>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows?.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate">Nothing recorded for these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <nav aria-label="Pagination" className="flex justify-between text-sm">
        {page > 0 ? <Link href={`/admin/audit?${qs({ page: String(page - 1) })}`} className="text-brass hover:underline">Newer</Link> : <span />}
        {(count ?? 0) > (page + 1) * PAGE ? <Link href={`/admin/audit?${qs({ page: String(page + 1) })}`} className="text-brass hover:underline">Older</Link> : null}
      </nav>
    </div>
  )
}
