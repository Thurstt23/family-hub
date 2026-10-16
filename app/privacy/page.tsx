import type { Metadata } from 'next'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { site } from '@/content/site'
import { PageIntro } from '@/components/marketing/page-intro'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What the family register stores, who can see it, and how to have it removed.',
}

// Launch checklist (10, section 5): name what data is stored and who sees it.
// Reviewed by the family before launch; this is not legal advice.
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <PageIntro title="Privacy" lead="What the register keeps about you, who can see it, and how to have it changed or removed." />
        <div className="mx-auto max-w-3xl px-6 py-16 space-y-8 [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:pt-4 [&_p]:max-w-[68ch] [&_li]:max-w-[68ch] [&_h2]:md:text-3xl">
        <p>
          The {site.name} site is run by the family, for the family. This page explains what we keep about you,
          who can see it, and how to have it changed or removed.
        </p>

        <h2>What we store</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your account: email address and a securely hashed password, or your Google sign in.</li>
          <li>Your directory entry: name, branch, city and country, generation, and anything optional you add: photo, bio, birthday and phone number.</li>
          <li>What you post: stories, comments, photographs and event replies.</li>
          <li>Membership: your tier and its dates. Card details are held by Stripe, our payment processor, and never reach our database.</li>
          <li>A log of administrative actions, such as approvals and exports, so the family can see who changed what.</li>
        </ul>

        <h2>Who can see it</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Nothing in the directory is public. Only approved members can open it.</li>
          <li>Your email, phone number and birthday are shown to other members only if you switch them on in your profile. Email and phone are off by default.</li>
          <li>Stewards see the requests to join for the branches they look after. Administrators can see full member records in order to run the site.</li>
          <li>The public pages show only a total member count, branch counts, and events marked public.</li>
        </ul>

        <h2>Who processes it for us</h2>
        <p>
          Supabase hosts the database and photographs, Vercel serves the site, Stripe handles payments, and Resend sends our
          emails. Each processes data only to provide that service.
        </p>

        <h2>Emails</h2>
        <p>
          We send emails about your account (confirmation, approval, payment problems) and, unless you turn it off, a weekly
          announcement digest. Every digest has an unsubscribe link, and the setting is on your profile page.
        </p>

        <h2>Changing or removing your data</h2>
        <p>
          You can edit your directory entry at any time from your profile. To have your account archived or permanently
          deleted, or to ask for a copy of what we hold, write to <a href={`mailto:${site.contactEmail}`} className="underline">{site.contactEmail}</a> or reply to any email from us.
          Deletion requests are handled by hand and confirmed by email.
        </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
