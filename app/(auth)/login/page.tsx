import { login, signInWithMagicLink } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { GoogleButton } from '@/components/auth/google-button'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string, error?: string, success?: string }> }) {
  const { next, error, success } = await searchParams

  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-medium font-serif tracking-tight text-ink">Welcome back</h1>
          <p className="text-slate">Sign in to your account</p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-clay/10 text-clay border border-clay/30 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="p-3 bg-sage/10 text-[#3F5A46] border border-sage/40 rounded-md text-sm">
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
              <Link href="/forgot-password" className="text-sm text-slate hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required />
          </div>

          <Button type="submit" size="lg" className="w-full">Sign in</Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-paper px-2 text-slate">Or continue with</span>
          </div>
        </div>

        <form action={signInWithMagicLink} className="space-y-2">
          <input type="hidden" name="next" value={next || ''} />
          <div className="flex space-x-2">
            <Input name="email" type="email" placeholder="Email for magic link" aria-label="Email for a sign in link" required />
            <Button type="submit" variant="outline" className="h-10">Email link</Button>
          </div>
        </form>

        <GoogleButton next={next} />

        <div className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="underline font-medium">Sign up</Link>
        </div>
      </div>
    </main>
  )
}
