'use client'

import { useState, useTransition } from 'react'
import { submitRsvp } from './actions'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export function RsvpForm({ 
  event, 
  rsvp, 
  isFull, 
  spotsLeft, 
  isPastDeadline 
}: { 
  event: any
  rsvp: any
  isFull: boolean
  spotsLeft: number | null
  isPastDeadline: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'going'|'maybe'|'declined'>(rsvp?.status || 'going')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => {
      submitRsvp(event.id, event.slug, fd).catch(err => {
        alert(err.message)
      })
    })
  }

  if (isPastDeadline) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate">
          The RSVP deadline for this event has passed.
        </p>
        {rsvp ? (
          <div className="p-4 border border-rule bg-paper rounded-md">
            <p className="font-medium text-ink">Your RSVP: {rsvp.status.charAt(0).toUpperCase() + rsvp.status.slice(1)}</p>
            {rsvp.status === 'going' && <p className="text-sm text-slate">Guests: {rsvp.guests_count}</p>}
            {rsvp.note && <p className="text-sm text-slate italic mt-2">"{rsvp.note}"</p>}
          </div>
        ) : (
          <p className="text-sm font-medium text-clay">You did not RSVP for this event.</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isFull && status !== 'going' && (
        <div className="p-3 bg-clay/10 text-clay text-sm rounded-md border border-clay/20">
          This event has reached capacity. You may join the waitlist by contacting the organizer, or RSVP as 'Maybe'.
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="status">Your Response</label>
        <Select name="status" value={status} onValueChange={(val: any) => setStatus(val)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(!isFull || rsvp?.status === 'going') && (
              <SelectItem value="going">Going</SelectItem>
            )}
            <SelectItem value="maybe">Maybe / Waitlist</SelectItem>
            <SelectItem value="declined">Can't Make It</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status === 'going' && (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="guests_count">Additional Guests</label>
          <Select name="guests_count" defaultValue={rsvp?.guests_count?.toString() || '0'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5].map(n => {
                if (spotsLeft !== null && n > spotsLeft && rsvp?.status !== 'going') return null
                return (
                  <SelectItem key={n} value={n.toString()}>
                    {n === 0 ? 'None (Just me)' : `${n} guest${n > 1 ? 's' : ''}`}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {spotsLeft !== null && spotsLeft < 5 && (
            <p className="text-xs text-slate">Only {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="note">Note for Organizer (Optional)</label>
        <Input name="note" id="note" defaultValue={rsvp?.note || ''} placeholder="Dietary requirements, etc." />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving...' : (rsvp ? 'Update RSVP' : 'Submit RSVP')}
      </Button>
    </form>
  )
}
