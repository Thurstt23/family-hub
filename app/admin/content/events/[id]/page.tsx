import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EventForm } from './event-form'

export const dynamic = 'force-dynamic'

export default async function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  let event = null
  if (id !== 'new') {
    const { data } = await supabase.from('events').select('*').eq('id', id).single()
    if (!data) notFound()
    event = data
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-serif">{id === 'new' ? 'Create Event' : 'Edit Event'}</h1>
      <EventForm event={event} id={id} />
    </div>
  )
}
