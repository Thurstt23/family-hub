import Link from 'next/link'
import { site } from '@/content/site'

// Sign in, sign up and onboarding screens: a quiet wordmark back to the
// public site, nothing else competing with the form.
export default function FormShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-paper text-ink">
      <header className="absolute inset-x-0 top-0 px-4 py-5 sm:px-6">
        <Link href="/" className="font-serif text-lg font-medium">
          {site.name}
        </Link>
      </header>
      {children}
    </div>
  )
}
