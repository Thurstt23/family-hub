import { requireActiveMember } from '@/lib/auth/guards'
import { signOut } from '@/lib/auth/actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { site } from '@/content/site'
import { Monogram } from '@/components/brand/monogram'

const NAV = [
  { href: '/hub', label: 'Feed' },
  { href: '/directory', label: 'Directory' },
  { href: '/branches', label: 'Branches' },
  { href: '/events', label: 'Events' },
  { href: '/hub/gallery', label: 'Gallery' },
]

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireActiveMember()
  const { data: isStaff } = await supabase.rpc('is_staff')

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/hub" className="flex items-center gap-2.5 font-serif text-xl font-medium whitespace-nowrap">
              <Monogram className="size-8" />
              <span className="hidden sm:inline">{site.name}</span>
            </Link>
            <nav aria-label="Primary" className="hidden md:flex gap-4 text-sm font-medium">
              {NAV.map(n => (
                <Link key={n.href} href={n.href} className="hover:text-brass transition-colors">{n.label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            {isStaff ? <Link href="/admin" className="hover:underline">Admin</Link> : null}
            <Link href="/me" className="hover:underline">Profile</Link>
            <Link href="/me/membership" className="hidden sm:inline hover:underline text-mulberry">Membership</Link>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
        {/* Narrow screens: the same links in a scrollable row, so nothing is hidden below 768px. */}
        <nav aria-label="Primary" className="md:hidden flex gap-5 overflow-x-auto px-4 pb-2 text-sm font-medium">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap py-1 hover:text-brass">{n.label}</Link>
          ))}
          <Link href="/me/membership" className="whitespace-nowrap py-1 sm:hidden text-mulberry">Membership</Link>
        </nav>
      </header>

      <main id="main" className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
