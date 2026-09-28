'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveEvent(id: string | 'new', formData: FormData) {
  const supabase = await createClient()

  // Must verify role again in server action
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['steward', 'admin', 'owner'].includes(profile.role)) {
    throw new Error('Unauthorized')
  }

  const slug = formData.get('slug') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const starts_at = formData.get('starts_at') as string
  const ends_at = formData.get('ends_at') as string || null
  const location_name = formData.get('location_name') as string
  const location_url = formData.get('location_url') as string || null
  const visibility = formData.get('visibility') as 'public' | 'members' | 'tier_gated'
  const capacity_str = formData.get('capacity') as string
  const capacity = capacity_str ? parseInt(capacity_str, 10) : null
  const rsvp_deadline = formData.get('rsvp_deadline') as string || null

  const eventData = {
    slug,
    title,
    description,
    starts_at: new Date(starts_at).toISOString(),
    ends_at: ends_at ? new Date(ends_at).toISOString() : null,
    location_name,
    location_url,
    visibility,
    capacity,
    rsvp_deadline: rsvp_deadline ? new Date(rsvp_deadline).toISOString() : null,
  }

  if (id === 'new') {
    const { error } = await supabase.from('events').insert({
      ...eventData,
      created_by: user.id
    })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('events').update(eventData).eq('id', id)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/admin/content')
  revalidatePath('/events')
  redirect('/admin/content')
}
