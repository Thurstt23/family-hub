import { requireActiveMember } from '@/lib/auth/guards'
import { signOut } from '@/lib/auth/actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireActiveMember()

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-border bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/hub" className="font-serif text-xl font-bold">
              Martin Sawyer Reunion
            </Link>
            <nav className="hidden md:flex gap-4 text-sm font-medium">
              <Link href="/hub" className="hover:text-ink/80 transition-colors">Feed</Link>
              <Link href="/directory" className="hover:text-ink/80 transition-colors">Directory</Link>
              <Link href="/events" className="hover:text-ink/80 transition-colors">Events</Link>
              <Link href="/hub/gallery" className="hover:text-ink/80 transition-colors">Gallery</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-muted hidden sm:inline-block">
              {profile.full_name}
            </span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
