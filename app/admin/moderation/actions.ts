'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminAction, friendlyDbError, type ActionResult } from '@/lib/admin/action'
import { requireRole } from '@/lib/auth/guards'

const uuid = z.string().uuid()

export async function moderatePhoto(id: string, status: 'approved' | 'rejected'): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Missing photo id.' }
  return adminAction({
    action: status === 'approved' ? 'photo.approve' : 'photo.reject',
    entity: 'photos',
    entityId: id,
    run: async ({ supabase }) => {
      const { data, error } = await supabase.from('photos').update({ status }).eq('id', id).select('id')
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      if (!data?.length) return { ok: false as const, error: 'Photo not found.' }
      revalidatePath('/admin/moderation')
      revalidatePath('/hub/gallery')
      return { ok: true as const }
    },
  })
}

// "Remove" is a soft removal: the comment stays in the table as rejected and
// its body is copied into the audit row (06, section 4).
export async function moderateComment(id: string, decision: 'keep' | 'remove'): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Missing comment id.' }

  const { supabase } = await requireRole(['steward', 'admin', 'owner'])
  const { data: comment } = await supabase.from('comments').select('id, body, author_id, post_id').eq('id', id).maybeSingle()
  if (!comment) return { ok: false, error: 'Comment not found.' }

  return adminAction({
    action: decision === 'remove' ? 'comment.remove' : 'comment.restore',
    entity: 'comments',
    entityId: id,
    meta: decision === 'remove' ? { body: comment.body, author_id: comment.author_id, post_id: comment.post_id } : {},
    run: async ({ supabase }) => {
      const { error } = await supabase
        .from('comments')
        .update({ status: decision === 'remove' ? 'rejected' : 'approved' })
        .eq('id', id)
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      revalidatePath('/admin/moderation')
      revalidatePath('/hub')
      return { ok: true as const }
    },
  })
}
