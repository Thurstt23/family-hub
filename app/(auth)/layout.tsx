import Link from 'next/link'
import { site } from '@/content/site'
import { Monogram } from '@/components/brand/monogram'
import { Botanical } from '@/components/illustrations/botanical'

// Sign in, sign up and password screens. On large screens the left half is
// an ink "cover" with the family's line art and quote, so the first thing a
// relative sees feels like opening the register; the form keeps the right
// half to itself. On phones only the form shows, under a small wordmark.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink lg:grid lg:grid-cols-2">
      <aside className="grain relative hidden overflow-hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="relative flex items-center gap-3">
          <Monogram className="text-paper" />
          <span className="font-serif text-2xl">{site.name}</span>
        </Link>
        <Botanical className="pointer-events-none absolute -bottom-10 right-0 h-[85%] w-auto text-brass-light/30" />
        <figure className="relative max-w-md">
          <blockquote className="font-serif text-4xl italic leading-tight">&ldquo;{site.home.quote.text}&rdquo;</blockquote>
          <figcaption className="mt-5 text-sm text-paper/65">{site.home.quote.attribution}</figcaption>
        </figure>
      </aside>

      <div className="relative">
        <header className="absolute inset-x-0 top-0 px-4 py-5 sm:px-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2 font-serif text-lg font-medium">
            <Monogram className="size-7" />
            {site.name}
          </Link>
        </header>
        {children}
      </div>
    </div>
  )
}
