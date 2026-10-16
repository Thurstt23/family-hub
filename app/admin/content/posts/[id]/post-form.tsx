'use client'

import { startTransition, useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel, NativeSelect, Textarea } from '@/components/ui/native-select'
import { ActionMessage } from '@/components/admin/action-form'
import { localInputsToIso, toLocalInput } from '@/components/admin/local-datetime'
import type { ActionResult } from '@/lib/admin/action'
import { siteTimezoneLabel } from '@/lib/dates'
import { savePost } from '../../actions'

type PostRow = {
  title: string
  slug: string
  kind: string
  excerpt: string | null
  body: string
  visibility: string
  min_tier_level: number
  published_at: string | null
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

export function PostForm({ post, id, tiers }: { post: PostRow | null; id: string; tiers: { name: string; level: number }[] }) {
  const [state, action, pending] = useActionState(
    (prev: ActionResult | null, fd: FormData) => savePost(id, prev, localInputsToIso(fd, ['published_at'])),
    null
  )
  const [visibility, setVisibility] = useState(post?.visibility ?? 'members')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(post))
  const [publishedAt, setPublishedAt] = useState('')
  useEffect(() => setPublishedAt(toLocalInput(post?.published_at)), [post])

  return (
    <form
      className="space-y-6"
      aria-busy={pending}
      onSubmit={e => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(() => action(fd))
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            name="title"
            required
            defaultValue={post?.title ?? ''}
            onChange={e => {
              if (!slugTouched) setSlug(slugify(e.target.value))
            }}
          />
        </div>
        <div>
          <FieldLabel htmlFor="slug">Slug, used in the address</FieldLabel>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={e => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers and dashes"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <FieldLabel htmlFor="kind">Kind</FieldLabel>
          <NativeSelect id="kind" name="kind" defaultValue={post?.kind ?? 'announcement'}>
            <option value="announcement">Announcement (goes in the weekly email)</option>
            <option value="notice">Notice</option>
            <option value="story">Story</option>
          </NativeSelect>
        </div>
        <div>
          <FieldLabel htmlFor="visibility">Who can read it</FieldLabel>
          <NativeSelect id="visibility" name="visibility" value={visibility} onChange={e => setVisibility(e.target.value)}>
            <option value="public">Everyone</option>
            <option value="members">Members</option>
            <option value="tier_gated">Members on a paid tier</option>
          </NativeSelect>
        </div>
        {visibility === 'tier_gated' ? (
          <div>
            <FieldLabel htmlFor="min_tier_level">Lowest tier</FieldLabel>
            <NativeSelect id="min_tier_level" name="min_tier_level" defaultValue={String(post?.min_tier_level || 10)}>
              {tiers.filter(t => t.level > 0).map(t => <option key={t.level} value={t.level}>{t.name}</option>)}
            </NativeSelect>
          </div>
        ) : null}
      </div>

      <div>
        <FieldLabel htmlFor="excerpt">Summary (optional, shown in lists and emails)</FieldLabel>
        <Input id="excerpt" name="excerpt" maxLength={400} defaultValue={post?.excerpt ?? ''} />
      </div>

      <div>
        <FieldLabel htmlFor="body">Body, in Markdown</FieldLabel>
        <Textarea id="body" name="body" required rows={14} defaultValue={post?.body ?? ''} className="font-mono" />
      </div>

      <div className="max-w-xs">
        <FieldLabel htmlFor="published_at">Publish at</FieldLabel>
        <Input id="published_at" name="published_at" type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} />
        <p className="mt-1 text-xs text-slate">Leave empty to keep it as a draft. A future time schedules it. Times are {siteTimezoneLabel()}.</p>
      </div>

      <div className="flex items-center justify-end gap-4 border-t border-rule pt-4">
        <ActionMessage state={state} />
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : publishedAt ? 'Save and schedule' : 'Save draft'}</Button>
      </div>
    </form>
  )
}
