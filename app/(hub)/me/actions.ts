'use server'

import { requireActiveMember } from '@/lib/auth/guards'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { MAX_IMAGE_BYTES, sniffImage } from '@/lib/images/sniff'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  display_name: z.string().optional(),
  bio: z.string().max(4000).optional(),
  phone: z.string().optional(),
  birthday: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  generation: z.coerce.number().min(1).max(10).optional().or(z.literal('')),
  branch_id: z.string().uuid('Please select a branch').optional().or(z.literal('')),
  show_email: z.coerce.boolean(),
  show_phone: z.coerce.boolean(),
  show_birthday: z.coerce.boolean(),
})

export async function updateProfile(formData: FormData) {
  const { supabase, user, profile: currentProfile } = await requireActiveMember()
  
  const rawData = {
    full_name: formData.get('full_name'),
    display_name: formData.get('display_name'),
    bio: formData.get('bio'),
    phone: formData.get('phone'),
    birthday: formData.get('birthday'),
    city: formData.get('city'),
    country: formData.get('country'),
    generation: formData.get('generation'),
    branch_id: formData.get('branch_id'),
    show_email: formData.get('show_email') === 'on',
    show_phone: formData.get('show_phone') === 'on',
    show_birthday: formData.get('show_birthday') === 'on',
  }
  
  const validated = profileSchema.parse(rawData)

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: validated.full_name,
      display_name: validated.display_name || null,
      bio: validated.bio || null,
      phone: validated.phone || null,
      birthday: validated.birthday || null,
      city: validated.city || null,
      country: validated.country || null,
      generation: typeof validated.generation === 'number' ? validated.generation : null,
      branch_id: validated.branch_id || null,
      show_email: validated.show_email,
      show_phone: validated.show_phone,
      show_birthday: validated.show_birthday,
    })
    .eq('id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/me')
  revalidatePath('/directory')
  revalidatePath(`/directory/${currentProfile.handle}`)
  
  redirect(`/directory/${currentProfile.handle}`)
}

export async function uploadAvatar(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireActiveMember()

  const file = formData.get('avatar')
  if (!file || !(file instanceof File)) {
    return { ok: false, error: 'Choose a photo to upload.' }
  }
  // Checked here, on the server, whatever the file input allowed (08, Phase 4).
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'That photo is larger than 10MB. Choose a smaller one.' }
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = sniffImage(bytes.subarray(0, 16))
  if (!kind) {
    return { ok: false, error: 'That file is not a JPG, PNG, WebP or GIF photo.' }
  }

  // Named under the member's id so the storage policy can scope writes.
  const fileName = `${user.id}/${Date.now()}.${kind.ext}`
  const { error } = await supabase.storage.from('avatars').upload(fileName, bytes, {
    cacheControl: '3600',
    contentType: kind.mime,
    upsert: false,
  })
  if (error) return { ok: false, error: 'The photo could not be saved. Try again.' }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)

  revalidatePath('/me')
  revalidatePath('/directory')
  return { ok: true, url: publicUrl }
}

export async function setAnnouncementEmails(_prev: { ok: boolean; message: string } | null, formData: FormData) {
  const { supabase, user } = await requireActiveMember()
  const on = formData.get('announcements') === 'on'
  const { error } = await supabase
    .from('email_preferences')
    .upsert({ user_id: user.id, announcements: on, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return { ok: false, message: 'Your email setting could not be saved. Try again.' }
  revalidatePath('/me')
  return { ok: true, message: on ? 'You will receive the weekly announcement email.' : 'Weekly announcement emails are off.' }
}
