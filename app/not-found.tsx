import Link from 'next/link'

export const metadata = { title: 'Not found' }

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-serif text-6xl tabular-nums text-slate">404</p>
        <h1 className="text-3xl font-serif">This page is not in the register.</h1>
        <p className="text-slate">The link may be old, or the page may have moved. Start again from the home page or the directory.</p>
        <div className="flex justify-center gap-6 pt-2">
          <Link href="/" className="text-brass underline">Home page</Link>
          <Link href="/directory" className="text-brass underline">Directory</Link>
        </div>
      </div>
    </main>
  )
}
