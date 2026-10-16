import { cn } from 'cn'

// An open register: two gently curved pages, a spine, ruled lines with
// entries (a name stroke, a date stroke, a dot), and a brass ribbon.
// Line work in currentColor; the ribbon uses the brass token.

const ENTRIES_LEFT = [62, 40, 74, 52, 66, 46, 70, 38]
const ENTRIES_RIGHT = [58, 70, 44, 64, 50, 72]

export function Ledger({ className, title }: { className?: string; title?: string }) {
  const line = (x: number, y: number, w: number, key: string) => (
    <line key={key} x1={x} y1={y} x2={x + w} y2={y} />
  )
  return (
    <svg
      viewBox="0 0 520 360"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* covers and page block */}
      <path d="M20 300 C 120 320, 200 318, 260 334 C 320 318, 400 320, 500 300 L 500 316 C 400 336, 320 334, 260 350 C 200 334, 120 336, 20 316 Z" opacity={0.6} />
      {/* left page */}
      <path d="M260 330 C 200 312, 120 312, 34 292 L 34 40 C 120 58, 200 58, 260 76 Z" fill="var(--color-card)" />
      {/* right page */}
      <path d="M260 330 C 320 312, 400 312, 486 292 L 486 40 C 400 58, 320 58, 260 76 Z" fill="var(--color-card)" />
      {/* spine shadow */}
      <path d="M260 76 L 260 330" opacity={0.5} />
      <path d="M252 78 C 256 160, 256 250, 252 326" opacity={0.25} />

      {/* headings */}
      <g strokeWidth={1.6}>
        {line(70, 92, 90, 'h1')}
        {line(300, 92, 110, 'h2')}
      </g>

      {/* ruled entries, left */}
      <g opacity={0.85}>
        {ENTRIES_LEFT.map((w, k) => {
          const y = 120 + k * 22
          return (
            <g key={`l${k}`}>
              {line(60, y, w, `ln${k}`)}
              {line(170, y, 26, `ld${k}`)}
              <circle cx={218} cy={y} r={1.6} fill="currentColor" stroke="none" />
            </g>
          )
        })}
      </g>
      {/* ruled entries, right */}
      <g opacity={0.85}>
        {ENTRIES_RIGHT.map((w, k) => {
          const y = 120 + k * 22
          return (
            <g key={`r${k}`}>
              {line(296, y, w, `rn${k}`)}
              {line(406, y, 30, `rd${k}`)}
            </g>
          )
        })}
        {/* a small pressed sprig on the right page */}
        <path d="M330 262 C 350 250, 372 246, 400 250" />
        <path d="M350 254 c -4 -10 2 -16 8 -18 c 0 8 -2 14 -8 18 z" />
        <path d="M372 249 c 2 -10 10 -14 16 -14 c -2 8 -8 12 -16 14 z" />
        <path d="M362 252 c 6 8 4 14 -2 18 c -2 -8 -2 -12 2 -18 z" />
      </g>

      {/* ribbon */}
      <path d="M268 74 L 268 352 L 276 342 L 284 352 L 284 70" stroke="var(--color-brass)" strokeWidth={1.4} fill="var(--color-brass)" fillOpacity={0.18} />
    </svg>
  )
}
