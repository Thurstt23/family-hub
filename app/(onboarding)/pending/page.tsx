import { requireUser } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

export default async function PendingPage() {
  const { user, supabase } = await requireUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profile?.status === 'active') {
    redirect('/hub')
  }

  if (profile?.status === 'suspended') {
    redirect('/suspended')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold font-serif text-ink">We received your request</h1>
        <p className="text-ink-muted">
          Your account is currently pending approval. A family steward or administrator 
          will review your request shortly to ensure the directory remains private.
        </p>
        <p className="text-ink-muted">
          We will notify you by email once your account is active.
        </p>
        
        <form action={signOut}>
          <Button variant="outline" type="submit">Sign out</Button>
        </form>
      </div>
    </div>
  )
}
