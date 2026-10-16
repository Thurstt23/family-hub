'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminAction, friendlyDbError, type ActionResult } from '@/lib/admin/action'

const branchSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(2, 'Give the branch a name.'),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes in the slug.'),
  description: z.string().trim().max(500).optional(),
  parent_id: z.string().uuid().optional().or(z.literal('')),
  sort_order: z.coerce.number().int().default(0),
})

function revalidateBranches() {
  revalidatePath('/admin/branches')
  revalidatePath('/branches')
  revalidatePath('/')
}

export async function saveBranch(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = branchSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' }
  const { id, ...v } = parsed.data
  if (id && v.parent_id === id) return { ok: false, error: 'A branch cannot be its own parent.' }
  const row = { ...v, description: v.description || null, parent_id: v.parent_id || null }

  return adminAction({
    action: id ? 'branch.update' : 'branch.create',
    entity: 'family_branches',
    entityId: id || v.slug,
    meta: row,
    roles: ['admin', 'owner'],
    run: async ({ supabase }) => {
      const { error } = id
        ? await supabase.from('family_branches').update(row).eq('id', id)
        : await supabase.from('family_branches').insert(row)
      if (error) return { ok: false as const, error: error.code === '23505' ? 'That slug is already used.' : friendlyDbError(error.message) }
      revalidateBranches()
      return { ok: true as const, message: id ? 'Branch saved.' : 'Branch created.' }
    },
  })
}

// Steward assignment is owner only, matching the branch_stewards policy and
// the "grant or revoke roles" row in 06, section 6.
export async function assignSteward(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const branchId = z.string().uuid().safeParse(fd.get('branch_id'))
  const who = z.string().trim().min(2).safeParse(fd.get('who'))
  if (!branchId.success) return { ok: false, error: 'Missing branch.' }
  if (!who.success) return { ok: false, error: 'Enter the member’s email or handle.' }

  const needle = who.data.replace(/^@/, '').toLowerCase()
  return adminAction({
    action: 'steward.assign',
    entity: 'branch_stewards',
    entityId: branchId.data,
    meta: { who: needle },
    roles: ['owner'],
    run: async ({ supabase, user }) => {
      const column = needle.includes('@') ? 'email' : 'handle'
      const { data: member } = await supabase
        .from('profiles')
        .select('id, full_name, status')
        .eq(column, needle)
        .maybeSingle()
      if (!member) return { ok: false as const, error: 'No member has that email or handle.' }
      if (member.status !== 'active') return { ok: false as const, error: `${member.full_name} is not an active member yet.` }

      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: member.id, role: 'steward', granted_by: user.id }, { onConflict: 'user_id,role', ignoreDuplicates: true })
      if (roleError) return { ok: false as const, error: friendlyDbError(roleError.message) }

      const { error } = await supabase
        .from('branch_stewards')
        .upsert({ user_id: member.id, branch_id: branchId.data }, { onConflict: 'user_id,branch_id', ignoreDuplicates: true })
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      revalidateBranches()
      return { ok: true as const, message: `${member.full_name} now stewards this branch.` }
    },
  })
}

export async function unassignSteward(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const branchId = z.string().uuid().safeParse(fd.get('branch_id'))
  const userId = z.string().uuid().safeParse(fd.get('user_id'))
  if (!branchId.success || !userId.success) return { ok: false, error: 'Missing steward.' }

  return adminAction({
    action: 'steward.unassign',
    entity: 'branch_stewards',
    entityId: branchId.data,
    meta: { user_id: userId.data },
    roles: ['owner'],
    run: async ({ supabase }) => {
      const { error } = await supabase.from('branch_stewards').delete().eq('branch_id', branchId.data).eq('user_id', userId.data)
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      revalidateBranches()
      return { ok: true as const, message: 'Removed from this branch. Their steward role stays until revoked on their member page.' }
    },
  })
}
