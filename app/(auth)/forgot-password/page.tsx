import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { redirect } from 'next/navigation'

async function resetPassword(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent('Email is required')}`)
  }
  
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }
  redirect(`/forgot-password?success=${encodeURIComponent('Password reset link sent to your email.')}`)
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string, success?: string }> }) {
  const { error, success } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-serif text-ink">Reset password</h1>
          <p className="text-ink-muted">Enter your email and we&apos;ll send you a reset link.</p>
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

        <form action={resetPassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>

          <Button type="submit" className="w-full">Send reset link</Button>
        </form>

        <div className="text-center text-sm">
          <Link href="/login" className="underline font-medium">Back to login</Link>
        </div>
      </div>
    </div>
  )
}
