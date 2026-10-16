import { requireRole } from '@/lib/auth/guards'
import { env } from '@/lib/env'
import { RegisterField } from '@/components/member/register-field'
import { TierBadge } from '@/components/admin/marks'
import { TierForm } from './tier-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const { supabase } = await requireRole(['owner'])
  const { data: tiers } = await supabase
    .from('membership_tiers')
    .select('id, slug, name, description, level, price_cents, billing_interval, stripe_price_id, benefits, is_active')
    .order('sort_order')

  const stripeMode = env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'Live' : env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'Test' : 'Not configured'
  const resendReady = env.RESEND_API_KEY.startsWith('re_')

  return (
    <div className="space-y-10 max-w-4xl">
      <h1 className="text-3xl font-serif">Settings</h1>

      <section aria-labelledby="tiers-heading" className="space-y-4">
        <h2 id="tiers-heading" className="text-xl font-serif border-b border-rule pb-2">Tiers and Stripe prices</h2>
        <p className="text-sm text-slate max-w-[68ch]">
          Stripe is the source of truth for money; this table is what members see. After creating a Product and Price in
          Stripe, paste the price id here (or run <code>pnpm stripe:sync</code>). A price that is not
          mapped makes the webhook fail loudly instead of granting the wrong tier.
        </p>
        <ul className="space-y-4">
          {(tiers ?? []).map(t => (
            <li key={t.id} className="rounded-md border border-rule bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <TierBadge name={t.name} level={t.level} />
                <span className="text-sm text-slate">
                  {t.slug} · level {t.level} · {t.billing_interval === 'one_time' ? 'one time' : 'yearly'}
                </span>
                {!t.is_active ? <span className="text-sm text-clay">hidden</span> : null}
              </div>
              <TierForm tier={t} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="email-heading" className="space-y-2">
        <h2 id="email-heading" className="text-xl font-serif border-b border-rule pb-2">Email and payments</h2>
        <dl>
          <RegisterField label="Sender">{env.EMAIL_FROM}</RegisterField>
          <RegisterField label="Resend">{resendReady ? 'API key present' : 'No valid API key, emails are not sent'}</RegisterField>
          <RegisterField label="Stripe mode">{stripeMode}</RegisterField>
          <RegisterField label="Site address">{env.NEXT_PUBLIC_SITE_URL}</RegisterField>
        </dl>
        <p className="text-sm text-slate max-w-[68ch]">
          These come from the hosting environment variables (Vercel, Settings, Environment Variables) so that secrets never
          live in the database. Change them there and redeploy. The weekly announcement digest goes out on Monday mornings;
          members can turn it off from their profile or from the link in every email.
        </p>
      </section>
    </div>
  )
}
