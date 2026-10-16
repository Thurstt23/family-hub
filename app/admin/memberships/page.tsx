import Link from 'next/link'
import { addDays } from 'date-fns'
import { requireRole } from '@/lib/auth/guards'
import { DateStamp, TierBadge, formatCents } from '@/components/admin/marks'
import { one } from '@/lib/admin/members-query'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Memberships' }

type Row = {
  user_id: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  override_note: string | null
  profile: { full_name: string } | { full_name: string }[] | null
  tier: { name: string; level: number } | { name: string; level: number }[] | null
}

const SELECT = 'user_id, status, current_period_end, cancel_at_period_end, override_note, profile:profiles(full_name), tier:membership_tiers!inner(name, level)'

function MemberList({ rows, empty }: { rows: Row[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate">{empty}</p>
  return (
    <ul className="divide-y divide-rule text-sm">
      {rows.map(r => {
        const tier = one(r.tier)
        return (
          <li key={r.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <Link href={`/admin/members/${r.user_id}`} className="font-medium hover:underline">
              {one(r.profile)?.full_name ?? 'Unknown member'}
            </Link>
            <span className="flex items-center gap-3">
              {tier ? <TierBadge name={tier.name} level={tier.level} /> : null}
              {r.override_note ? <span className="text-xs text-slate">manual</span> : null}
              <DateStamp value={r.current_period_end} className="text-slate" />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default async function MembershipsPage() {
  const { supabase } = await requireRole(['admin', 'owner'])
  const now = new Date()
  const in30 = addDays(now, 30)

  const { data: tiers } = await supabase.from('membership_tiers').select('id, name, level, price_cents, billing_interval').order('sort_order')

  const [distribution, { data: expiring }, { data: pastDue }, { data: recent }] = await Promise.all([
    Promise.all(
      (tiers ?? []).map(async t => {
        const { count } = await supabase
          .from('memberships')
          .select('id', { count: 'exact', head: true })
          .eq('tier_id', t.id)
          .in('status', ['active', 'trialing'])
        return { ...t, count: count ?? 0 }
      })
    ),
    supabase
      .from('memberships')
      .select(SELECT)
      .in('status', ['active', 'trialing'])
      .gt('tier.level', 0)
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', in30.toISOString())
      .order('current_period_end')
      .limit(100),
    supabase.from('memberships').select(SELECT).eq('status', 'past_due').order('updated_at', { ascending: false }).limit(100),
    supabase
      .from('payments')
      .select('id, user_id, amount_cents, currency, status, paid_at, created_at, profile:profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const paidTotal = distribution.filter(t => t.level > 0).reduce((n, t) => n + t.count, 0)

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-serif">Memberships</h1>

      <section aria-labelledby="dist-heading" className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <h2 id="dist-heading" className="text-xl font-serif">Tier distribution</h2>
          <span className="text-sm text-slate tabular-nums">{paidTotal.toLocaleString()} paid</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-slate">
            <tr>
              <th scope="col" className="py-2 font-medium">Tier</th>
              <th scope="col" className="py-2 font-medium">Price</th>
              <th scope="col" className="py-2 font-medium text-right">Members</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {distribution.map(t => (
              <tr key={t.id}>
                <td className="py-2"><TierBadge name={t.name} level={t.level} /></td>
                <td className="py-2 tabular-nums">
                  {t.price_cents ? `${formatCents(t.price_cents)}${t.billing_interval === 'year' ? ' a year' : ' once'}` : '—'}
                </td>
                <td className="py-2 text-right tabular-nums">
                  <Link href={`/admin/members?tier=${t.id}`} className="hover:underline">{t.count.toLocaleString()}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="expiring-heading" className="space-y-3">
          <h2 id="expiring-heading" className="text-xl font-serif border-b border-rule pb-2">Ending in the next 30 days</h2>
          <MemberList rows={(expiring ?? []) as unknown as Row[]} empty="No paid membership ends in the next 30 days." />
        </section>
        <section aria-labelledby="pastdue-heading" className="space-y-3">
          <h2 id="pastdue-heading" className="text-xl font-serif border-b border-rule pb-2">Past due</h2>
          <MemberList rows={(pastDue ?? []) as unknown as Row[]} empty="No one is past due." />
        </section>
      </div>

      <section aria-labelledby="payments-heading" className="space-y-3">
        <h2 id="payments-heading" className="text-xl font-serif border-b border-rule pb-2">Recent payments</h2>
        {recent?.length ? (
          <ul className="divide-y divide-rule text-sm">
            {recent.map(p => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                {p.user_id ? (
                  <Link href={`/admin/members/${p.user_id}`} className="font-medium hover:underline">
                    {one(p.profile)?.full_name ?? 'Unknown member'}
                  </Link>
                ) : (
                  <span>Unknown member</span>
                )}
                <span className="flex items-center gap-3">
                  <span className={p.status === 'failed' ? 'text-clay' : 'text-slate'}>{p.status}</span>
                  <span className="tabular-nums text-mulberry">{formatCents(p.amount_cents, p.currency)}</span>
                  <DateStamp value={p.paid_at ?? p.created_at} className="text-slate" />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate">No payments yet.</p>
        )}
      </section>
    </div>
  )
}
