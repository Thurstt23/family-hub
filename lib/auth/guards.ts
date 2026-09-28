import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function requireActiveMember() {
  const { supabase, user } = await requireUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, handle, full_name, avatar_url, status, branch_id')
    .eq('id', user.id)
    .single()
    
  if (!profile || !profile.branch_id) {
    redirect('/onboarding')
  }
  
  if (profile.status === 'pending')   redirect('/pending')
  if (profile.status === 'suspended') redirect('/suspended')
  if (profile.status === 'archived')  redirect('/login') // archived can't login

  return { supabase, user, profile }
}

export async function requireRole(roles: Array<'steward'|'admin'|'owner'>) {
  const ctx = await requireActiveMember()
  const { data } = await ctx.supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', ctx.user.id)
    
  const held = (data ?? []).map(r => r.role)
  if (!roles.some(r => held.includes(r as any))) {
    redirect('/hub')
  }
  
  return { ...ctx, roles: held }
}
