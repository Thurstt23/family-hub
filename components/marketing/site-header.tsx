import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/about', label: 'About' },
  { href: '/events', label: 'Events' },
  { href: '/join', label: 'Join' },
  { href: '/login', label: 'Sign in' },
] as const

type NavHref = (typeof NAV_ITEMS)[number]['href']

export function SiteHeader({ current }: { current?: NavHref }) {
  return (
    <header className="flex h-20 items-center justify-between px-6 lg:px-12 border-b border-border/40">
      <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
        Martin Sawyer Reunion
      </Link>
      <nav className="hidden md:flex gap-8 text-[15px] font-medium">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current === item.href ? 'page' : undefined}
            className={
              current === item.href
                ? 'text-brass'
                : 'hover:text-brass transition-colors'
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
