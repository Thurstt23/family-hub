import { ReactNode } from 'react'

export function RegisterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-4 border-b border-rule last:border-0 gap-1 sm:gap-4">
      <dt className="text-sm font-medium text-slate sm:w-48 shrink-0">{label}</dt>
      <dd className="text-ink flex-1 min-w-0">{children}</dd>
    </div>
  )
}
