'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'

export async function moderatePhoto(id: string, status: 'approved' | 'rejected') {
  await requireRole(['steward', 'admin', 'owner'])
  const supabase = await createClient()

  const { error } = await supabase.from('photos').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/moderation')
}

export async function moderateComment(id: string, status: 'approved' | 'rejected') {
  await requireRole(['steward', 'admin', 'owner'])
  const supabase = await createClient()

  const { error } = await supabase.from('comments').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/moderation')
}
