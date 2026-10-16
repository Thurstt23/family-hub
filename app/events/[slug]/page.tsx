import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { formatDayNumber, formatMonthYear, formatTime, formatTimeWithZone, formatWeekdayDate } from '@/lib/dates'
import { Botanical } from '@/components/illustrations/botanical'
import { RsvpForm } from './rsvp-form'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { slug } = await params

  // Will only return if RLS allows
  const { data: event } = await supabase
    .from('events')
    .select('*, profiles!events_created_by_fkey(full_name)')
    .eq('slug', slug)
    .single()

  if (!event) notFound()

  // fetch user's rsvp if logged in
  let rsvp = null
  if (user) {
    const { data: rsvpData } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .single()
    rsvp = rsvpData
  }

  // Places taken across every member. RLS only lets a member read their own
  // RSVP, so the total comes from a security definer function.
  const { data: seats } = await supabase.rpc('event_seats_taken', { p_event: event.id })
  const totalGoing = typeof seats === 'number' ? seats : 0
  const isFull = event.capacity ? totalGoing >= event.capacity : false
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - totalGoing) : null

  const isPastDeadline = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date()

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader current="/events" />

      <main id="main" className="flex-1">
        <section className="grain relative overflow-hidden border-b border-rule bg-paper-deep">
          <Botanical className="pointer-events-none absolute -right-16 -top-10 h-[380px] w-auto text-brass/20 md:right-6" />
          <div className="relative mx-auto max-w-5xl px-6 pt-14 pb-12 md:pt-20 lg:px-12">
            <Link href="/events" className="text-sm text-slate underline-offset-4 hover:underline">
              <span aria-hidden="true">←</span> All gatherings
            </Link>
            <div className="mt-8 grid gap-8 sm:grid-cols-[8rem_1fr] sm:items-end">
              <div>
                <span className="block font-serif text-7xl leading-none tabular-nums">{formatDayNumber(event.starts_at)}</span>
                <span className="mt-2 block text-sm text-slate">{formatMonthYear(event.starts_at)}</span>
              </div>
              <div>
                <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight md:text-6xl">{event.title}</h1>
                <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-slate">
                  <span>{formatWeekdayDate(event.starts_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {event.ends_at ? `${formatTime(event.starts_at)} – ${formatTimeWithZone(event.ends_at)}` : formatTimeWithZone(event.starts_at)}
                  </span>
                  {event.location_name ? (
                    <>
                      <span aria-hidden="true">·</span>
                      {event.location_url ? (
                        <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-brass underline-offset-4">
                          {event.location_name}
                        </a>
                      ) : (
                        <span>{event.location_name}</span>
                      )}
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-14 lg:px-12">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="md:w-2/3 prose prose-sm max-w-none prose-p:text-ink prose-headings:text-ink">
            <p className="whitespace-pre-wrap text-lg leading-relaxed">{event.description}</p>
          </div>
          
          <div className="md:w-1/3 space-y-6">
            <div className="bg-card border border-rule p-6 rounded-sm md:sticky md:top-8">
              <h3 className="font-serif text-2xl mb-4">RSVP</h3>
              
              {!user ? (
                <div className="text-sm text-slate space-y-4">
                  <p>You must be signed in as a member to RSVP to this event.</p>
                  <Link href={`/login?next=/events/${event.slug}`} className={buttonVariants({ className: "w-full" })}>
                    Sign in to RSVP
                  </Link>
                </div>
              ) : (
                <RsvpForm 
                  event={event} 
                  rsvp={rsvp} 
                  isFull={isFull} 
                  spotsLeft={spotsLeft} 
                  isPastDeadline={isPastDeadline}
                />
              )}
            </div>
          </div>
        </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
