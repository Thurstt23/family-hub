import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div role="status" className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-4">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mx-auto h-9 w-72" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
