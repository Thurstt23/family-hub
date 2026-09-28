import { requireActiveMember } from '@/lib/auth/guards'
import { ProfileForm } from './profile-form'

export default async function MePage() {
  const { supabase, user } = await requireActiveMember()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  if (!profile) return null
  
  const { data: branches } = await supabase
    .from('family_branches')
    .select('id, name')
    .order('sort_order')

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif mb-2">Edit Profile</h1>
        <p className="text-slate">Update your information and manage who can see your contact details.</p>
      </div>

      <ProfileForm profile={profile} branches={branches || []} />
    </div>
  )
}
