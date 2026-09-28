'use client'

import { useState, useTransition } from 'react'
import { saveEvent } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function EventForm({ event, id }: { event: any, id: string }) {
  const [isPending, startTransition] = useTransition()

  // helper to format dates for datetime-local input
  const formatDateForInput = (d: string | null) => {
    if (!d) return ''
    const date = new Date(d)
    return date.toISOString().slice(0, 16)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => {
      saveEvent(id, fd).catch(err => alert(err.message))
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="title">Event Title</label>
          <Input name="title" id="title" required defaultValue={event?.title || ''} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="slug">Slug (URL)</label>
          <Input name="slug" id="slug" required defaultValue={event?.slug || ''} pattern="[a-z0-9-]+" title="Only lowercase letters, numbers, and dashes" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="description">Description</label>
        <textarea 
          name="description" 
          id="description" 
          required 
          defaultValue={event?.description || ''} 
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="starts_at">Starts At</label>
          <Input name="starts_at" id="starts_at" type="datetime-local" required defaultValue={formatDateForInput(event?.starts_at)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ends_at">Ends At (Optional)</label>
          <Input name="ends_at" id="ends_at" type="datetime-local" defaultValue={formatDateForInput(event?.ends_at)} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="location_name">Location Name</label>
          <Input name="location_name" id="location_name" required defaultValue={event?.location_name || ''} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="location_url">Location URL (Optional)</label>
          <Input name="location_url" id="location_url" type="url" defaultValue={event?.location_url || ''} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="visibility">Visibility</label>
          <Select name="visibility" defaultValue={event?.visibility || 'members'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="members">Members Only</SelectItem>
              <SelectItem value="tier_gated">Tier Gated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="capacity">Capacity (Optional)</label>
          <Input name="capacity" id="capacity" type="number" min="1" defaultValue={event?.capacity || ''} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="rsvp_deadline">RSVP Deadline (Optional)</label>
          <Input name="rsvp_deadline" id="rsvp_deadline" type="datetime-local" defaultValue={formatDateForInput(event?.rsvp_deadline)} />
        </div>
      </div>

      <div className="pt-4 border-t border-rule flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Event'}
        </Button>
      </div>
    </form>
  )
}
