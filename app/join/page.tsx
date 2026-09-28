import { Metadata } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'

export const metadata: Metadata = {
  title: 'Join the Register',
  description: 'Request access to the Martin Sawyer family digital register.',
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader current="/join" />

      <main className="flex-1 py-24 px-6 lg:px-12 max-w-2xl mx-auto w-full text-center space-y-12">
        <div className="space-y-6">
          <h1 className="font-serif text-4xl md:text-5xl font-medium">Join the Register</h1>
          <p className="text-xl text-slate leading-relaxed">
            Martin Sawyer Reunion is a private directory for descendants and relatives of the Martin Sawyer family.
            Membership requires approval by a family steward to protect the privacy of our members.
          </p>
        </div>

        <div className="p-8 border border-border bg-card shadow-sm space-y-6 text-left">
          <h2 className="font-serif text-2xl">How to join</h2>
          <ol className="list-decimal list-inside space-y-3 text-slate">
            <li>Create an account using your primary email address.</li>
            <li>Confirm your email address.</li>
            <li>Fill out the onboarding form with your name and family branch.</li>
            <li>Wait for a family steward to review and approve your request.</li>
          </ol>
          <div className="pt-6">
            <Link href="/signup" className={buttonVariants({ variant: 'default', className: "w-full bg-brass hover:bg-brass/90 text-card rounded-none h-12 text-base" })}>
              Start the process
            </Link>
          </div>
        </div>

        <p className="text-sm text-slate">
          Already have an account? <Link href="/login" className="text-brass hover:underline">Sign in</Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}
