import { requireRole } from '@/lib/auth/guards'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth/actions'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['steward', 'admin', 'owner'])
  
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-rule bg-paper">
        <div className="mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <span className="font-serif font-medium text-lg">Admin Console</span>
            <nav className="hidden md:flex gap-4 text-sm font-medium">
              <Link href="/admin/content" className="text-brass">Content</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/hub" className="text-sm hover:underline">Back to Hub</Link>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 mx-auto w-full max-w-7xl">
        {children}
      </main>
    </div>
  )
}
