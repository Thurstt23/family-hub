import Link from 'next/link'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/public'
import { buttonVariants } from '@/components/ui/button'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'

// Revalidate hourly
export const revalidate = 3600

export default async function HomePage() {
  const supabase = createClient()

  // Active member count. `profiles` has no anon read policy (03, section 6),
  // so this goes through a security definer RPC rather than a direct query.
  const { data: memberCount } = await supabase.rpc('active_member_count')

  // Next public event
  const { data: nextEvent } = await supabase
    .from('events')
    .select('title, starts_at, location_name')
    .eq('visibility', 'public')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Branches for the index, with member counts joined in from the RPC above
  const [{ data: branches }, { data: branchCounts }] = await Promise.all([
    supabase
      .from('family_branches')
      .select('id, name, description')
      .order('sort_order'),
    supabase.rpc('branch_member_counts'),
  ])

  const countByBranch = new Map<string, number>(
    (branchCounts ?? []).map((row: { branch_id: string; member_count: number }) => [
      row.branch_id,
      row.member_count,
    ])
  )

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        <section className="relative w-full h-[75vh] min-h-[600px] flex flex-col justify-end p-6 lg:p-12">
          {/* Full bleed archival photograph with ink overlay 40% */}
          <div className="absolute inset-0 bg-ink">
            {/* We use a placeholder div since we don't have the image file, but let's assume it exists */}
            <div className="absolute inset-0 bg-slate/40 opacity-60 mix-blend-multiply" />
            <div className="absolute inset-0 opacity-60 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-4xl space-y-6 text-paper">
            <h1 className="font-serif text-5xl md:text-7xl font-medium leading-tight">
              The Martin Sawyer Family
            </h1>
            <p className="text-xl md:text-2xl max-w-2xl text-paper/90 font-sans">
              Six branches. Four generations. One register.
            </p>

            <div className="pt-8 border-t border-paper/30 mt-8 group">
              <p className="text-sm uppercase tracking-wider text-paper/70 font-medium mb-3">
                Next gathering
              </p>
              {nextEvent ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-4 fade-in duration-1000 fill-mode-both delay-300 motion-reduce:animate-none">
                  <div className="text-2xl md:text-3xl font-serif">
                    {format(new Date(nextEvent.starts_at), 'd MMMM yyyy')} <span className="mx-2 text-brass">.</span> {nextEvent.location_name}
                  </div>
                  <Link href="/events" className={buttonVariants({ variant: 'default', className: "bg-brass hover:bg-brass/90 text-card rounded-none px-8" })}>
                    Join us
                  </Link>
                </div>
              ) : (
                <div className="text-2xl md:text-3xl font-serif text-paper/70 animate-in slide-in-from-bottom-4 fade-in duration-1000 fill-mode-both delay-300 motion-reduce:animate-none">
                  To be announced
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 lg:px-12 max-w-5xl mx-auto w-full space-y-24">
          <div className="prose prose-lg prose-headings:font-serif prose-p:text-ink max-w-[60ch]">
            <p className="text-xl leading-relaxed">
              Since 1961, our family has kept a register of every birth, marriage, and passing.
              What started as a single leather-bound ledger in Savannah has grown into a
              living record connecting hundreds of descendants across the world.
            </p>
            <p className="text-xl leading-relaxed mt-6">
              This digital hub ensures that our history is never lost, our connections
              remain strong, and the next generation knows exactly where they come from.
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex items-end justify-between border-b border-border pb-4">
              <h2 className="text-2xl font-serif">Branches</h2>
              <div className="text-sm text-slate tabular-nums font-medium">
                {(memberCount ?? 0).toLocaleString()} members
              </div>
            </div>

            <div className="divide-y divide-border">
              {branches?.map((branch) => {
                const count = countByBranch.get(branch.id) ?? 0
                return (
                  <Link
                    key={branch.id}
                    href="/join"
                    className="group flex items-center justify-between py-6 hover:bg-black/5 transition-colors -mx-4 px-4 rounded-md"
                  >
                    <div className="flex items-center gap-12 sm:gap-24">
                      <h3 className="text-xl font-medium w-48">{branch.name}</h3>
                      <span className="text-slate hidden sm:inline-block w-48">{branch.description}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="tabular-nums text-slate">{count} members</span>
                      <span className="text-brass group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
