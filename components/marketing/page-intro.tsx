import { Botanical } from '@/components/illustrations/botanical'

// The opening band of every public inner page: a large serif title, a lead
// paragraph, and a faint sprig in the corner, on lightly grained paper.
export function PageIntro({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <section className="grain relative overflow-hidden border-b border-rule bg-paper-deep">
      <Botanical className="pointer-events-none absolute -right-16 -top-10 h-[360px] w-auto text-brass/20 md:right-6 md:h-[440px]" />
      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-14 md:pt-24 md:pb-20 lg:px-12">
        <h1 className="max-w-3xl font-serif text-5xl font-medium leading-[1.02] tracking-[-0.02em] md:text-7xl">{title}</h1>
        {lead ? <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate md:text-xl">{lead}</p> : null}
        {children}
      </div>
    </section>
  )
}
