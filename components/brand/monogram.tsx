import { cn } from 'cn'
import { site } from '@/content/site'

// Initials from the family name ("Martin Sawyer" -> "MS") inside a hairline
// ring with a small leaf, like a bookplate stamp. Scales with font-size.
const initials = site.familyNameInSentence
  .split(/[\s-]+/)
  .filter(Boolean)
  .map(w => w[0]!.toUpperCase())
  .join('')
  .slice(0, 3)

export function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-9 shrink-0', className)} aria-hidden="true">
      <circle cx="24" cy="24" r="22.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="24" cy="24" r="19.5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fontFamily="var(--font-newsreader), Georgia, serif"
        fontSize={initials.length > 2 ? 13 : 16}
        fontStyle="italic"
        fill="currentColor"
      >
        {initials}
      </text>
      <path d="M24 39.5 c -2 -2.6 -2 -4.6 0 -6.4 c 2 1.8 2 3.8 0 6.4 z" fill="var(--color-brass)" opacity="0.9" />
    </svg>
  )
}
