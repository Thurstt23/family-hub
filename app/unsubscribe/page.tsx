import Link from 'next/link'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/public'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Unsubscribe', robots: { index: false } }

async function unsubscribe(formData: FormData) {
  'use server'
  const token = z.string().uuid().safeParse(formData.get('token'))
  if (!token.success) redirect('/unsubscribe?state=invalid')
  const { data, error } = await createClient().rpc('unsubscribe_by_token', { p_token: token.data })
  redirect(`/unsubscribe?state=${error ? 'error' : data ? 'done' : 'invalid'}`)
}

// The email link lands here and asks for a click, so link scanners that
// prefetch URLs cannot unsubscribe anyone by accident.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string; state?: string }> }) {
  const { token, state } = await searchParams

  return (
    <main id="main" className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5 text-center">
        <h1 className="text-3xl font-serif">Weekly announcements</h1>
        {state === 'done' ? (
          <p role="status">You will no longer receive the weekly announcement email. You can turn it back on from your profile.</p>
        ) : state === 'invalid' ? (
          <p role="alert" className="text-clay">That link is no longer valid. Change your email settings from your profile instead.</p>
        ) : state === 'error' ? (
          <p role="alert" className="text-clay">Something went wrong. Try again in a minute.</p>
        ) : token ? (
          <form action={unsubscribe} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <p>Stop receiving the weekly announcement email? Account emails, such as approvals and receipts, still arrive.</p>
            <Button type="submit">Unsubscribe</Button>
          </form>
        ) : (
          <p>Open the link from the bottom of an announcement email to unsubscribe.</p>
        )}
        <p className="text-sm">
          <Link href="/me" className="text-brass underline">Email settings on your profile</Link>
        </p>
      </div>
    </main>
  )
}
