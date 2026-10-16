'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminAction, friendlyDbError, type ActionResult } from '@/lib/admin/action'

const tierSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, 'Give the tier a name.'),
  description: z.string().trim().max(500).optional(),
  price_dollars: z.coerce.number().min(0, 'Price cannot be negative.'),
  stripe_price_id: z
    .string()
    .trim()
    .regex(/^(price_[A-Za-z0-9_]+)?$/, 'A Stripe price id starts with price_.')
    .optional(),
  benefits: z.string().optional(),
  is_active: z.literal('on').optional(),
})

// Display fields and the Stripe mapping only. Slug and level drive gating in
// SQL and code, so they are not editable here (05, section 1).
export async function saveTier(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = tierSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' }
  const v = parsed.data
  const row = {
    name: v.name,
    description: v.description || null,
    price_cents: Math.round(v.price_dollars * 100),
    stripe_price_id: v.stripe_price_id || null,
    benefits: (v.benefits ?? '').split('\n').map(s => s.trim()).filter(Boolean),
    is_active: v.is_active === 'on',
  }

  return adminAction({
    action: 'tier.update',
    entity: 'membership_tiers',
    entityId: v.id,
    meta: row,
    roles: ['owner'],
    run: async ({ supabase }) => {
      const { data, error } = await supabase.from('membership_tiers').update(row).eq('id', v.id).select('id')
      if (error) return { ok: false as const, error: error.code === '23505' ? 'That Stripe price is already mapped to another tier.' : friendlyDbError(error.message) }
      if (!data?.length) return { ok: false as const, error: 'Tier not found.' }
      revalidatePath('/admin/settings')
      revalidatePath('/join')
      revalidatePath('/me/membership')
      return { ok: true as const, message: 'Tier saved.' }
    },
  })
}
