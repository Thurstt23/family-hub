'use client'

import { useActionState, startTransition } from 'react'
import { cn } from 'cn'
import type { ActionResult } from '@/lib/admin/action'

type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>

// A form bound to a server action that returns ActionResult. Shows the result
// inline (role="status" / role="alert") instead of alert() popups, and
// optionally asks for confirmation before destructive actions.
export function ActionForm({
  action,
  children,
  confirm,
  className,
}: {
  action: FormAction
  children: React.ReactNode
  confirm?: string
  className?: string
}) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form
      className={className}
      onSubmit={e => {
        // Submitting through a transition instead of <form action> keeps what
        // the admin typed when the server answers with an error; React resets
        // uncontrolled fields after a form action completes.
        e.preventDefault()
        if (confirm && !window.confirm(confirm)) return
        const fd = new FormData(e.currentTarget)
        startTransition(() => formAction(fd))
      }}
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <ActionMessage state={state} />
    </form>
  )
}

export function ActionMessage({ state }: { state: ActionResult | null }) {
  if (!state) return null
  if (state.ok) {
    return state.message ? (
      <p role="status" className="mt-2 text-sm text-[#3F5A46]">{state.message}</p>
    ) : null
  }
  return (
    <p role="alert" className={cn('mt-2 text-sm text-clay')}>
      {state.error}
    </p>
  )
}
