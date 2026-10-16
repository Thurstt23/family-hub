import Link from 'next/link'
import { site } from '@/content/site'
import { Monogram } from '@/components/brand/monogram'

const COLUMNS = [
  {
    title: 'The register',
    links: [
      { href: '/about', label: 'About the family' },
      { href: '/events', label: 'Gatherings' },
      { href: '/join', label: 'Join' },
    ],
  },
  {
    title: 'Members',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/hub', label: 'Family hub' },
      { href: '/directory', label: 'Directory' },
    ],
  },
  {
    title: 'Small print',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink-deep text-paper/75">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-12 lg:px-12">
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-3 text-paper">
            <Monogram />
            <span className="font-serif text-2xl">{site.name}</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed">{site.tagline}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
          {COLUMNS.map(col => (
            <div key={col.title}>
              <p className="font-serif text-lg text-paper">{col.title}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-paper underline-offset-4 hover:underline">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-paper/10">
        <p className="mx-auto max-w-7xl px-6 py-6 text-xs text-paper/55 lg:px-12">
          &copy; {new Date().getFullYear()} {site.familyName}. A private register kept by the family.
        </p>
      </div>
    </footer>
  )
}
