import { format } from 'date-fns'
import { cn } from 'cn'

// StatusPill, TierBadge and DateStamp from the component map in 07, section 6.

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-sage/15 text-[#3F5A46] border-sage/40',
  pending: 'bg-slate/10 text-slate border-slate/30',
  suspended: 'bg-clay/10 text-clay border-clay/40',
  archived: 'bg-rule/60 text-slate border-rule',
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
        STATUS_STYLE[status] ?? STATUS_STYLE.pending
      )}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

// Mulberry is reserved for money and tier marks (07, section 2). Small caps,
// not all caps.
export function TierBadge({ name, level }: { name: string; level: number }) {
  if (level <= 0) return <span className="text-sm text-slate">{name}</span>
  return (
    <span className="inline-flex items-center rounded-sm border border-mulberry/40 px-1.5 text-sm text-mulberry [font-variant-caps:small-caps]">
      {name.toLowerCase()}
    </span>
  )
}

export function DateStamp({ value, withTime = false, className }: { value: string | null | undefined; withTime?: boolean; className?: string }) {
  if (!value) return <span className={cn('text-slate', className)}>—</span>
  const d = new Date(value)
  return (
    <time dateTime={d.toISOString()} className={cn('tabular-nums whitespace-nowrap', className)}>
      {format(d, withTime ? 'd MMMM yyyy, HH:mm' : 'd MMMM yyyy')}
    </time>
  )
}

export function formatCents(cents: number | null | undefined, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(
    (cents ?? 0) / 100
  )
}

// A plain inline SVG sparkline. No chart library for a 30 point line.
export function Sparkline({ points, label }: { points: number[]; label: string }) {
  const w = 240
  const h = 48
  const max = Math.max(1, ...points)
  const step = points.length > 1 ? w / (points.length - 1) : w
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (p / max) * (h - 4) - 2).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" role="img" aria-label={label} preserveAspectRatio="none">
      <path d={d} fill="none" stroke="var(--color-ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
