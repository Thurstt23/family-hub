import { signup } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string, success?: string }> }) {
  const { error, success } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-serif text-ink">Join Martin Sawyer Reunion</h1>
          <p className="text-ink-muted">Create an account to connect with the family.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-100 text-green-800 rounded-md text-sm">
            {success}
          </div>
        )}

        <form action={signup} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input id="password" name="password" type="password" required minLength={10} />
            <p className="text-xs text-ink-muted">Minimum 10 characters.</p>
          </div>

          <Button type="submit" className="w-full">Sign up</Button>
        </form>

        {/* Google OAuth deferred to Phase 9 — see 08 Build Phases and Acceptance Criteria.md */}

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline font-medium">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
