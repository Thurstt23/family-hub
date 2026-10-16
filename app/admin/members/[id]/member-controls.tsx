'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel, NativeSelect } from '@/components/ui/native-select'
import { ActionForm } from '@/components/admin/action-form'
import {
  approveMember,
  archiveMember,
  grantRole,
  overrideMembership,
  reinstateMember,
  revokeRole,
  suspendMember,
} from '../actions'

export function MemberStatusActions({ id, name, status }: { id: string; name: string; status: string }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      {status === 'pending' ? (
        <ActionForm action={approveMember}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit">Send approval</Button>
        </ActionForm>
      ) : null}

      {status === 'active' ? (
        <ActionForm action={suspendMember} confirm={`Suspend ${name}? They lose access on their next request.`} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <div>
            <FieldLabel htmlFor="suspend-reason">Reason, sent to the member</FieldLabel>
            <Input id="suspend-reason" name="reason" required minLength={3} className="w-72" />
          </div>
          <Button type="submit" variant="destructive">Suspend</Button>
        </ActionForm>
      ) : null}

      {status === 'suspended' || status === 'archived' ? (
        <ActionForm action={reinstateMember}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="outline">Reinstate</Button>
        </ActionForm>
      ) : null}

      {status !== 'archived' ? (
        <ActionForm
          action={archiveMember}
          confirm={`Archive ${name}? They are hidden from the directory and can no longer sign in. Their data is kept.`}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="id" value={id} />
          <div>
            <FieldLabel htmlFor="archive-note">Note (optional)</FieldLabel>
            <Input id="archive-note" name="note" className="w-60" placeholder="For example: left the family group" />
          </div>
          <Button type="submit" variant="ghost">Archive</Button>
        </ActionForm>
      ) : null}
    </div>
  )
}

const ROLES = ['steward', 'admin', 'owner'] as const

export function RoleControls({ id, held, isSelf }: { id: string; held: string[]; isSelf: boolean }) {
  const grantable = ROLES.filter(r => !held.includes(r))
  const revocable = ROLES.filter(r => held.includes(r))
  return (
    <div className="flex flex-wrap gap-6">
      {grantable.length ? (
        <ActionForm action={grantRole} className="flex items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <div>
            <FieldLabel htmlFor="grant-role">Grant role</FieldLabel>
            <NativeSelect id="grant-role" name="role" className="w-40">
              {grantable.map(r => <option key={r} value={r}>{r}</option>)}
            </NativeSelect>
          </div>
          <Button type="submit" variant="outline">Grant</Button>
        </ActionForm>
      ) : null}
      {revocable.length && !isSelf ? (
        <ActionForm action={revokeRole} confirm="Revoke this role? It takes effect on the member's next request." className="flex items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <div>
            <FieldLabel htmlFor="revoke-role">Revoke role</FieldLabel>
            <NativeSelect id="revoke-role" name="role" className="w-40">
              {revocable.map(r => <option key={r} value={r}>{r}</option>)}
            </NativeSelect>
          </div>
          <Button type="submit" variant="destructive">Revoke</Button>
        </ActionForm>
      ) : null}
      {isSelf ? <p className="text-sm text-slate">You cannot revoke your own roles.</p> : null}
    </div>
  )
}

export function MembershipOverrideForm({ id, tiers }: { id: string; tiers: { id: string; name: string }[] }) {
  return (
    <details className="rounded-md border border-rule bg-card p-4">
      <summary className="cursor-pointer text-sm font-medium">Grant a membership manually</summary>
      <ActionForm action={overrideMembership} className="mt-4 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="id" value={id} />
        <div>
          <FieldLabel htmlFor="ov-tier">Tier</FieldLabel>
          <NativeSelect id="ov-tier" name="tier_id" required>
            {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </NativeSelect>
        </div>
        <div>
          <FieldLabel htmlFor="ov-expiry">Expires on</FieldLabel>
          <Input id="ov-expiry" name="expires_at" type="date" required />
        </div>
        <div className="sm:col-span-3">
          <FieldLabel htmlFor="ov-note">Why (required)</FieldLabel>
          <Input id="ov-note" name="note" required minLength={3} placeholder="For example: gifted by the reunion committee" />
        </div>
        <div className="sm:col-span-3">
          <Button type="submit">Grant membership</Button>
        </div>
      </ActionForm>
    </details>
  )
}
