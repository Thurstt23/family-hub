import { Metadata } from 'next'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { site } from '@/content/site'

export const metadata: Metadata = {
  title: site.about.title,
  description: site.about.description,
}

// Wording lives in content/site.ts.
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader current="/about" />

      <main id="main" className="flex-1 py-16 px-6 lg:px-12 max-w-3xl mx-auto w-full">
        <h1 className="font-serif text-4xl md:text-5xl font-medium mb-12">{site.about.title}</h1>
        <div className="prose prose-lg max-w-[68ch]">
          {site.about.intro.map((p, i) => (
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
      </main>

      <SiteFooter />
    </div>
  )
}
