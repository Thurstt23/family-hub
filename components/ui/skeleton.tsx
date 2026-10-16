import { cn } from 'cn'

// Static placeholder blocks. No shimmer animation: 07 keeps motion for the
// hero only, and reduced-motion users would not see it anyway.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-sm bg-muted', className)} />
}

// Hairline ruled rows, matching the register index the page will render.
export function IndexSkeleton({ rows = 8, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-12 w-full" />
      <div className="border-t border-rule">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-rule py-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto hidden h-4 w-24 sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
