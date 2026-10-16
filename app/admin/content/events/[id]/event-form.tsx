'use client'

import { startTransition, useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel, NativeSelect, Textarea } from '@/components/ui/native-select'
import { ActionMessage } from '@/components/admin/action-form'
import { localInputsToIso, toLocalInput } from '@/components/admin/local-datetime'
import type { ActionResult } from '@/lib/admin/action'
import { siteTimezoneLabel } from '@/lib/dates'
import { saveEvent } from '../../actions'

type EventRow = {
  title: string
  slug: string
  description: string | null
  starts_at: string
  ends_at: string | null
  rsvp_deadline: string | null
  location_name: string | null
  location_url: string | null
  visibility: string
  min_tier_level: number
  capacity: number | null
}

type Tier = { name: string; level: number }

const DATE_FIELDS = ['starts_at', 'ends_at', 'rsvp_deadline']

export function EventForm({ event, id, tiers }: { event: EventRow | null; id: string; tiers: Tier[] }) {
  const [state, action, pending] = useActionState(
    (prev: ActionResult | null, fd: FormData) => saveEvent(id, prev, localInputsToIso(fd, DATE_FIELDS)),
    null
  )
  const [visibility, setVisibility] = useState(event?.visibility ?? 'members')
  // Local times are only known in the browser; fill them after hydration so
  // server and client render the same markup.
  const [dates, setDates] = useState({ starts_at: '', ends_at: '', rsvp_deadline: '' })
  useEffect(() => {
    setDates({
      starts_at: toLocalInput(event?.starts_at),
      ends_at: toLocalInput(event?.ends_at),
      rsvp_deadline: toLocalInput(event?.rsvp_deadline),
    })
  }, [event])

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
          <Input id="title" name="title" required defaultValue={event?.title ?? ''} />
        </div>
        <div>
          <FieldLabel htmlFor="slug">Slug, used in the address</FieldLabel>
          <Input id="slug" name="slug" required defaultValue={event?.slug ?? ''} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Lowercase letters, numbers and dashes" />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea id="description" name="description" required rows={6} defaultValue={event?.description ?? ''} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <FieldLabel htmlFor="starts_at">Starts</FieldLabel>
          <Input id="starts_at" name="starts_at" type="datetime-local" required value={dates.starts_at} onChange={e => setDates(d => ({ ...d, starts_at: e.target.value }))} />
        </div>
        <div>
          <FieldLabel htmlFor="ends_at">Ends (optional)</FieldLabel>
          <Input id="ends_at" name="ends_at" type="datetime-local" value={dates.ends_at} onChange={e => setDates(d => ({ ...d, ends_at: e.target.value }))} />
        </div>
        <div>
          <FieldLabel htmlFor="rsvp_deadline">RSVP deadline (optional)</FieldLabel>
          <Input id="rsvp_deadline" name="rsvp_deadline" type="datetime-local" value={dates.rsvp_deadline} onChange={e => setDates(d => ({ ...d, rsvp_deadline: e.target.value }))} />
        </div>
        <p className="md:col-span-3 -mt-2 text-xs text-slate">All times are {siteTimezoneLabel()}, whatever timezone your computer is in.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="location_name">Location</FieldLabel>
          <Input id="location_name" name="location_name" required defaultValue={event?.location_name ?? ''} />
        </div>
        <div>
          <FieldLabel htmlFor="location_url">Map link (optional)</FieldLabel>
          <Input id="location_url" name="location_url" type="url" defaultValue={event?.location_url ?? ''} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <FieldLabel htmlFor="visibility">Who can see it</FieldLabel>
          <NativeSelect id="visibility" name="visibility" value={visibility} onChange={e => setVisibility(e.target.value)}>
            <option value="public">Everyone, including the public site</option>
            <option value="members">Members</option>
            <option value="tier_gated">Members on a paid tier</option>
          </NativeSelect>
        </div>
        {visibility === 'tier_gated' ? (
          <div>
            <FieldLabel htmlFor="min_tier_level">Lowest tier</FieldLabel>
            <NativeSelect id="min_tier_level" name="min_tier_level" defaultValue={String(event?.min_tier_level || 10)}>
              {tiers.filter(t => t.level > 0).map(t => <option key={t.level} value={t.level}>{t.name}</option>)}
            </NativeSelect>
          </div>
        ) : null}
        <div>
          <FieldLabel htmlFor="capacity">Capacity, guests included (optional)</FieldLabel>
          <Input id="capacity" name="capacity" type="number" min={1} defaultValue={event?.capacity ?? ''} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 border-t border-rule pt-4">
        <ActionMessage state={state} />
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save event'}</Button>
      </div>
    </form>
  )
}
