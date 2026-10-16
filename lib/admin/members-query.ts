import type { SupabaseClient } from '@supabase/supabase-js'

export const MEMBERS_PAGE_SIZE = 50
export const BULK_LIMIT = 200
export const EXPORT_LIMIT = 10_000

export type MemberFilters = {
  search?: string
  status?: string
  role?: string
  tier?: string
  branch?: string
  city?: string
  from?: string
  to?: string
}

const STATUSES = new Set(['pending', 'active', 'suspended', 'archived'])
const ROLES = new Set(['member', 'steward', 'admin', 'owner'])

export function parseMemberFilters(sp: Record<string, string | string[] | undefined>): MemberFilters {
  const pick = (k: string) => (typeof sp[k] === 'string' && sp[k] ? (sp[k] as string) : undefined)
  const status = pick('status')
  const role = pick('role')
  return {
    search: pick('search'),
    status: status && STATUSES.has(status) ? status : undefined,
    role: role && ROLES.has(role) ? role : undefined,
    tier: pick('tier'),
    branch: pick('branch'),
    city: pick('city'),
    from: pick('from'),
    to: pick('to'),
  }
}

export function filtersToQueryString(f: MemberFilters, extra: Record<string, string> = {}) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) params.set(k, String(v))
  return params.toString()
}

// `user_roles` has two foreign keys into `profiles` (user_id, granted_by), so
// every embed names the one it means. Filtering by role or tier uses a second,
// inner-joined alias so the displayed role list stays complete.
export function buildMembersQuery(
  supabase: SupabaseClient,
  f: MemberFilters,
  columns: string,
  count: 'estimated' | 'exact' | undefined = 'estimated'
) {
  let select = columns
  if (f.role) select += ', role_filter:user_roles!user_roles_user_id_fkey!inner(role)'
  if (f.tier) select += ', tier_filter:memberships!inner(tier_id)'

  let q = supabase.from('profiles').select(select, count ? { count } : undefined)

  if (f.search) q = q.textSearch('search_vector', f.search, { type: 'websearch' })
  if (f.status) q = q.eq('status', f.status)
  if (f.branch) q = q.eq('branch_id', f.branch)
  if (f.city) q = q.ilike('city', `%${f.city}%`)
  if (f.from) q = q.gte('created_at', f.from)
  if (f.to) q = q.lte('created_at', `${f.to}T23:59:59.999Z`)
  if (f.role) q = q.eq('role_filter.role', f.role)
  if (f.tier) q = q.eq('tier_filter.tier_id', f.tier)

  return q
}

export const MEMBER_GRID_COLUMNS =
  'id, handle, full_name, email, city, status, created_at, branch_id, ' +
  'branch:family_branches!profiles_branch_id_fkey(name), ' +
  'roles:user_roles!user_roles_user_id_fkey(role), ' +
  'membership:memberships(status, current_period_end, tier:membership_tiers(name, level))'

export type MemberGridRow = {
  id: string
  handle: string
  full_name: string
  email: string | null
  city: string | null
  status: 'pending' | 'active' | 'suspended' | 'archived'
  created_at: string
  branch_id: string | null
  branch: { name: string } | null
  roles: { role: string }[]
  membership: {
    status: string
    current_period_end: string | null
    tier: { name: string; level: number } | null
  } | null
}

// PostgREST returns a to-one embed as an object, but older clients sometimes
// type it as an array. Normalise either shape.
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
