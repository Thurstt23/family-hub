'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitRsvp(eventId: string, slug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
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
    if (error.message.includes('Event capacity reached')) {
      throw new Error('This event is full or there are not enough spots for your guests.')
    }
    throw new Error(error.message)
  }

  revalidatePath(`/events/${slug}`)
}
