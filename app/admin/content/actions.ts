'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { adminAction, friendlyDbError, type ActionResult } from '@/lib/admin/action'

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes in the slug.')
const visibility = z.enum(['public', 'members', 'tier_gated', 'stewards'])
const isoOrEmpty = z
  .string()
  .optional()
  .transform(v => (v ? v : null))
  .refine(v => v === null || !Number.isNaN(Date.parse(v)), 'Check the dates.')

function revalidateContent() {
  revalidatePath('/admin/content')
  revalidatePath('/hub')
  revalidatePath('/events')
  revalidatePath('/')
}

// ---------------------------------------------------------------- events

const eventSchema = z.object({
  title: z.string().trim().min(2, 'Give the event a title.'),
  slug,
  description: z.string().trim().min(1, 'Add a description.'),
  starts_at: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Choose a start date and time.'),
  ends_at: isoOrEmpty,
  rsvp_deadline: isoOrEmpty,
  location_name: z.string().trim().min(1, 'Add a location.'),
  location_url: z.string().trim().url('The location link must be a full URL.').optional().or(z.literal('')),
  visibility,
  min_tier_level: z.coerce.number().int().min(0).default(0),
  capacity: z.union([z.literal(''), z.coerce.number().int().min(1)]).optional(),
})

export async function saveEvent(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = eventSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' }
  const v = parsed.data
  const row = {
    title: v.title,
    slug: v.slug,
    description: v.description,
    starts_at: new Date(v.starts_at).toISOString(),
    ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
    rsvp_deadline: v.rsvp_deadline ? new Date(v.rsvp_deadline).toISOString() : null,
    location_name: v.location_name,
    location_url: v.location_url || null,
    visibility: v.visibility,
    min_tier_level: v.visibility === 'tier_gated' ? v.min_tier_level : 0,
    capacity: typeof v.capacity === 'number' ? v.capacity : null,
  }

  const isNew = id === 'new'
  const result = await adminAction({
    action: isNew ? 'event.create' : 'event.update',
    entity: 'events',
    entityId: isNew ? v.slug : id,
    meta: { title: v.title, visibility: v.visibility },
    run: async ({ supabase, user }) => {
      const { error } = isNew
        ? await supabase.from('events').insert({ ...row, created_by: user.id })
        : await supabase.from('events').update(row).eq('id', id)
      if (error) return { ok: false as const, error: error.code === '23505' ? 'That slug is already used by another event.' : friendlyDbError(error.message) }
      return { ok: true as const }
    },
  })
  if (!result.ok) return result
  revalidateContent()
  revalidatePath(`/events/${v.slug}`)
  redirect('/admin/content')
}

// ---------------------------------------------------------------- posts

const postSchema = z.object({
  title: z.string().trim().min(2, 'Give the post a title.'),
  slug,
  kind: z.enum(['announcement', 'story', 'notice']),
  excerpt: z.string().trim().max(400).optional(),
  body: z.string().trim().min(1, 'Write the post body.'),
  visibility,
  min_tier_level: z.coerce.number().int().min(0).default(0),
  published_at: isoOrEmpty,
})

export async function savePost(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = postSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' }
  const v = parsed.data
  const row = {
    title: v.title,
    slug: v.slug,
    kind: v.kind,
    excerpt: v.excerpt || null,
    body: v.body,
    visibility: v.visibility,
    min_tier_level: v.visibility === 'tier_gated' ? v.min_tier_level : 0,
    published_at: v.published_at ? new Date(v.published_at).toISOString() : null,
  }

  const isNew = id === 'new'
  const result = await adminAction({
    action: isNew ? 'content.create' : 'content.update',
    entity: 'posts',
    entityId: isNew ? v.slug : id,
    meta: { title: v.title, published_at: row.published_at },
    run: async ({ supabase, user }) => {
      const { error } = isNew
        ? await supabase.from('posts').insert({ ...row, author_id: user.id })
        : await supabase.from('posts').update(row).eq('id', id)
      if (error) return { ok: false as const, error: error.code === '23505' ? 'That slug is already used by another post.' : friendlyDbError(error.message) }
      return { ok: true as const }
    },
  })
  if (!result.ok) return result
  revalidateContent()
  redirect('/admin/content')
}

export async function setPostPublished(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('id'))
  const publish = fd.get('publish') === 'true'
  if (!id.success) return { ok: false, error: 'Missing post id.' }

  return adminAction({
    action: publish ? 'content.publish' : 'content.unpublish',
    entity: 'posts',
    entityId: id.data,
    run: async ({ supabase }) => {
      const { data, error } = await supabase
        .from('posts')
        .update({ published_at: publish ? new Date().toISOString() : null })
        .eq('id', id.data)
        .select('id')
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      if (!data?.length) return { ok: false as const, error: 'Post not found.' }
      revalidateContent()
      return { ok: true as const, message: publish ? 'Published.' : 'Moved back to drafts.' }
    },
  })
}

// ---------------------------------------------------------------- albums

const albumSchema = z.object({
  title: z.string().trim().min(2, 'Give the album a title.'),
  event_id: z.string().uuid().optional().or(z.literal('')),
  visibility,
  min_tier_level: z.coerce.number().int().min(0).default(0),
})

export async function createAlbum(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = albumSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' }
  const v = parsed.data
  const row = {
    title: v.title,
    event_id: v.event_id || null,
    visibility: v.visibility,
    min_tier_level: v.visibility === 'tier_gated' ? v.min_tier_level : 0,
  }
  return adminAction({
    action: 'album.create',
    entity: 'albums',
    entityId: v.title,
    meta: row,
    run: async ({ supabase, user }) => {
      const { error } = await supabase.from('albums').insert({ ...row, created_by: user.id })
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      revalidatePath('/admin/content')
      revalidatePath('/hub/albums')
      return { ok: true as const, message: `Album "${v.title}" created. Members can now add photos to it.` }
    },
  })
}
