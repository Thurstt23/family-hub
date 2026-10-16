import Link from 'next/link'
import { cn } from 'cn'
import { site } from '@/content/site'
import { Monogram } from '@/components/brand/monogram'

const NAV_ITEMS = [
  { href: '/about', label: 'About' },
  { href: '/events', label: 'Events' },
  { href: '/login', label: 'Sign in' },
] as const

type NavHref = (typeof NAV_ITEMS)[number]['href'] | '/join'

// `tone="dark"` sits on the ink hero of the home page so the two read as one
// surface; every other page uses the paper header.
export function SiteHeader({ current, tone = 'light' }: { current?: NavHref; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark'
  return (
    <header className={cn('relative z-20', dark ? 'bg-ink text-paper' : 'bg-paper text-ink border-b border-rule')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-card focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-12 sm:h-20 sm:py-0">
        <Link href="/" className="flex items-center gap-3">
          <Monogram className={dark ? 'text-paper' : 'text-ink'} />
          <span className="font-serif text-xl sm:text-2xl font-medium tracking-tight">{site.name}</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 sm:gap-8 text-[15px] font-medium">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current === item.href ? 'page' : undefined}
              className={cn(
                'underline-offset-8 decoration-2 transition-colors',
                current === item.href
                  ? cn('underline', dark ? 'decoration-brass-light' : 'decoration-brass')
                  : dark
                    ? 'text-paper/80 hover:text-paper'
                    : 'hover:text-brass'
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/join"
            aria-current={current === '/join' ? 'page' : undefined}
            className={cn(
              'rounded-sm px-4 py-2 transition-colors',
              dark ? 'bg-brass-light text-ink hover:bg-paper' : 'bg-ink text-paper hover:bg-brass'
            )}
          >
            Join
          </Link>
        </nav>
      </div>
    </header>
  )
}
