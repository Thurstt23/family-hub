import { Metadata } from 'next'
import { formatDayNumber, formatMonthYear, formatWeekday } from '@/lib/dates'
import { PageIntro } from '@/components/marketing/page-intro'
import { Botanical } from '@/components/illustrations/botanical'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { site } from '@/content/site'

// We cannot use static revalidation if we rely on user cookies for RLS
// Exporting dynamic instead.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Events',
  description: `Upcoming gatherings for the ${site.familyNameInSentence} family.`,
}

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: events } = await supabase
    .from('events')
    .select('id, slug, title, description, starts_at, ends_at, location_name, location_url, visibility')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: events?.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Event',
        name: event.title,
        startDate: event.starts_at,
        endDate: event.ends_at || event.starts_at,
        description: event.description,
        location: {
          '@type': 'Place',
          name: event.location_name,
          ...(event.location_url ? { url: event.location_url } : {})
        }
      }
    })) || []
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader current="/events" />

      <main id="main" className="flex-1">
        <PageIntro
          title="Gatherings"
          lead="Reunions, anniversaries and the smaller days in between. Members can reply from each event's page."
        />

        <div className="mx-auto max-w-5xl px-6 py-16 lg:px-12 lg:py-20">
          {events && events.length > 0 ? (
            <ol className="divide-y divide-rule border-y border-rule">
              {events.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.slug}`}
                    className="group grid gap-6 py-10 transition-colors hover:bg-paper-deep/60 sm:grid-cols-[9rem_1fr_auto] sm:items-start sm:px-4"
                  >
                    <div className="flex items-baseline gap-3 sm:block">
                      <span className="block font-serif text-6xl leading-none tabular-nums text-ink">{formatDayNumber(event.starts_at)}</span>
                      <span className="block text-sm text-slate sm:mt-2">{formatMonthYear(event.starts_at)}</span>
                      <span className="block text-sm text-slate">{formatWeekday(event.starts_at)}</span>
                    </div>
                    <div className="space-y-3">
                      <h2 className="font-serif text-3xl font-medium leading-tight group-hover:text-brass">{event.title}</h2>
                      {event.location_name ? <p className="text-slate">{event.location_name}</p> : null}
                      {event.description ? (
                        <p className="max-w-[60ch] leading-relaxed line-clamp-3">{event.description}</p>
                      ) : null}
                    </div>
                    <span className="self-center text-sm font-medium underline decoration-brass decoration-2 underline-offset-8">
                      Details <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <Botanical className="h-48 w-auto text-brass/40" />
              <h2 className="mt-8 font-serif text-3xl">No gatherings announced yet</h2>
              <p className="mt-3 max-w-md text-slate">
                {user ? 'New gatherings appear here as soon as a steward announces them.' : 'Public gatherings appear here. Members see every event once they sign in.'}
              </p>
              {!user ? (
                <Link href="/login" className="mt-8 inline-flex h-11 items-center rounded-sm bg-ink px-6 font-medium text-paper transition-colors hover:bg-brass">
                  Sign in
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
