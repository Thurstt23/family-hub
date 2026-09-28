import { requireUser } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

export default async function SuspendedPage() {
  const { user, supabase } = await requireUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profile?.status === 'active') {
    redirect('/hub')
  }

  if (profile?.status === 'pending') {
    redirect('/pending')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold font-serif text-ink">Account Suspended</h1>
        <p className="text-ink-muted">
          Your account has been suspended by an administrator. If you believe this is 
          a mistake, please contact a family steward.
        </p>
        
        <form action={signOut}>
          <Button variant="outline" type="submit">Sign out</Button>
        </form>
      </div>
    </div>
  )
}
