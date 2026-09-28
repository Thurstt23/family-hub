import Link from 'next/link'
import { ReactNode } from 'react'

export function IndexRow({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center w-full group border-b border-rule hover:bg-black/5 focus:bg-black/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  )
}
