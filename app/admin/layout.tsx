import { requireRole } from '@/lib/auth/guards'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth/actions'
import { AdminNav, type AdminNavItem } from '@/components/admin/admin-nav'

// Screen map from 06, section 1. Links a role cannot use are not rendered;
// each page and every policy still checks on its own.
const NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', roles: ['steward', 'admin', 'owner'] },
  { href: '/admin/approvals', label: 'Approvals', roles: ['steward', 'admin', 'owner'] },
  { href: '/admin/members', label: 'Members', roles: ['admin', 'owner'] },
  { href: '/admin/memberships', label: 'Memberships', roles: ['admin', 'owner'] },
  { href: '/admin/content', label: 'Content', roles: ['steward', 'admin', 'owner'] },
  { href: '/admin/moderation', label: 'Moderation', roles: ['steward', 'admin', 'owner'] },
  { href: '/admin/branches', label: 'Branches', roles: ['admin', 'owner'] },
  { href: '/admin/audit', label: 'Audit log', roles: ['admin', 'owner'] },
  { href: '/admin/settings', label: 'Settings', roles: ['owner'] },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { roles, profile } = await requireRole(['steward', 'admin', 'owner'])
  const items = NAV.filter(item => item.roles.some(r => roles.includes(r)))

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-rule bg-paper">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/admin" className="font-serif font-medium text-lg whitespace-nowrap">
            Admin console
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline text-slate">{profile.full_name}</span>
            <Link href="/hub" className="hover:underline whitespace-nowrap">Back to hub</Link>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AdminNav items={items.map(({ href, label }) => ({ href, label }))} />
        </div>
      </header>

      <main id="main" className="flex-1 px-4 py-6 sm:px-6 mx-auto w-full max-w-7xl">
        {children}
      </main>
    </div>
  )
}
