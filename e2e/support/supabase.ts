import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Test-only helpers. The service role key arranges fixtures (users, roles,
// events); assertions always go through the app or through an anon or
// signed-in client, so RLS is what is being tested.

export const SUPABASE_URL = must('NEXT_PUBLIC_SUPABASE_URL')
export const ANON_KEY = must('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const SERVICE_KEY = must('SUPABASE_SERVICE_ROLE_KEY')

export const PASSWORD = 'e2e-Correct-Horse-42'

export const USERS = {
  owner: { email: 'e2e-owner@example.test', name: 'Edith Owner', roles: ['owner'], branch: 'martin-savannah' },
  admin: { email: 'e2e-admin@example.test', name: 'Arthur Admin', roles: ['admin'], branch: 'martin-savannah' },
  steward: { email: 'e2e-steward@example.test', name: 'Stella Steward', roles: ['steward'], branch: 'martin-savannah' },
  member: { email: 'e2e-member@example.test', name: 'Milo Member', roles: [], branch: 'sawyer-charleston' },
  patron: { email: 'e2e-patron@example.test', name: 'Petra Patron', roles: [], branch: 'sawyer-marsh' },
  private: { email: 'e2e-private@example.test', name: 'Quentin Quietly', roles: [], branch: 'sawyer-charleston' },
} as const

export type UserKey = keyof typeof USERS

function must(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set; the e2e suite reads .env.local`)
  return v
}

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function signedInClient(email: string, password = PASSWORD): Promise<SupabaseClient> {
  const c = anonClient()
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign in as ${email} failed: ${error.message}`)
  return c
}

export async function userId(email: string): Promise<string> {
  const { data } = await serviceClient().from('profiles').select('id').eq('email', email).single()
  if (!data) throw new Error(`no profile for ${email}`)
  return data.id
}

export async function branchId(slug: string): Promise<string> {
  const { data, error } = await serviceClient().from('family_branches').select('id').eq('slug', slug).single()
  if (error || !data) throw new Error(`branch ${slug} missing; run supabase db reset to load seed.sql`)
  return data.id
}

async function findAuthUser(email: string): Promise<string | undefined> {
  const svc = serviceClient()
  for (let page = 1; ; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const hit = data.users.find(u => u.email === email)
    if (hit) return hit.id
    if (data.users.length < 1000) return undefined
  }
}

// Create (or reset) a confirmed auth user and shape their profile. The
// signup trigger creates the profile, member role and free membership.
export async function ensureUser(
  email: string,
  opts: { name: string; status?: 'pending' | 'active' | 'suspended'; branch?: string | null; roles?: readonly string[] }
): Promise<string> {
  const svc = serviceClient()
  let id = await findAuthUser(email)
  if (!id) {
    const { data, error } = await svc.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: opts.name },
    })
    if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`)
    id = data.user.id
  } else {
    await svc.auth.admin.updateUserById(id, { password: PASSWORD })
  }

  const branch = opts.branch ? await branchId(opts.branch) : null
  const { error: pErr } = await svc
    .from('profiles')
    .update({
      full_name: opts.name,
      status: opts.status ?? 'active',
      branch_id: branch,
      city: 'Savannah',
      country: 'USA',
      rejection_reason: null,
      reviewed_at: null,
    })
    .eq('id', id)
  if (pErr) throw new Error(`profile ${email}: ${pErr.message}`)

  for (const role of new Set(['member', ...(opts.roles ?? [])])) {
    await svc.from('user_roles').upsert({ user_id: id, role }, { onConflict: 'user_id,role', ignoreDuplicates: true })
  }
  return id
}

// Removes a throwaway user created by a test. The profile cascade takes its
// rows with it.
export async function deleteUser(email: string) {
  const id = await findAuthUser(email)
  if (id) await serviceClient().auth.admin.deleteUser(id)
}

export async function setTier(userId: string, slug: string) {
  const svc = serviceClient()
  const { data: tier } = await svc.from('membership_tiers').select('id').eq('slug', slug).single()
  const { error } = await svc
    .from('memberships')
    .update({
      tier_id: tier!.id,
      status: 'active',
      current_period_end: slug === 'free' ? null : new Date(Date.now() + 365 * 86400000).toISOString(),
    })
    .eq('user_id', userId)
  if (error) throw error
}
