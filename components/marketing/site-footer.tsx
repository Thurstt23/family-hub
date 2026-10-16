import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border py-12 text-sm text-slate">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} The Martin Sawyer Family. All rights reserved.</p>
        <nav aria-label="Legal" className="flex gap-6">
          <Link href="/privacy" className="hover:text-ink underline-offset-4 hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:text-ink underline-offset-4 hover:underline">Terms</Link>
        </nav>
      </div>
    </footer>
  )
}
