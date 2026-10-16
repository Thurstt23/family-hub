import { requireRole } from '@/lib/auth/guards'
import { csvRow } from '@/lib/csv'
import { EXPORT_LIMIT, buildMembersQuery, parseMemberFilters, one } from '@/lib/admin/members-query'

export const dynamic = 'force-dynamic'

const BATCH = 1000
const COLUMNS =
  'id, handle, full_name, email, phone, city, country, generation, status, created_at, ' +
  'branch:family_branches!profiles_branch_id_fkey(name), ' +
  'membership:memberships(status, current_period_end, tier:membership_tiers(name))'

type ExportRow = {
  id: string
  handle: string
  full_name: string
  email: string | null
  phone: string | null
  city: string | null
  country: string | null
  generation: number | null
  status: string
  created_at: string
  branch: { name: string } | { name: string }[] | null
  membership: { status: string; current_period_end: string | null; tier: { name: string } | { name: string }[] | null } | null
}

// Exporting a family's contact list is a privacy event, so the export is
// recorded before the first byte is sent (06, section 3). Streams in batches
// of 1,000 with a hard cap of 10,000 rows.
export async function GET(req: Request) {
  const { supabase, user } = await requireRole(['admin', 'owner'])
  const url = new URL(req.url)
  const filters = parseMemberFilters(Object.fromEntries(url.searchParams))

  const { error: auditError } = await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'members.export',
    entity: 'profiles',
    entity_id: null,
    meta: { filters, limit: EXPORT_LIMIT },
  })
  if (auditError) {
    // No audit row, no export.
    return new Response('Could not record the export, so it was not started.', { status: 500 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          csvRow(['id', 'handle', 'full_name', 'email', 'phone', 'city', 'country', 'generation', 'branch', 'status', 'tier', 'membership_status', 'membership_ends', 'joined'])
        )
      )
      for (let offset = 0; offset < EXPORT_LIMIT; offset += BATCH) {
        const { data, error } = await buildMembersQuery(supabase, filters, COLUMNS, undefined)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, Math.min(offset + BATCH, EXPORT_LIMIT) - 1)
        if (error) {
          controller.enqueue(encoder.encode(csvRow([`# export stopped: ${error.message}`])))
          break
        }
        const rows = (data ?? []) as unknown as ExportRow[]
        for (const r of rows) {
          const m = r.membership
          controller.enqueue(
            encoder.encode(
              csvRow([
                r.id, r.handle, r.full_name, r.email, r.phone, r.city, r.country, r.generation,
                one(r.branch)?.name, r.status, one(m?.tier)?.name ?? 'Free', m?.status, m?.current_period_end, r.created_at,
              ])
            )
          )
        }
        if (rows.length < BATCH) break
      }
      controller.close()
    },
  })

  const stamp = new Date().toISOString().slice(0, 10)
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="members-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
