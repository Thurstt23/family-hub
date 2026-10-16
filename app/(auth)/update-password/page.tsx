import { requireUser } from '@/lib/auth/guards'
import { updatePassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  await requireUser()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-medium font-serif tracking-tight text-ink">Set a new password</h1>
          <p className="text-slate">Choose a new password for your account.</p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-clay/10 text-clay border border-clay/30 rounded-md text-sm">
            {error}
          </div>
        )}

        <form action={updatePassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">New password</label>
            <Input id="password" name="password" type="password" required minLength={10} />
            <p className="text-xs text-slate">Minimum 10 characters.</p>
          </div>

          <Button type="submit" size="lg" className="w-full">Update password</Button>
        </form>
      </div>
    </div>
  )
}
