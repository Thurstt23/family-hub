import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { DateStamp, Sparkline, StatusPill, formatCents } from '@/components/admin/marks'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin' }

type Stats = {
  total_members: number
  pending_approvals: number
  paid_members: number | null
  arr_cents: number | null
  signups_30d: { day: string; count: number }[]
  failed_payments_7d: { user_id: string | null; full_name: string | null; amount_cents: number; created_at: string }[] | null
  next_event: { id: string; title: string; slug: string; starts_at: string; capacity: number | null; going: number } | null
  recent_signups: { id: string; full_name: string; handle: string; status: string; created_at: string }[]
}

function Stat({ label, value, href, note }: { label: string; value: React.ReactNode; href?: string; note?: string }) {
  const body = (
    <>
      <dt className="text-sm text-slate">{label}</dt>
      <dd className="mt-1 font-serif text-3xl tabular-nums">{value}</dd>
      {note ? <dd className="mt-1 text-xs text-slate">{note}</dd> : null}
    </>
  )
  return (
    <div className="border-t border-rule pt-3">
      {href ? (
        <Link href={href} className="block rounded-sm hover:bg-black/5 -mx-2 px-2 pb-2">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const { supabase, roles } = await requireRole(['steward', 'admin', 'owner'])
  const isAdmin = roles.includes('admin') || roles.includes('owner')

  const { data, error } = await supabase.rpc('admin_dashboard_stats')
  if (error) throw new Error(error.message)
  const s = data as Stats
  const signupTotal = s.signups_30d.reduce((n, d) => n + d.count, 0)

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-serif">Dashboard</h1>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
        <Stat label="Active members" value={s.total_members.toLocaleString()} href={isAdmin ? '/admin/members?status=active' : undefined} />
        <Stat label="Pending approvals" value={s.pending_approvals.toLocaleString()} href="/admin/approvals" />
        {isAdmin ? (
          <>
            <Stat label="Paid members" value={(s.paid_members ?? 0).toLocaleString()} href="/admin/memberships" />
            <Stat label="Annual recurring revenue" value={formatCents(s.arr_cents)} note="Active annual subscriptions, lifetime excluded" />
          </>
        ) : null}
      </dl>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="signups-heading" className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-rule pb-2">
            <h2 id="signups-heading" className="text-xl font-serif">Signups, last 30 days</h2>
            <span className="text-sm text-slate tabular-nums">{signupTotal}</span>
          </div>
          <Sparkline points={s.signups_30d.map(d => d.count)} label={`${signupTotal} signups in the last 30 days`} />
        </section>

        <section aria-labelledby="event-heading" className="space-y-3">
          <h2 id="event-heading" className="text-xl font-serif border-b border-rule pb-2">Next event</h2>
          {s.next_event ? (
            <div className="space-y-1">
              <Link href={`/admin/content/events/${s.next_event.id}`} className="font-medium hover:underline">
                {s.next_event.title}
              </Link>
              <p className="text-sm text-slate">
                <DateStamp value={s.next_event.starts_at} />
              </p>
              <p className="tabular-nums">
                {s.next_event.going} going, guests included
                {s.next_event.capacity ? ` of ${s.next_event.capacity}` : ''}
              </p>
            </div>
          ) : (
            <p className="text-slate">
              No upcoming event. <Link href="/admin/content/events/new" className="text-brass hover:underline">Create one</Link>.
            </p>
          )}
        </section>

        <section aria-labelledby="recent-heading" className="space-y-3">
          <h2 id="recent-heading" className="text-xl font-serif border-b border-rule pb-2">Recent signups</h2>
          {s.recent_signups.length ? (
            <ul className="divide-y divide-rule">
              {s.recent_signups.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                  {isAdmin ? (
                    <Link href={`/admin/members/${p.id}`} className="font-medium hover:underline truncate">{p.full_name}</Link>
                  ) : (
                    <span className="font-medium truncate">{p.full_name}</span>
                  )}
                  <span className="flex items-center gap-3 shrink-0">
                    <StatusPill status={p.status} />
                    <DateStamp value={p.created_at} className="text-slate" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate">No signups yet.</p>
          )}
        </section>

        {isAdmin ? (
          <section aria-labelledby="failed-heading" className="space-y-3">
            <h2 id="failed-heading" className="text-xl font-serif border-b border-rule pb-2">Payments failed, last 7 days</h2>
            {s.failed_payments_7d?.length ? (
              <ul className="divide-y divide-rule">
                {s.failed_payments_7d.map((f, i) => (
                  <li key={`${f.user_id}-${i}`} className="flex items-center justify-between py-2 text-sm">
                    {f.user_id ? (
                      <Link href={`/admin/members/${f.user_id}`} className="font-medium hover:underline">{f.full_name ?? 'Unknown member'}</Link>
                    ) : (
                      <span>Unknown member</span>
                    )}
                    <span className="tabular-nums text-mulberry">{formatCents(f.amount_cents)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate">No failed payments this week.</p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}
