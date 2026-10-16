import 'server-only'
import { requireRole } from '@/lib/auth/guards'

export type StaffRole = 'steward' | 'admin' | 'owner'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string }

type AdminContext = Awaited<ReturnType<typeof requireRole>>

// Every mutating admin action goes through here so nothing escapes the log
// (06, section 4). The audit row is written with the acting user's own
// session; the "staff write own audit rows" policy is what permits it.
export async function adminAction<T>(opts: {
  action: string
  entity: string
  entityId: string
  meta?: Record<string, unknown>
  roles?: StaffRole[]
  run: (ctx: AdminContext) => Promise<T>
}): Promise<T> {
  const ctx = await requireRole(opts.roles ?? ['steward', 'admin', 'owner'])
  const result = await opts.run(ctx)
  // An action that reports { ok: false } changed nothing, so there is nothing to record.
  if (isFailure(result)) return result
  const { error } = await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: opts.action,
    entity: opts.entity,
    entity_id: opts.entityId,
    meta: opts.meta ?? {},
  })
  if (error) {
    console.error(`[audit] failed to record ${opts.action} on ${opts.entity}/${opts.entityId}:`, error.message)
  }
  return result
}

function isFailure(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'ok' in value && (value as { ok: unknown }).ok === false
}

// Postgres errors raised by our triggers and RLS come back as plain messages.
// Turn the common ones into something an admin can act on.
export function friendlyDbError(message: string | undefined): string {
  if (!message) return 'Something went wrong. Try again.'
  if (message.includes('row-level security')) return 'You do not have permission to do that.'
  return message
}
