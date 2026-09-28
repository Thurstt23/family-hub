import { requireUser } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { submitOnboarding } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { redirect } from 'next/navigation'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const { user, supabase } = await requireUser()
  
  // Check if they already onboarded
  const { data: profile } = await supabase
    .from('profiles')
    .select('status, branch_id, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.branch_id && profile?.status === 'active') {
    redirect('/hub')
  }

  if (profile?.branch_id && profile?.status === 'pending') {
    redirect('/pending')
  }

  // Fetch branches for the select
  const { data: branches } = await supabase
    .from('family_branches')
    .select('id, name')
    .order('sort_order')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold font-serif text-ink">Welcome to Martin Sawyer Reunion</h1>
          <p className="text-ink-muted">Please complete your profile to request access.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}

        <form action={submitOnboarding} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">Basic Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input name="full_name" required defaultValue={profile?.full_name || ''} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Family Branch</label>
                <Select name="branch_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input name="city" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Input name="country" required />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">Optional Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Birthday</label>
                <Input name="birthday" type="date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Short Bio</label>
                <Input name="bio" placeholder="A few words about you" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">Privacy Settings</h2>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 text-sm">
                <input type="checkbox" name="show_email" className="rounded border-border" />
                <span>Show my email to other active members</span>
              </label>
              <label className="flex items-center space-x-3 text-sm">
                <input type="checkbox" name="show_phone" className="rounded border-border" />
                <span>Show my phone number to other active members</span>
              </label>
              <label className="flex items-center space-x-3 text-sm">
                <input type="checkbox" name="show_birthday" defaultChecked className="rounded border-border" />
                <span>Show my birthday (month/day only) to other active members</span>
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full">Submit Profile</Button>
        </form>
      </div>
    </div>
  )
}
