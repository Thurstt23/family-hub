import { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { PageIntro } from '@/components/marketing/page-intro'
import { Ledger } from '@/components/illustrations/ledger'
import { site } from '@/content/site'

export const metadata: Metadata = {
  title: site.about.title,
  description: site.about.description,
}

// Wording lives in content/site.ts.
export default function AboutPage() {
  const [lead, ...rest] = site.about.intro
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader current="/about" />

      <main id="main" className="flex-1">
        <PageIntro title={site.about.title} lead={lead} />

        <div className="mx-auto grid max-w-7xl gap-16 px-6 py-20 lg:grid-cols-12 lg:px-12 lg:py-28">
          <div className="prose prose-lg max-w-[66ch] lg:col-span-7">
            {rest.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {site.about.sections.map(section => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>
            ))}
          </div>

          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-10 space-y-8">
              <Ledger className="w-full text-ink/70" />
              <div className="border-t border-rule pt-6">
                <p className="font-serif text-2xl leading-snug">Belong to the family?</p>
                <p className="mt-2 text-slate">Ask for a place in the register. A steward from your branch will welcome you in.</p>
                <Link href="/join" className="mt-5 inline-flex h-11 items-center rounded-sm bg-ink px-6 font-medium text-paper transition-colors hover:bg-brass">
                  Join the register
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
