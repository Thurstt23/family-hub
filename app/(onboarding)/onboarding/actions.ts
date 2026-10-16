'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/guards'
import { sendPendingReceived } from '@/lib/email/send'

export async function submitOnboarding(formData: FormData) {
  const { user, supabase } = await requireUser()

  const fullName = formData.get('full_name') as string
  const branchId = formData.get('branch_id') as string
  const city = formData.get('city') as string
  const country = formData.get('country') as string
  const bio = formData.get('bio') as string
  const birthday = formData.get('birthday') as string
  const showEmail = formData.get('show_email') === 'on'
  const showPhone = formData.get('show_phone') === 'on'
  const showBirthday = formData.get('show_birthday') === 'on'

  if (!fullName || !branchId || !city || !country) {
    redirect(`/onboarding?error=${encodeURIComponent('Please fill in all required fields.')}`)
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      branch_id: branchId,
      city,
      country,
      bio: bio || null,
      birthday: birthday || null,
      show_email: showEmail,
      show_phone: showPhone,
      show_birthday: showBirthday,
      // Status remains unchanged (likely 'pending'), RLS allows update of own profile except status (via trigger)
    })
    .eq('id', user.id)

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`)
  }

  // "We received your request" (04, section 7). Only on the first completed
  // onboarding, not when a declined member edits their details again.
  const { data: current } = await supabase.from('profiles').select('status, reviewed_at').eq('id', user.id).single()
  if (current?.status === 'pending' && !current.reviewed_at) {
    await sendPendingReceived({ email: user.email ?? null, full_name: fullName })
  }

  revalidatePath('/')
  redirect('/pending')
}
