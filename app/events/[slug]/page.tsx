import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { format } from 'date-fns'
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
    .select('*, profiles(full_name)')
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

  // fetch capacity usage
  const { data: attendees } = await supabase
    .from('event_rsvps')
    .select('guests_count')
    .eq('event_id', event.id)
    .eq('status', 'going')

  const totalGoing = (attendees || []).reduce((acc, curr) => acc + curr.guests_count + 1, 0)
  const isFull = event.capacity ? totalGoing >= event.capacity : false
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - totalGoing) : null

  const isPastDeadline = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date()

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader current="/events" />

      <main className="flex-1 py-16 px-6 lg:px-12 max-w-4xl mx-auto w-full">
        <div className="mb-12 border-b border-rule pb-6">
          <p className="text-brass font-medium uppercase tracking-widest text-sm mb-4">
            {format(new Date(event.starts_at), 'EEEE, d MMMM yyyy')}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">{event.title}</h1>
          <div className="flex flex-col sm:flex-row gap-4 text-slate text-sm">
            <span>
              <strong>Time:</strong> {format(new Date(event.starts_at), 'h:mm a')} 
              {event.ends_at && ` - ${format(new Date(event.ends_at), 'h:mm a')}`}
            </span>
            <span>•</span>
            <span>
              <strong>Location:</strong>{' '}
              {event.location_url ? (
                <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="text-brass hover:underline">
                  {event.location_name}
                </a>
              ) : (
                event.location_name
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          <div className="md:w-2/3 prose prose-sm max-w-none prose-p:text-ink prose-headings:text-ink">
            <p className="whitespace-pre-wrap">{event.description}</p>
          </div>
          
          <div className="md:w-1/3 space-y-6">
            <div className="bg-card border border-rule p-6 rounded-md shadow-sm">
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
      </main>

      <SiteFooter />
    </div>
  )
}
