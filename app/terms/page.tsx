import type { Metadata } from 'next'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { site } from '@/content/site'
import { PageIntro } from '@/components/marketing/page-intro'

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The ground rules for using the family register and paying for a membership.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <PageIntro title="Terms" lead="The ground rules for using the register and paying for a membership. Short, because this is a family, not a business." />
        <div className="mx-auto max-w-3xl px-6 py-16 space-y-8 [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:pt-4 [&_p]:max-w-[68ch] [&_li]:max-w-[68ch] [&_h2]:md:text-3xl">
        <p>By creating an account you agree to these terms. They are short because the site is a family register, not a business.</p>

        <h2>Membership of the register</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Accounts are for members of the {site.familyNameInSentence} family and their partners. Stewards may ask for details before approving a request.</li>
          <li>Keep your sign in to yourself. One account per person.</li>
          <li>Administrators may suspend or archive an account that breaks these terms.</li>
        </ul>

        <h2>What you share</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Only post photographs and stories you have the right to share, and be thoughtful about relatives who cannot consent, especially children.</li>
          <li>Contact details in the directory are for keeping in touch with family. Do not copy them for marketing or share them outside the family.</li>
          <li>Stewards review uploaded photographs and may remove comments that are reported.</li>
        </ul>

        <h2>Paid memberships</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Supporter and Patron memberships renew every year until cancelled. Lifetime is a single payment.</li>
          <li>You can cancel at any time from the billing portal on your membership page. Benefits continue until the end of the period you paid for.</li>
          <li>Contributions support the running costs of the site and the reunion. Refunds are at the discretion of the family administrators; ask at {site.contactEmail} or reply to any receipt.</li>
        </ul>

        <h2>Changes</h2>
        <p>If these terms change in a way that matters, we will say so in an announcement before the change takes effect.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
