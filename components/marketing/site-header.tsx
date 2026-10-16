import Link from 'next/link'
import { site } from '@/content/site'

const NAV_ITEMS = [
  { href: '/about', label: 'About' },
  { href: '/events', label: 'Events' },
  { href: '/join', label: 'Join' },
  { href: '/login', label: 'Sign in' },
] as const

type NavHref = (typeof NAV_ITEMS)[number]['href']

export function SiteHeader({ current }: { current?: NavHref }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6 lg:px-12 sm:h-20 sm:py-0 border-b border-border/40">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
        {site.name}
      </Link>
      {/* Visible at every width: four links fit on one line from 360px. */}
      <nav aria-label="Primary" className="flex gap-5 sm:gap-8 text-[15px] font-medium">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current === item.href ? 'page' : undefined}
            className={
              current === item.href
                ? 'underline decoration-brass decoration-2 underline-offset-8'
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
