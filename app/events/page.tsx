import { Metadata } from 'next'
import { format } from 'date-fns'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'

// We cannot use static revalidation if we rely on user cookies for RLS
// Exporting dynamic instead.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Events',
  description: 'Upcoming gatherings for the Martin Sawyer family.',
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

      <main className="flex-1 py-16 px-6 lg:px-12 max-w-4xl mx-auto w-full">
        <div className="flex items-end justify-between border-b border-border pb-6 mb-12">
          <h1 className="font-serif text-4xl md:text-5xl font-medium">Upcoming Events</h1>
        </div>

        {events && events.length > 0 ? (
          <div className="space-y-12">
            {events.map((event) => (
              <article key={event.id} className="group relative">
                <div className="flex flex-col md:flex-row gap-6 md:gap-12">
                  <div className="md:w-1/3 flex flex-col text-slate">
                    <span className="font-serif text-2xl text-ink">
                      {format(new Date(event.starts_at), 'd MMM')}
                    </span>
                    <span className="font-medium text-sm tabular-nums tracking-wider uppercase mt-1">
                      {format(new Date(event.starts_at), 'yyyy')}
                    </span>
                    <span className="mt-4 text-sm font-medium">{event.location_name}</span>
                  </div>
                  <div className="md:w-2/3 space-y-4">
                    <h2 className="text-2xl font-serif font-medium">{event.title}</h2>
                    {event.description && (
                      <p className="text-slate leading-relaxed">
                        {event.description}
                      </p>
                    )}
                    <Link href={`/events/${event.slug}`} className={buttonVariants({ variant: 'outline', className: "rounded-none font-medium mt-4" })}>
                      View Event
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 space-y-4">
            <h2 className="text-2xl font-serif">No upcoming events scheduled</h2>
            {!user && (
              <>
                <p className="text-slate">Check back later or sign in to view members-only events.</p>
                <Link href="/login" className={buttonVariants({ variant: 'outline', className: "rounded-none mt-4" })}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
