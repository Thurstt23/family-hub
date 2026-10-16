import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { EventForm } from './event-form'

export const dynamic = 'force-dynamic'

export default async function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireRole(['steward', 'admin', 'owner'])
  const { id } = await params

  let event = null
  if (id !== 'new') {
    const { data } = await supabase
      .from('events')
      .select('title, slug, description, starts_at, ends_at, rsvp_deadline, location_name, location_url, visibility, min_tier_level, capacity')
      .eq('id', id)
      .maybeSingle()
    if (!data) notFound()
    event = data
  }
  const { data: tiers } = await supabase.from('membership_tiers').select('name, level').order('sort_order')

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/content" className="text-sm text-brass hover:underline">All content</Link>
      <h1 className="text-3xl font-serif">{id === 'new' ? 'New event' : 'Edit event'}</h1>
      <EventForm event={event} id={id} tiers={tiers ?? []} />
    </div>
  )
}
