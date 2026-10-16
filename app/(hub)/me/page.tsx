import { requireActiveMember } from '@/lib/auth/guards'
import { ProfileForm } from './profile-form'
import { EmailPreferences } from './email-preferences'

export default async function MePage() {
  const { supabase, user } = await requireActiveMember()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  if (!profile) return null
  
  const [{ data: branches }, { data: prefs }] = await Promise.all([
    supabase.from('family_branches').select('id, name').order('sort_order'),
    supabase.from('email_preferences').select('announcements').eq('user_id', user.id).maybeSingle(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif mb-2">Your profile</h1>
        <p className="text-slate">Update your information and manage who can see your contact details.</p>
      </div>

      <ProfileForm profile={profile} branches={branches || []} />

      <section aria-labelledby="email-heading" className="space-y-4 border-t border-rule pt-8">
        <h2 id="email-heading" className="text-2xl font-serif">Email</h2>
        <EmailPreferences announcements={prefs?.announcements ?? true} />
      </section>
    </div>
  )
}
