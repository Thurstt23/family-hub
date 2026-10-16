'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitRsvp(eventId: string, slug: string, formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { ok: false, error: 'Sign in to RSVP.' }
  }

  const status = formData.get('status') as 'going' | 'maybe' | 'declined'
  const guests_count = parseInt(formData.get('guests_count') as string || '0', 10)
  const note = formData.get('note') as string || null

  const { error } = await supabase
    .from('event_rsvps')
    .upsert({
      event_id: eventId,
      user_id: user.id,
      status,
      guests_count,
      note,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'event_id,user_id'
    })

  if (error) {
    if (error.message.includes('RSVP deadline has passed')) {
      return { ok: false, error: 'The RSVP deadline for this event has passed.' }
    }
    if (error.message.includes('Event capacity reached')) {
      return { ok: false, error: 'This event is full, or there are not enough places for your guests. Choose fewer guests or Maybe.' }
    }
    return { ok: false, error: 'Your RSVP could not be saved. Try again.' }
  }

  revalidatePath(`/events/${slug}`)
  return { ok: true }
}
