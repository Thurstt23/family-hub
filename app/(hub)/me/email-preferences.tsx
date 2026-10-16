'use client'

import { startTransition, useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { setAnnouncementEmails } from './actions'

export function EmailPreferences({ announcements }: { announcements: boolean }) {
  const [state, action, pending] = useActionState(setAnnouncementEmails, null)
  return (
    <form
      className="space-y-3"
      onSubmit={e => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(() => action(fd))
      }}
    >
      <div className="flex items-start gap-3">
        <input id="announcements" name="announcements" type="checkbox" defaultChecked={announcements} className="mt-1 size-4 accent-brass" />
        <label htmlFor="announcements">
          <span className="font-medium">Weekly announcement email</span>
          <span className="block text-sm text-slate">A short digest of the week&rsquo;s announcements, sent on Monday mornings.</span>
        </label>
      </div>
      <Button type="submit" variant="outline" disabled={pending}>Save email setting</Button>
      {state ? (
        <p role={state.ok ? 'status' : 'alert'} className={state.ok ? 'text-sm text-[#3F5A46]' : 'text-sm text-clay'}>{state.message}</p>
      ) : null}
    </form>
  )
}
