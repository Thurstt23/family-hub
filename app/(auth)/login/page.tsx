import { login, signInWithMagicLink } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string, error?: string, success?: string }> }) {
  const { next, error, success } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-serif text-ink">Welcome back</h1>
          <p className="text-ink-muted">Sign in to your account</p>
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

        <form action={login} className="space-y-4">
          <input type="hidden" name="next" value={next || ''} />
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link href="/forgot-password" className="text-sm text-ink-muted hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required />
          </div>

          <Button type="submit" className="w-full">Sign in</Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-paper px-2 text-ink-muted">Or continue with</span>
          </div>
        </div>

        <form action={signInWithMagicLink} className="space-y-2">
          <input type="hidden" name="next" value={next || ''} />
          <div className="flex space-x-2">
            <Input name="email" type="email" placeholder="Email for magic link" required />
            <Button type="submit" variant="outline">Email Link</Button>
          </div>
        </form>

        {/* Google OAuth deferred to Phase 9 — see 08 Build Phases and Acceptance Criteria.md */}

        <div className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="underline font-medium">Sign up</Link>
        </div>
      </div>
    </div>
  )
}
