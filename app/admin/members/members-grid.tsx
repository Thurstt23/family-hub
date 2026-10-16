'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { flexRender, type RowSelectionState } from '@tanstack/react-table'
import { useLegacyTable, legacyCreateColumnHelper, type LegacyColumnDef } from '@tanstack/react-table/legacy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DateStamp, StatusPill, TierBadge } from '@/components/admin/marks'
import { ActionMessage } from '@/components/admin/action-form'
import { BULK_LIMIT, type MemberGridRow } from '@/lib/admin/members-query'
import type { ActionResult } from '@/lib/admin/action'
import { bulkMemberAction } from './actions'

type BulkKind = 'approve' | 'suspend' | 'assign_branch'
const BULK_LABEL: Record<BulkKind, string> = {
  approve: 'Approve',
  suspend: 'Suspend',
  assign_branch: 'Assign branch',
}

const col = legacyCreateColumnHelper<MemberGridRow>()

// TanStack Table in manual mode: the server already filtered and paginated,
// the table only renders the 50 rows it was handed and tracks selection.
export function MembersGrid({ rows, branches }: { rows: MemberGridRow[]; branches: { id: string; name: string }[] }) {
  const router = useRouter()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [bulk, setBulk] = useState<BulkKind>('approve')
  const [branchId, setBranchId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  const columns = useMemo<LegacyColumnDef<MemberGridRow, any>[]>(
    () => [
      col.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select every member on this page"
            className="size-4 accent-brass"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.full_name}`}
            className="size-4 accent-brass"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),
      col.accessor('full_name', {
        header: 'Name',
        cell: info => (
          <Link href={`/admin/members/${info.row.original.id}`} className="font-medium hover:underline">
            {info.getValue()}
          </Link>
        ),
      }),
      col.accessor('email', { header: 'Email', cell: info => <span className="text-slate">{info.getValue() ?? '—'}</span> }),
      col.accessor(r => r.branch?.name ?? '', { id: 'branch', header: 'Branch' }),
      col.accessor('city', { header: 'City', cell: info => info.getValue() ?? '' }),
      col.accessor('status', { header: 'Status', cell: info => <StatusPill status={info.getValue()} /> }),
      col.accessor(r => r.membership?.tier?.name ?? 'Free', {
        id: 'tier',
        header: 'Tier',
        cell: info => <TierBadge name={info.getValue()} level={info.row.original.membership?.tier?.level ?? 0} />,
      }),
      col.accessor(r => r.roles.map(x => x.role).filter(x => x !== 'member').join(', '), { id: 'roles', header: 'Roles' }),
      col.accessor('created_at', { header: 'Joined', cell: info => <DateStamp value={info.getValue()} className="text-slate" /> }),
    ],
    []
  )

  const table = useLegacyTable({
    data: rows,
    columns,
    getRowId: row => row.id,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    enableRowSelection: true,
    state: { rowSelection },
    onRowSelectionChange: updater => setRowSelection(prev => (typeof updater === 'function' ? updater(prev) : updater)),
  })

  const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id])
  const needsTypedCount = selectedIds.length > 50

  function run() {
    startTransition(async () => {
      const res = await bulkMemberAction({
        ids: selectedIds,
        action: bulk,
        branchId: bulk === 'assign_branch' ? branchId : undefined,
        confirmCount: needsTypedCount ? parseInt(typed, 10) : undefined,
      })
      setResult(res)
      if (res.ok) {
        setConfirmOpen(false)
        setRowSelection({})
        setTyped('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
        <span className="tabular-nums text-slate">{selectedIds.length} selected</span>
        <label htmlFor="bulk-action" className="sr-only">Bulk action</label>
        <NativeSelect id="bulk-action" className="w-auto" value={bulk} onChange={e => setBulk(e.target.value as BulkKind)}>
          {Object.entries(BULK_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </NativeSelect>
        {bulk === 'assign_branch' ? (
          <>
            <label htmlFor="bulk-branch" className="sr-only">Branch</label>
            <NativeSelect id="bulk-branch" className="w-auto" value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">Choose a branch</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </NativeSelect>
          </>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={selectedIds.length === 0 || selectedIds.length > BULK_LIMIT || (bulk === 'assign_branch' && !branchId)}
          onClick={() => {
            setResult(null)
            setConfirmOpen(true)
          }}
        >
          Review {selectedIds.length || ''} change{selectedIds.length === 1 ? '' : 's'}
        </Button>
        {!confirmOpen ? <ActionMessage state={result} /> : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-rule bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-rule text-left text-slate">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-rule">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className={row.getIsSelected() ? 'bg-brass/5' : undefined}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-slate">
                  No one matches these filters. Try a surname, or clear the filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {BULK_LABEL[bulk]} {selectedIds.length} member{selectedIds.length === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription>
              This changes {selectedIds.length} row{selectedIds.length === 1 ? '' : 's'} and is recorded in the audit log.
              {bulk === 'approve' ? ' Each approved member receives a welcome email.' : ''}
            </DialogDescription>
          </DialogHeader>
          {needsTypedCount ? (
            <div className="space-y-1.5">
              <label htmlFor="typed-count" className="text-sm font-medium">
                Type {selectedIds.length} to confirm
              </label>
              <Input id="typed-count" inputMode="numeric" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" />
            </div>
          ) : null}
          <ActionMessage state={result} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant={bulk === 'suspend' ? 'destructive' : 'default'}
              disabled={pending || (needsTypedCount && typed !== String(selectedIds.length))}
              onClick={run}
            >
              {pending ? 'Working…' : `${BULK_LABEL[bulk]} ${selectedIds.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
