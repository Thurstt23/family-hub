import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { RegisterField } from '@/components/member/register-field'
import { DateStamp, StatusPill, TierBadge, formatCents } from '@/components/admin/marks'
import { one } from '@/lib/admin/members-query'
import { MemberStatusActions, MembershipOverrideForm, RoleControls } from './member-controls'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Member' }

export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, roles, user } = await requireRole(['admin', 'owner'])
  const isOwner = roles.includes('owner')

  const [{ data: profile }, { data: memberRoles }, { data: membership }, { data: payments }, { data: activity }, { data: tiers }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, handle, full_name, display_name, email, phone, birthday, city, country, generation, bio, status, rejection_reason, reviewed_at, created_at, updated_at, branch:family_branches(name)')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('user_roles').select('role, granted_at').eq('user_id', id),
      supabase
        .from('memberships')
        .select('status, current_period_end, cancel_at_period_end, stripe_customer_id, override_note, started_at, tier:membership_tiers(name, level)')
        .eq('user_id', id)
        .maybeSingle(),
      supabase.from('payments').select('id, amount_cents, currency, status, description, receipt_url, paid_at, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('audit_log').select('id, action, meta, created_at, actor:profiles(full_name)').eq('entity_id', id).order('created_at', { ascending: false }).limit(30),
      supabase.from('membership_tiers').select('id, name, level').order('sort_order'),
    ])

  if (!profile) notFound()
  const held = (memberRoles ?? []).map(r => r.role as string)
  const tier = one(membership?.tier)
  const isSelf = id === user.id

  return (
    <div className="space-y-10 max-w-4xl">
      <div className="space-y-2">
        <Link href="/admin/members" className="text-sm text-brass hover:underline">All members</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-serif">{profile.full_name}</h1>
          <StatusPill status={profile.status} />
        </div>
        <p className="text-slate text-sm">
          @{profile.handle} · joined <DateStamp value={profile.created_at} />
          {profile.status === 'active' ? <> · <Link href={`/directory/${profile.handle}`} className="text-brass hover:underline">Directory entry</Link></> : null}
        </p>
      </div>

      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-xl font-serif border-b border-rule pb-2">Profile</h2>
        <dl>
          <RegisterField label="Email">{profile.email ?? '—'}</RegisterField>
          <RegisterField label="Phone">{profile.phone ?? '—'}</RegisterField>
          <RegisterField label="Branch">{one(profile.branch)?.name ?? 'Not chosen yet'}</RegisterField>
          <RegisterField label="Place">{[profile.city, profile.country].filter(Boolean).join(', ') || '—'}</RegisterField>
          <RegisterField label="Generation">{profile.generation ? `G${profile.generation}` : '—'}</RegisterField>
          <RegisterField label="Birthday"><DateStamp value={profile.birthday} /></RegisterField>
          {profile.rejection_reason ? <RegisterField label="Last decline note">{profile.rejection_reason}</RegisterField> : null}
        </dl>
      </section>

      <section aria-labelledby="status-heading" className="space-y-3">
        <h2 id="status-heading" className="text-xl font-serif border-b border-rule pb-2">Status</h2>
        {isSelf ? (
          <p className="text-slate text-sm">You cannot change your own status.</p>
        ) : (
          <MemberStatusActions id={id} name={profile.full_name} status={profile.status} />
        )}
      </section>

      <section aria-labelledby="roles-heading" className="space-y-3">
        <h2 id="roles-heading" className="text-xl font-serif border-b border-rule pb-2">Roles</h2>
        <p className="text-sm">{held.length ? held.join(', ') : 'No roles'}</p>
        {isOwner ? (
          <RoleControls id={id} held={held} isSelf={isSelf} />
        ) : (
          <p className="text-sm text-slate">Only an owner can grant or revoke roles.</p>
        )}
      </section>

      <section aria-labelledby="membership-heading" className="space-y-3">
        <h2 id="membership-heading" className="text-xl font-serif border-b border-rule pb-2">Membership</h2>
        <dl>
          <RegisterField label="Tier">{tier ? <TierBadge name={tier.name} level={tier.level} /> : 'Free'}</RegisterField>
          <RegisterField label="Status">{membership?.status ?? '—'}</RegisterField>
          <RegisterField label="Ends"><DateStamp value={membership?.current_period_end} />{membership?.cancel_at_period_end ? ' (will not renew)' : ''}</RegisterField>
          {membership?.override_note ? <RegisterField label="Override note">{membership.override_note}</RegisterField> : null}
          {membership?.stripe_customer_id ? (
            <RegisterField label="Stripe customer">
              <a
                href={`https://dashboard.stripe.com/customers/${membership.stripe_customer_id}`}
                className="text-brass hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {membership.stripe_customer_id}
              </a>
            </RegisterField>
          ) : null}
        </dl>
        <MembershipOverrideForm id={id} tiers={(tiers ?? []).filter(t => t.level > 0)} />
      </section>

      <section aria-labelledby="payments-heading" className="space-y-3">
        <h2 id="payments-heading" className="text-xl font-serif border-b border-rule pb-2">Payments</h2>
        {payments?.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-slate">
              <tr>
                <th scope="col" className="py-2 font-medium">Date</th>
                <th scope="col" className="py-2 font-medium">Amount</th>
                <th scope="col" className="py-2 font-medium">Status</th>
                <th scope="col" className="py-2 font-medium"><span className="sr-only">Receipt</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="py-2"><DateStamp value={p.paid_at ?? p.created_at} /></td>
                  <td className="py-2 tabular-nums text-mulberry">{formatCents(p.amount_cents, p.currency)}</td>
                  <td className="py-2">{p.status}</td>
                  <td className="py-2 text-right">
                    {p.receipt_url ? <a href={p.receipt_url} className="text-brass hover:underline" target="_blank" rel="noreferrer">Receipt</a> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate text-sm">No payments recorded.</p>
        )}
        <p className="text-sm text-slate">Refunds are issued from the Stripe dashboard. See the handover README.</p>
      </section>

      <section aria-labelledby="activity-heading" className="space-y-3">
        <h2 id="activity-heading" className="text-xl font-serif border-b border-rule pb-2">Activity</h2>
        {activity?.length ? (
          <ul className="divide-y divide-rule text-sm">
            {activity.map(a => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <code className="text-xs">{a.action}</code>
                  <span className="text-slate"> by {one(a.actor)?.full_name ?? 'system'}</span>
                </span>
                <DateStamp value={a.created_at} withTime className="text-slate" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate text-sm">Nothing recorded yet.</p>
        )}
      </section>
    </div>
  )
}
