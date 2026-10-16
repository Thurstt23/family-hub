import { IndexSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <IndexSkeleton rows={4} label="Loading events" />
    </main>
  )
}
