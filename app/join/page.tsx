import { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { PageIntro } from '@/components/marketing/page-intro'
import { createClient } from '@/lib/supabase/public'
import { site } from '@/content/site'

export const metadata: Metadata = {
  title: site.join.title,
  description: site.join.description,
}

// Tier names, prices and benefits come from membership_tiers (edited in
// Admin, Settings); the wording around them from content/site.ts.
export const revalidate = 3600

type Tier = { slug: string; name: string; description: string | null; level: number; price_cents: number; billing_interval: string; benefits: unknown }

function price(t: Tier) {
  if (t.price_cents === 0) return { amount: 'Free', unit: '' }
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(t.price_cents / 100)
  return { amount, unit: t.billing_interval === 'one_time' ? 'once' : 'a year' }
}

export default async function JoinPage() {
  const { data } = await createClient()
    .from('membership_tiers')
    .select('slug, name, description, level, price_cents, billing_interval, benefits')
    .eq('is_active', true)
    .order('sort_order')
  const tiers = (data ?? []) as Tier[]

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader current="/join" />

      <main id="main" className="flex-1">
        <PageIntro title={site.join.title} lead={site.join.intro}>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/signup" className="inline-flex h-12 items-center rounded-sm bg-ink px-7 text-base font-medium text-paper transition-colors hover:bg-brass">
              Join the register
            </Link>
            <p className="text-slate">
              Already a member? <Link href="/login" className="text-ink underline decoration-brass decoration-2 underline-offset-4">Sign in</Link>
            </p>
          </div>
        </PageIntro>

        <section aria-labelledby="steps-heading" className="mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-24">
          <h2 id="steps-heading" className="font-serif text-4xl font-medium tracking-tight">How it works</h2>
          <ol className="mt-10 grid gap-10 border-t border-rule pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {site.join.steps.map((step, i) => (
              <li key={step} className="space-y-3">
                <span className="block font-serif text-5xl italic text-brass tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <p className="max-w-[28ch] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {tiers.length ? (
          <section aria-labelledby="tiers-heading" className="grain border-t border-rule bg-paper-deep">
            <div className="mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-24">
              <div className="max-w-2xl">
                <h2 id="tiers-heading" className="font-serif text-4xl font-medium tracking-tight">Memberships</h2>
                <p className="mt-4 text-lg leading-relaxed text-slate">{site.join.membershipIntro}</p>
              </div>
              <ul className="mt-12 grid gap-px overflow-hidden rounded-sm border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
                {tiers.map(t => {
                  const p = price(t)
                  const paid = t.level > 0
                  return (
                    <li key={t.slug} className="flex flex-col bg-card p-7">
                      <p className={paid ? 'font-serif text-2xl text-mulberry' : 'font-serif text-2xl'}>{t.name}</p>
                      <p className="mt-4 flex items-baseline gap-2">
                        <span className="font-serif text-4xl tabular-nums">{p.amount}</span>
                        {p.unit ? <span className="text-sm text-slate">{p.unit}</span> : null}
                      </p>
                      {t.description ? <p className="mt-4 text-sm leading-relaxed text-slate">{t.description}</p> : null}
                      {Array.isArray(t.benefits) && t.benefits.length ? (
                        <ul className="mt-5 space-y-2 border-t border-rule pt-5 text-sm">
                          {(t.benefits as string[]).map(b => (
                            <li key={b} className="flex gap-2">
                              <span aria-hidden="true" className={paid ? 'text-mulberry' : 'text-slate'}>—</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              <p className="mt-6 text-sm text-slate">Paid memberships are chosen after your request is approved, from your membership page.</p>
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  )
}
