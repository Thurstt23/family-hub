'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from 'cn'
import type { StaffRole } from '@/lib/admin/action'

export type AdminNavItem = { href: string; label: string; roles: StaffRole[] }

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin" className="-mb-px flex gap-5 overflow-x-auto text-sm">
      {items.map(item => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap border-b-2 py-2.5 transition-colors',
              active ? 'border-brass text-ink font-medium' : 'border-transparent text-slate hover:text-ink'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
