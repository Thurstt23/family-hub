import Link from 'next/link'
import Image from 'next/image'
import { site } from '@/content/site'
import { formatLongDate } from '@/lib/dates'
import { createClient } from '@/lib/supabase/public'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { Botanical } from '@/components/illustrations/botanical'
import { Ledger } from '@/components/illustrations/ledger'
import { FamilyTree, type TreeBranch } from '@/components/illustrations/family-tree'
import { plural } from '@/lib/utils'

// Revalidate hourly
export const revalidate = 3600

const primaryOnInk =
  'inline-flex h-12 items-center justify-center rounded-sm bg-brass-light px-7 text-base font-medium text-ink transition-colors hover:bg-paper'
const secondaryOnInk =
  'inline-flex h-12 items-center justify-center rounded-sm border border-paper/30 px-7 text-base font-medium text-paper transition-colors hover:border-paper hover:bg-paper/5'

export default async function HomePage() {
  const supabase = createClient()

  // Active member count. `profiles` has no anon read policy (03, section 6),
  // so this goes through a security definer RPC rather than a direct query.
  const [{ data: memberCount }, { data: nextEvent }, { data: branches }, { data: branchCounts }] = await Promise.all([
    supabase.rpc('active_member_count'),
    supabase
      .from('events')
      .select('title, slug, starts_at, location_name')
      .eq('visibility', 'public')
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('family_branches').select('id, name, description, parent_id').order('sort_order'),
    supabase.rpc('branch_member_counts'),
  ])

  const countByBranch = new Map<string, number>(
    (branchCounts ?? []).map((row: { branch_id: string; member_count: number }) => [row.branch_id, Number(row.member_count)])
  )
  const tree: TreeBranch[] = (branches ?? []).map(b => ({ ...b, count: countByBranch.get(b.id) ?? 0 }))
  const [titleLead, titleAccent] = site.home.heroTitle
  const hasPhoto = Boolean(site.home.heroImage.src)

  const figures = [
    { label: 'Branches', value: tree.length },
    { label: 'Generations', value: site.home.generations },
    { label: 'Members', value: Number(memberCount ?? 0) },
  ]

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader tone="dark" />

      <main id="main" className="flex-1">
        {/* ------------------------------------------------------------ hero */}
        <section className="grain relative overflow-hidden bg-ink text-paper">
          {hasPhoto ? (
            <>
              <Image src={site.home.heroImage.src!} alt={site.home.heroImage.alt} fill priority sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-ink/55" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            </>
          ) : null}

          {!hasPhoto ? (
            <Botanical className="pointer-events-none absolute -right-20 top-6 h-[340px] w-auto text-brass-light/15 md:hidden" />
          ) : null}
          <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pt-16 pb-16 md:pt-24 lg:grid-cols-12 lg:px-12 lg:pb-24">
            <div className="flex flex-col justify-end lg:col-span-8">
              <p className="flex items-center gap-3 text-sm text-paper/75">
                <span aria-hidden="true" className="h-px w-10 bg-brass-light" />
                {site.home.heroNote}
              </p>
              <h1 className="mt-7 font-serif font-medium leading-[0.98] tracking-[-0.025em] text-[clamp(2.75rem,6.2vw,6rem)]">
                <span className="lg:whitespace-nowrap">{titleLead}</span>
                <br />
                <em className="font-normal text-brass-light">{titleAccent}</em>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-paper/80 md:text-xl">{site.tagline}</p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/join" className={primaryOnInk}>Join the register</Link>
                <Link href="/events" className={secondaryOnInk}>See the gatherings</Link>
              </div>
            </div>

            {!hasPhoto ? (
              <div className="relative hidden md:block lg:col-span-4" aria-hidden="true">
                <div className="absolute -inset-10 rounded-full bg-brass-light/5 blur-3xl" />
                <Botanical animated className="relative ml-auto h-[460px] w-auto text-brass-light/85 lg:h-[560px]" />
              </div>
            ) : null}
          </div>

          {/* next gathering, set like a ledger line */}
          <div className="relative border-t border-paper/15">
            <div className="settle-in mx-auto grid max-w-7xl items-baseline gap-x-8 gap-y-2 px-6 py-7 sm:grid-cols-[10rem_1fr_auto] lg:px-12">
              <p className="text-sm text-paper/65">Next gathering</p>
              {nextEvent ? (
                <>
                  <p className="font-serif text-2xl md:text-3xl">
                    <span className="tabular-nums">{formatLongDate(nextEvent.starts_at)}</span>
                    <span aria-hidden="true" className="mx-3 text-paper/35">·</span>
                    {nextEvent.location_name}
                  </p>
                  <Link href={`/events/${nextEvent.slug}`} className="text-brass-light underline-offset-4 hover:underline">
                    Details and RSVP <span aria-hidden="true">→</span>
                  </Link>
                </>
              ) : (
                <p className="font-serif text-2xl text-paper/70 md:text-3xl">Date to be announced</p>
              )}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- figures */}
        <section aria-label="The register in figures" className="border-b border-rule bg-paper">
          <dl className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-rule px-2 sm:px-6 lg:px-12">
            {figures.map(f => (
              <div key={f.label} className="px-3 py-10 sm:px-8 md:py-14">
                <dt className="text-sm text-slate">{f.label}</dt>
                <dd className="mt-2 font-serif text-4xl tabular-nums md:text-6xl">{f.value.toLocaleString('en-US')}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ----------------------------------------------------------- story */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-24 lg:grid-cols-12 lg:px-12 lg:py-32">
          <div className="lg:col-span-6">
            <h2 className="font-serif text-4xl font-medium leading-tight tracking-tight md:text-5xl">{site.home.storyHeading}</h2>
            <div className="mt-8 max-w-[60ch] space-y-6 text-lg leading-relaxed [&>p:first-child]:first-letter:float-left [&>p:first-child]:first-letter:mr-3 [&>p:first-child]:first-letter:font-serif [&>p:first-child]:first-letter:text-7xl [&>p:first-child]:first-letter:leading-[0.85] [&>p:first-child]:first-letter:text-brass">
              {site.home.story.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <Link href="/about" className="mt-8 inline-flex items-center gap-2 font-medium underline decoration-brass decoration-2 underline-offset-8 hover:text-brass">
              Read the family history <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="lg:col-span-6">
            <Ledger className="w-full text-ink/75" />
          </div>
        </section>

        {/* -------------------------------------------------------- branches */}
        <section className="grain border-y border-rule bg-paper-deep">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-12">
            <div className="max-w-2xl">
              <h2 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">{site.home.branchesHeading}</h2>
              <p className="mt-5 text-lg leading-relaxed text-slate">{site.home.branchesIntro}</p>
            </div>

            {tree.length ? (
              <>
                <div className="mt-16 hidden md:block">
                  <FamilyTree branches={tree} rootLabel={site.familyName} />
                </div>
                <ul className="mt-10 divide-y divide-rule border-y border-rule md:hidden">
                  {tree.map(b => (
                    <li key={b.id} className={`flex items-baseline justify-between gap-4 py-4 ${b.parent_id ? 'pl-5' : ''}`}>
                      <span className={b.parent_id ? 'font-serif text-lg' : 'font-serif text-xl'}>{b.name}</span>
                      <span className="text-sm tabular-nums text-slate">{plural(b.count, 'member')}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-10 text-slate">The branches are being set up.</p>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------ join */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">{site.home.joinHeading}</h2>
            <Link href="/join" className="font-medium underline decoration-brass decoration-2 underline-offset-8 hover:text-brass">
              How joining works <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ol className="mt-12 grid gap-10 border-t border-rule pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {site.join.steps.map((step, i) => (
              <li key={step} className="space-y-3">
                <span className="block font-serif text-5xl italic text-brass tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <p className="max-w-[28ch] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ----------------------------------------------------------- quote */}
        <section className="grain relative overflow-hidden bg-ink text-paper">
          <Botanical className="pointer-events-none absolute -bottom-24 -left-16 h-[420px] w-auto text-brass-light/15 md:h-[560px]" />
          <Botanical className="pointer-events-none absolute -top-28 -right-10 h-[380px] w-auto rotate-180 text-brass-light/10 md:h-[520px]" />
          <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
            <blockquote className="font-serif text-3xl italic leading-snug md:text-5xl">
              &ldquo;{site.home.quote.text}&rdquo;
            </blockquote>
            <p className="mt-6 text-sm text-paper/65">{site.home.quote.attribution}</p>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <Link href="/join" className={primaryOnInk}>Join the register</Link>
              <Link href="/login" className={secondaryOnInk}>Sign in</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
