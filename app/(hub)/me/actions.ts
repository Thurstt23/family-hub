'use server'

import { requireActiveMember } from '@/lib/auth/guards'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

export async function uploadAvatar(formData: FormData) {
  const { supabase, user } = await requireActiveMember()
  
  const file = formData.get('avatar') as File
  if (!file || !(file instanceof File)) {
    throw new Error('No file provided')
  }
  
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large (max 10MB)')
  }
  
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type, must be an image')
  }
  
  const ext = file.name.split('.').pop()
  const fileName = `${user.id}-${Date.now()}.${ext}`
  
  const { data, error } = await supabase
    .storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })
    
  if (error) throw new Error(error.message)
  
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
  
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
  
  revalidatePath('/me')
  return { success: true, url: publicUrl }
}
