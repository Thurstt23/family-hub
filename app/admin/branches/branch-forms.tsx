'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel, NativeSelect } from '@/components/ui/native-select'
import { ActionForm } from '@/components/admin/action-form'
import { assignSteward, saveBranch, unassignSteward } from './actions'

type Branch = { id: string; name: string; slug: string; description: string | null; parent_id: string | null; sort_order: number }

export function BranchEditor({ branch, parents }: { branch: Branch | null; parents: { id: string; name: string }[] }) {
  const p = branch?.id ?? 'new'
  const form = (
    <ActionForm action={saveBranch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
      {branch ? <input type="hidden" name="id" value={branch.id} /> : null}
      <div>
        <FieldLabel htmlFor={`name-${p}`}>Name</FieldLabel>
        <Input id={`name-${p}`} name="name" required defaultValue={branch?.name} />
      </div>
      <div>
        <FieldLabel htmlFor={`slug-${p}`}>Slug</FieldLabel>
        <Input id={`slug-${p}`} name="slug" required defaultValue={branch?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </div>
      <div className="lg:col-span-2">
        <FieldLabel htmlFor={`desc-${p}`}>Description</FieldLabel>
        <Input id={`desc-${p}`} name="description" defaultValue={branch?.description ?? ''} />
      </div>
      <div>
        <FieldLabel htmlFor={`parent-${p}`}>Parent</FieldLabel>
        <NativeSelect id={`parent-${p}`} name="parent_id" defaultValue={branch?.parent_id ?? ''}>
          <option value="">None, top level</option>
          {parents.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </NativeSelect>
      </div>
      <div>
        <FieldLabel htmlFor={`sort-${p}`}>Order</FieldLabel>
        <Input id={`sort-${p}`} name="sort_order" type="number" defaultValue={branch?.sort_order ?? 0} />
      </div>
      <div>
        <Button type="submit">{branch ? 'Save branch' : 'Add branch'}</Button>
      </div>
    </ActionForm>
  )

  if (!branch) return form
  return (
    <details>
      <summary className="cursor-pointer text-sm text-brass">Edit details</summary>
      <div className="mt-3">{form}</div>
    </details>
  )
}

export function StewardControls({ branchId, stewards }: { branchId: string; stewards: { user_id: string; full_name: string }[] }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <ActionForm action={assignSteward} className="flex items-end gap-2">
        <input type="hidden" name="branch_id" value={branchId} />
        <div>
          <FieldLabel htmlFor={`who-${branchId}`}>Add steward by email or handle</FieldLabel>
          <Input id={`who-${branchId}`} name="who" required className="w-64" placeholder="name@example.com" />
        </div>
        <Button type="submit" variant="outline">Assign</Button>
      </ActionForm>
      {stewards.map(s => (
        <ActionForm key={s.user_id} action={unassignSteward} confirm={`Remove ${s.full_name} as steward of this branch?`}>
          <input type="hidden" name="branch_id" value={branchId} />
          <input type="hidden" name="user_id" value={s.user_id} />
          <Button type="submit" size="sm" variant="ghost">Remove {s.full_name}</Button>
        </ActionForm>
      ))}
    </div>
  )
}
