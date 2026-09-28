import { requireActiveMember } from '@/lib/auth/guards'
import { notFound } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RegisterField } from '@/components/member/register-field'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { supabase, user } = await requireActiveMember()
  const { handle } = await params
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, family_branches(name, slug)')
    .eq('handle', handle)
    .eq('status', 'active')
    .single()
    
  if (!profile) {
    notFound()
  }

  const isSelf = profile.id === user.id
  const branchInfo = (profile.family_branches as any) || null

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <Avatar className="h-24 w-24 border border-rule">
          <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name} sizes="96px" />
          <AvatarFallback className="text-3xl bg-paper text-ink border border-rule">{profile.full_name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-serif mb-1">{profile.full_name}</h1>
          <p className="text-slate">
            {profile.generation ? `Generation ${profile.generation} • ` : ''}
            {branchInfo ? (
              <Link href={`/branches/${branchInfo.slug}`} className="hover:underline text-ink">
                {branchInfo.name} Branch
              </Link>
            ) : 'Unknown Branch'}
          </p>
        </div>
        {isSelf && (
          <Link 
            href="/me"
            className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-8 px-2.5 hover:bg-muted hover:text-foreground"
          >
            Edit Profile
          </Link>
        )}
      </div>

      {profile.bio && (
        <div className="prose prose-sm max-w-none text-ink">
          <p>{profile.bio}</p>
        </div>
      )}

      <div className="border-t border-rule pt-4">
        <h2 className="text-xl font-serif mb-4">Contact & Details</h2>
        <dl>
          {profile.city || profile.country ? (
            <RegisterField label="Location">
              {[profile.city, profile.country].filter(Boolean).join(', ')}
            </RegisterField>
          ) : null}
          
          {(profile.show_email || isSelf) && profile.email ? (
            <RegisterField label="Email">
              <a href={`mailto:${profile.email}`} className="text-brass hover:underline">{profile.email}</a>
              {isSelf && !profile.show_email && <span className="ml-2 text-xs text-slate">(Hidden from others)</span>}
            </RegisterField>
          ) : null}
          
          {(profile.show_phone || isSelf) && profile.phone ? (
            <RegisterField label="Phone">
              <a href={`tel:${profile.phone}`} className="text-brass hover:underline">{profile.phone}</a>
              {isSelf && !profile.show_phone && <span className="ml-2 text-xs text-slate">(Hidden from others)</span>}
            </RegisterField>
          ) : null}
          
          {(profile.show_birthday || isSelf) && profile.birthday ? (
            <RegisterField label="Birthday">
              {new Date(profile.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}
              {isSelf && !profile.show_birthday && <span className="ml-2 text-xs text-slate">(Hidden from others)</span>}
            </RegisterField>
          ) : null}
        </dl>
      </div>
    </div>
  )
}
