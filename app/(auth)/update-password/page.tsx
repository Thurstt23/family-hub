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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-serif text-ink">Set a new password</h1>
          <p className="text-ink-muted">Choose a new password for your account.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}

        <form action={updatePassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">New password</label>
            <Input id="password" name="password" type="password" required minLength={10} />
            <p className="text-xs text-ink-muted">Minimum 10 characters.</p>
          </div>

          <Button type="submit" className="w-full">Update password</Button>
        </form>
      </div>
    </div>
  )
}
