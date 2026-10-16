'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminAction, friendlyDbError, type ActionResult } from '@/lib/admin/action'
import { BULK_LIMIT } from '@/lib/admin/members-query'
import { sendStatusUpdate, sendWelcome } from '@/lib/email/send'

const uuid = z.string().uuid()

function revalidateMember(id?: string) {
  revalidatePath('/admin')
  revalidatePath('/admin/approvals')
  revalidatePath('/admin/members')
  if (id) revalidatePath(`/admin/members/${id}`)
  revalidatePath('/directory')
}

type Recipient = { id: string; email: string | null; full_name: string }

// ---------------------------------------------------------------- approvals

export async function approveMember(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'))
  if (!id.success) return { ok: false, error: 'Missing member id.' }

  return adminAction({
    action: 'member.approve',
    entity: 'profiles',
    entityId: id.data,
    run: async ({ supabase }) => {
      // RLS limits stewards to their own branches; for anyone else this
      // matches zero rows rather than erroring, so check what came back.
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: 'active', rejection_reason: null })
        .eq('id', id.data)
        .eq('status', 'pending')
        .select('id, email, full_name, status')
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      const row = data?.[0] as (Recipient & { status: string }) | undefined
      if (!row || row.status !== 'active') {
        return { ok: false as const, error: 'Not approved. The member may already be reviewed, or is outside your branches.' }
      }
      await sendWelcome(row)
      revalidateMember(id.data)
      return { ok: true as const, message: `${row.full_name} approved. A welcome email is on its way.` }
    },
  })
}

const reasonSchema = z.string().trim().min(3, 'Write a short reason the member will see.').max(1000)

export async function rejectMember(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'))
  const reason = reasonSchema.safeParse(fd.get('reason'))
  if (!id.success) return { ok: false, error: 'Missing member id.' }
  if (!reason.success) return { ok: false, error: reason.error.issues[0]?.message ?? 'A reason is required.' }

  return adminAction({
    action: 'member.reject',
    entity: 'profiles',
    entityId: id.data,
    meta: { reason: reason.data },
    run: async ({ supabase }) => {
      // Rejection is soft: the row stays pending with a note (04, section 2).
      const { data, error } = await supabase
        .from('profiles')
        .update({ rejection_reason: reason.data })
        .eq('id', id.data)
        .eq('status', 'pending')
        .select('id, email, full_name')
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      const row = data?.[0] as Recipient | undefined
      if (!row) return { ok: false as const, error: 'Not updated. The member is outside your branches or no longer pending.' }
      await sendStatusUpdate(row, 'rejected', reason.data)
      revalidateMember(id.data)
      return { ok: true as const, message: 'Request declined and the member was told why.' }
    },
  })
}

export async function requestInfo(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'))
  const message = reasonSchema.safeParse(fd.get('message'))
  if (!id.success) return { ok: false, error: 'Missing member id.' }
  if (!message.success) return { ok: false, error: 'Say what information you need.' }

  return adminAction({
    action: 'member.request_info',
    entity: 'profiles',
    entityId: id.data,
    meta: { message: message.data },
    run: async ({ supabase }) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, status')
        .eq('id', id.data)
        .maybeSingle()
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      if (!data || data.status !== 'pending') return { ok: false as const, error: 'That member is not in your queue.' }
      const sent = await sendStatusUpdate(data as Recipient, 'info_requested', message.data)
      return sent
        ? { ok: true as const, message: 'Request for information sent.' }
        : { ok: false as const, error: 'The email could not be sent. Check the email settings.' }
    },
  })
}

// ---------------------------------------------------------------- status (admin)

async function setStatus(
  id: string,
  status: 'active' | 'suspended' | 'archived',
  action: string,
  reason: string | null,
  email: 'suspended' | 'reinstated' | null
): Promise<ActionResult> {
  return adminAction({
    action,
    entity: 'profiles',
    entityId: id,
    meta: reason ? { reason } : {},
    roles: ['admin', 'owner'],
    run: async ({ supabase, user }) => {
      if (id === user.id) return { ok: false as const, error: 'You cannot change your own status.' }
      const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', id)
        .select('id, email, full_name')
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      const row = data?.[0] as Recipient | undefined
      if (!row) return { ok: false as const, error: 'Member not found.' }
      if (email) await sendStatusUpdate(row, email, reason)
      revalidateMember(id)
      return { ok: true as const, message: `${row.full_name} is now ${status}.` }
    },
  })
}

export async function suspendMember(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'))
  const reason = reasonSchema.safeParse(fd.get('reason'))
  if (!id.success) return { ok: false, error: 'Missing member id.' }
  if (!reason.success) return { ok: false, error: 'Write a short reason the member will see.' }
  return setStatus(id.data, 'suspended', 'member.suspend', reason.data, 'suspended')
}

export async function reinstateMember(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'))
  if (!id.success) return { ok: false, error: 'Missing member id.' }
  return setStatus(id.data, 'active', 'member.reinstate', null, 'reinstated')
}

export async function archiveMember(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'))
  if (!id.success) return { ok: false, error: 'Missing member id.' }
  const note = typeof fd.get('note') === 'string' ? (fd.get('note') as string).trim() || null : null
  // Archive hides the member from the directory and keeps every row. There is
  // no hard delete from the UI (06, section 5).
  return setStatus(id.data, 'archived', 'member.archive', note, null)
}

// ---------------------------------------------------------------- roles (owner)

const grantableRole = z.enum(['steward', 'admin', 'owner'])

export async function grantRole(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'))
  const role = grantableRole.safeParse(fd.get('role'))
  if (!id.success || !role.success) return { ok: false, error: 'Choose a role to grant.' }

  return adminAction({
    action: 'role.grant',
    entity: 'user_roles',
    entityId: id.data,
    meta: { role: role.data },
    roles: ['owner'],
    run: async ({ supabase, user }) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: id.data, role: role.data, granted_by: user.id }, { onConflict: 'user_id,role', ignoreDuplicates: true })
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      revalidateMember(id.data)
      return { ok: true as const, message: `Granted ${role.data}.` }
    },
  })
}

export async function revokeRole(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'))
  const role = grantableRole.safeParse(fd.get('role'))
  if (!id.success || !role.success) return { ok: false, error: 'Choose a role to revoke.' }

  return adminAction({
    action: 'role.revoke',
    entity: 'user_roles',
    entityId: id.data,
    meta: { role: role.data },
    roles: ['owner'],
    run: async ({ supabase, user }) => {
      // Checked here for a clear message; the user_roles_protect trigger is
      // the real guard for both rules.
      if (id.data === user.id) return { ok: false as const, error: 'You cannot revoke your own role.' }
      const { data, error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', id.data)
        .eq('role', role.data)
        .select('role')
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      if (!data?.length) return { ok: false as const, error: 'That member does not hold this role.' }
      if (role.data === 'steward') {
        await supabase.from('branch_stewards').delete().eq('user_id', id.data)
      }
      revalidateMember(id.data)
      return { ok: true as const, message: `Revoked ${role.data}.` }
    },
  })
}

// ---------------------------------------------------------------- membership override (admin)

const overrideSchema = z.object({
  id: z.string().uuid(),
  tier_id: z.string().uuid('Choose a tier.'),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'An expiry date is required.'),
  note: z.string().trim().min(3, 'A note explaining the override is required.').max(500),
})

export async function overrideMembership(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = overrideSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' }
  const { id, tier_id, expires_at, note } = parsed.data
  const expiry = new Date(`${expires_at}T23:59:59Z`)
  if (expiry <= new Date()) return { ok: false, error: 'The expiry date must be in the future.' }

  return adminAction({
    action: 'membership.override',
    entity: 'memberships',
    entityId: id,
    meta: { tier_id, expires_at, note },
    roles: ['admin', 'owner'],
    run: async ({ supabase, user }) => {
      const { data, error } = await supabase
        .from('memberships')
        .update({
          tier_id,
          status: 'active',
          current_period_end: expiry.toISOString(),
          cancel_at_period_end: true,
          override_note: note,
          override_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', id)
        .select('id')
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      if (!data?.length) return { ok: false as const, error: 'This member has no membership row.' }
      revalidateMember(id)
      revalidatePath('/admin/memberships')
      return { ok: true as const, message: 'Membership granted until the expiry date.' }
    },
  })
}

// ---------------------------------------------------------------- bulk (admin)

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Select at least one member.').max(BULK_LIMIT, `Bulk actions are capped at ${BULK_LIMIT} rows.`),
  action: z.enum(['approve', 'suspend', 'assign_branch']),
  branchId: z.string().uuid().optional(),
  confirmCount: z.number().int().optional(),
})

export async function bulkMemberAction(input: z.input<typeof bulkSchema>): Promise<ActionResult> {
  const parsed = bulkSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  const { ids, action, branchId, confirmCount } = parsed.data
  // Above 50 rows the admin must type the count (06, section 5). The client
  // asks; the server refuses if the typed number does not match.
  if (ids.length > 50 && confirmCount !== ids.length) {
    return { ok: false, error: `Type ${ids.length} to confirm this bulk action.` }
  }
  if (action === 'assign_branch' && !branchId) return { ok: false, error: 'Choose a branch.' }

  return adminAction({
    action: `members.bulk_${action}`,
    entity: 'profiles',
    entityId: `${ids.length} rows`,
    meta: { ids, branch_id: branchId ?? null },
    roles: ['admin', 'owner'],
    run: async ({ supabase, user }) => {
      const targets = ids.filter(i => i !== user.id)
      let q
      if (action === 'approve') {
        q = supabase.from('profiles').update({ status: 'active', rejection_reason: null }).in('id', targets).eq('status', 'pending')
      } else if (action === 'suspend') {
        q = supabase.from('profiles').update({ status: 'suspended' }).in('id', targets).eq('status', 'active')
      } else {
        q = supabase.from('profiles').update({ branch_id: branchId }).in('id', targets)
      }
      const { data, error } = await q.select('id, email, full_name')
      if (error) return { ok: false as const, error: friendlyDbError(error.message) }
      const rows = (data ?? []) as Recipient[]
      if (action === 'approve') {
        await Promise.all(rows.map(r => sendWelcome(r)))
      }
      revalidateMember()
      return { ok: true as const, message: `${rows.length} of ${ids.length} members updated.` }
    },
  })
}
