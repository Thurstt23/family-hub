'use client'

import { useState, useTransition } from 'react'
import { submitRsvp } from './actions'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
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
  const [status, setStatus] = useState<'going'|'maybe'|'declined'>(rsvp?.status || (isFull ? 'maybe' : 'going'))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      // Server action errors are redacted in production, so the action
      // returns its message instead of throwing it.
      const res = await submitRsvp(event.id, event.slug, fd)
      setMessage(res.ok ? { ok: true, text: 'Your RSVP is saved.' } : { ok: false, text: res.error })
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
        <NativeSelect id="status" name="status" value={status} onChange={e => setStatus(e.target.value as 'going' | 'maybe' | 'declined')}>
          {(!isFull || rsvp?.status === 'going') && (
            <option value="going">Going</option>
          )}
          <option value="maybe">Maybe / Waitlist</option>
          <option value="declined">Can&apos;t make it</option>
        </NativeSelect>
      </div>

      {status === 'going' && (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="guests_count">Additional Guests</label>
          <NativeSelect id="guests_count" name="guests_count" defaultValue={rsvp?.guests_count?.toString() || '0'}>
            {[0, 1, 2, 3, 4, 5].map(n => {
              if (spotsLeft !== null && n > spotsLeft && rsvp?.status !== 'going') return null
              return (
                <option key={n} value={n.toString()}>
                  {n === 0 ? 'None (just me)' : `${n} guest${n > 1 ? 's' : ''}`}
                </option>
              )
            })}
          </NativeSelect>
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
      {message ? (
        <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-sm text-[#3F5A46]' : 'text-sm text-clay'}>
          {message.text}
        </p>
      ) : null}
    </form>
  )
}
