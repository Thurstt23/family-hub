'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPost(body: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const title = body.length > 50 ? body.substring(0, 47) + '...' : body || 'Photo Update'
  const slug = crypto.randomUUID()

  const { data, error } = await supabase.from('posts').insert({
    author_id: user.id,
    body,
    title,
    slug,
    kind: 'story',
    published_at: new Date().toISOString()
  }).select('id').single()

  if (error) throw new Error(error.message)
  return data.id
}

export async function attachPhoto(postId: string, storagePath: string, width: number, height: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { error } = await supabase.from('photos').insert({
    post_id: postId,
    uploader_id: user.id,
    storage_path: storagePath,
    width,
    height,
    status: 'approved'
  })

  if (error) throw new Error(error.message)
  revalidatePath('/hub')
}

export async function toggleLike(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { data } = await supabase.from('post_likes').select('user_id').eq('post_id', postId).eq('user_id', user.id).single()

  if (data) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
  }
  revalidatePath('/hub')
}

export async function addComment(postId: string, content: string, parentId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    author_id: user.id,
    body: content,
    parent_id: parentId || null
  })

  if (error) throw new Error(error.message)
  revalidatePath('/hub')
}

export async function reportComment(commentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { error } = await supabase.from('comments').update({ status: 'pending' }).eq('id', commentId)
  if (error) throw new Error(error.message)
  revalidatePath('/hub')
}
