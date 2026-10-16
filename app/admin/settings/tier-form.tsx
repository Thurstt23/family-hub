'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel, Textarea } from '@/components/ui/native-select'
import { ActionForm } from '@/components/admin/action-form'
import { saveTier } from './actions'

type Tier = {
  id: string
  name: string
  description: string | null
  price_cents: number
  stripe_price_id: string | null
  benefits: unknown
  is_active: boolean
}

export function TierForm({ tier }: { tier: Tier }) {
  const benefits = Array.isArray(tier.benefits) ? (tier.benefits as string[]).join('\n') : ''
  const p = tier.id
  return (
    <ActionForm action={saveTier} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={tier.id} />
      <div>
        <FieldLabel htmlFor={`n-${p}`}>Name</FieldLabel>
        <Input id={`n-${p}`} name="name" required defaultValue={tier.name} />
      </div>
      <div>
        <FieldLabel htmlFor={`pr-${p}`}>Price in US dollars</FieldLabel>
        <Input id={`pr-${p}`} name="price_dollars" type="number" min={0} step="0.01" defaultValue={tier.price_cents / 100} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor={`d-${p}`}>Description</FieldLabel>
        <Input id={`d-${p}`} name="description" defaultValue={tier.description ?? ''} />
      </div>
      <div>
        <FieldLabel htmlFor={`s-${p}`}>Stripe price id</FieldLabel>
        <Input id={`s-${p}`} name="stripe_price_id" defaultValue={tier.stripe_price_id ?? ''} placeholder="price_..." />
      </div>
      <div className="flex items-end gap-2 pb-1.5">
        <input id={`a-${p}`} name="is_active" type="checkbox" defaultChecked={tier.is_active} className="size-4 accent-brass" />
        <label htmlFor={`a-${p}`} className="text-sm">Shown to members</label>
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor={`b-${p}`}>Benefits, one per line</FieldLabel>
        <Textarea id={`b-${p}`} name="benefits" rows={3} defaultValue={benefits} />
      </div>
      <div>
        <Button type="submit">Save tier</Button>
      </div>
    </ActionForm>
  )
}
