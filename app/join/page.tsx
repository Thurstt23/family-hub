import { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { buttonVariants } from '@/components/ui/button'
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
  if (t.price_cents === 0) return 'Free'
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(t.price_cents / 100)
  return t.billing_interval === 'one_time' ? `${amount} once` : `${amount} a year`
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

      <main id="main" className="flex-1 py-24 px-6 lg:px-12 max-w-4xl mx-auto w-full space-y-16">
        <div className="space-y-6 text-center max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl md:text-5xl font-medium">{site.join.title}</h1>
          <p className="text-xl text-slate leading-relaxed">{site.join.intro}</p>
        </div>

        <div className="p-8 border border-border bg-card space-y-6 max-w-2xl mx-auto">
          <h2 className="font-serif text-2xl">How to join</h2>
          <ol className="list-decimal pl-5 space-y-3">
            {site.join.steps.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="pt-2">
            <Link href="/signup" className={buttonVariants({ variant: 'default', className: 'w-full rounded-none h-12 text-base' })}>
              Join the register
            </Link>
          </div>
          <p className="text-sm text-slate text-center">
            Already have an account? <Link href="/login" className="text-ink underline decoration-brass underline-offset-4">Sign in</Link>
          </p>
        </div>

        {tiers.length ? (
          <section aria-labelledby="tiers-heading" className="space-y-6">
            <div className="space-y-2 max-w-2xl">
              <h2 id="tiers-heading" className="font-serif text-3xl">Memberships</h2>
              <p className="text-slate">{site.join.membershipIntro}</p>
            </div>
            <ul className="divide-y divide-rule border-y border-rule">
              {tiers.map(t => (
                <li key={t.slug} className="grid gap-2 py-5 sm:grid-cols-[12rem_1fr]">
                  <div>
                    <p className="font-medium text-lg">{t.name}</p>
                    <p className={`tabular-nums ${t.level > 0 ? 'text-mulberry' : 'text-slate'}`}>{price(t)}</p>
                  </div>
                  <div className="space-y-1">
                    {t.description ? <p>{t.description}</p> : null}
                    {Array.isArray(t.benefits) && t.benefits.length ? (
                      <ul className="list-disc pl-5 text-slate">
                        {(t.benefits as string[]).map(b => <li key={b}>{b}</li>)}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  )
}
