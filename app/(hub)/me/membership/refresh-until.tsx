'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Re-renders the server component every two seconds for a short while, so the
// page picks up the membership row once the Stripe webhook has written it.
export function RefreshUntil({ seconds }: { seconds: number }) {
  const router = useRouter()
  useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => {
      if (Date.now() - started > seconds * 1000) clearInterval(id)
      else router.refresh()
    }, 2000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
