import { signup } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { GoogleButton } from '@/components/auth/google-button'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string, success?: string }> }) {
  const { error, success } = await searchParams

  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-serif text-ink">Join Martin Sawyer Reunion</h1>
          <p className="text-slate">Create an account to connect with the family.</p>
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

        <form action={signup} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input id="password" name="password" type="password" required minLength={10} />
            <p className="text-xs text-slate">Minimum 10 characters.</p>
          </div>

          <Button type="submit" className="w-full">Sign up</Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-paper px-2 text-slate">or</span>
          </div>
        </div>

        <GoogleButton label="Sign up with Google" />

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline font-medium">Sign in</Link>
        </div>
      </div>
    </main>
  )
}
