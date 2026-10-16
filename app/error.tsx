'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="main" className="flex min-h-[60vh] items-center justify-center p-6">
      <div role="alert" className="max-w-md space-y-4 text-center">
        <h1 className="text-3xl font-serif">This page could not load.</h1>
        <p className="text-slate">
          Try again in a moment. If it keeps happening, tell a family administrator
          {error.digest ? <> and mention the reference <code className="text-ink">{error.digest}</code></> : null}.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className="self-center text-brass underline">Home page</Link>
        </div>
      </div>
    </main>
  )
}
