'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActionForm } from '@/components/admin/action-form'
import { approveMember, rejectMember, requestInfo } from '../members/actions'

// Approve is one click (06: routine actions finish in two clicks). Declining
// or asking for more information opens an inline field for the note.
export function ApprovalActions({ id, name }: { id: string; name: string }) {
  const [mode, setMode] = useState<'idle' | 'reject' | 'info'>('idle')

  return (
    <div className="flex flex-col gap-2 md:items-end md:w-80">
      <div className="flex flex-wrap gap-2">
        <ActionForm action={approveMember}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" aria-label={`Send approval for ${name}`}>Send approval</Button>
        </ActionForm>
        <Button type="button" variant="outline" onClick={() => setMode(mode === 'info' ? 'idle' : 'info')} aria-expanded={mode === 'info'}>
          Ask for details
        </Button>
        <Button type="button" variant="destructive" onClick={() => setMode(mode === 'reject' ? 'idle' : 'reject')} aria-expanded={mode === 'reject'}>
          Decline
        </Button>
      </div>

      {mode === 'reject' ? (
        <ActionForm action={rejectMember} className="w-full space-y-2">
          <input type="hidden" name="id" value={id} />
          <label htmlFor={`reason-${id}`} className="block text-sm font-medium">Reason, sent to {name}</label>
          <Input id={`reason-${id}`} name="reason" required minLength={3} autoFocus />
          <Button type="submit" variant="destructive" size="sm">Decline request</Button>
        </ActionForm>
      ) : null}

      {mode === 'info' ? (
        <ActionForm action={requestInfo} className="w-full space-y-2">
          <input type="hidden" name="id" value={id} />
          <label htmlFor={`info-${id}`} className="block text-sm font-medium">What do you need to know?</label>
          <Input id={`info-${id}`} name="message" required minLength={3} autoFocus />
          <Button type="submit" size="sm">Send request</Button>
        </ActionForm>
      ) : null}
    </div>
  )
}
