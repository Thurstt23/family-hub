import { Metadata } from 'next'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'

export const metadata: Metadata = {
  title: 'About Our Family',
  description: 'The history and origins of the Martin Sawyer family register.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader current="/about" />

      <main className="flex-1 py-16 px-6 lg:px-12 max-w-3xl mx-auto w-full">
        <h1 className="font-serif text-4xl md:text-5xl font-medium mb-12">About Our Family</h1>
        <div className="prose prose-lg prose-headings:font-serif prose-p:text-ink max-w-none">
          <p>
            The Martin Sawyer family traces its shared ledger back to 1961, when the first
            register was bound in Savannah, Georgia. What began as a simple book of names
            and dates has evolved into a sprawling, living record.
          </p>
          <p>
            Today, our family spans six branches and four generations. We created this digital
            hub to ensure that distance does not diminish our connection, and that our shared
            history is preserved for the generations to come.
          </p>
          <h2>The Register</h2>
          <p>
            Membership in this register is carefully maintained by family stewards.
            We value privacy and connection over public broadcast. This is a private space
            for us to share news, arrange reunions, and look back at our history.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
