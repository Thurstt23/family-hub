import { cn } from 'cn'
import { plural } from '@/lib/utils'

export type TreeBranch = { id: string; name: string; parent_id: string | null; count: number }

// The branch table drawn as a family tree: the family at the top, top-level
// branches below it, their sub-branches below those, joined by curved
// hairlines. Built from the same rows as the index list, so it stays true
// as stewards add or rename branches.
export function FamilyTree({ branches, rootLabel, className }: { branches: TreeBranch[]; rootLabel: string; className?: string }) {
  const roots = branches.filter(b => !b.parent_id || !branches.some(p => p.id === b.parent_id))
  if (!roots.length) return null
  const childrenOf = (id: string) => branches.filter(b => b.parent_id === id)

  const SLOT = 168
  const slots = roots.reduce((n, r) => n + Math.max(1, childrenOf(r.id).length), 0)
  const width = Math.max(slots, 2) * SLOT
  const Y0 = 40
  const Y1 = 150
  const Y2 = 290

  let cursor = (width - slots * SLOT) / 2
  const placed = roots.map(r => {
    const kids = childrenOf(r.id)
    const kidNodes = (kids.length ? kids : []).map(k => {
      const x = cursor + SLOT / 2
      cursor += SLOT
      return { ...k, x }
    })
    if (!kids.length) cursor += SLOT
    const x = kidNodes.length ? kidNodes.reduce((s, k) => s + k.x, 0) / kidNodes.length : cursor - SLOT / 2
    return { ...r, x, kids: kidNodes }
  })
  const rootX = width / 2

  const curve = (x1: number, y1: number, x2: number, y2: number) => {
    const my = (y1 + y2) / 2
    return `M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`
  }

  return (
    <svg viewBox={`0 0 ${width} ${Y2 + 70}`} className={cn('w-full', className)} role="img" aria-label={`Family tree: ${roots.map(r => r.name).join(', ')}`}>
      <g fill="none" stroke="var(--color-rule)" strokeWidth={1.4}>
        {placed.map(r => (
          <g key={r.id}>
            <path d={curve(rootX, Y0 + 10, r.x, Y1 - 10)} stroke="var(--color-slate)" strokeOpacity={0.45} />
            {r.kids.map(k => (
              <path key={k.id} d={curve(r.x, Y1 + 44, k.x, Y2 - 10)} />
            ))}
          </g>
        ))}
      </g>

      {/* the family */}
      <circle cx={rootX} cy={Y0} r={7} fill="var(--color-brass)" />
      <circle cx={rootX} cy={Y0} r={12} fill="none" stroke="var(--color-brass)" strokeWidth={1} opacity={0.5} />
      <text x={rootX + 22} y={Y0 + 6} fontFamily="var(--font-newsreader), Georgia, serif" fontSize={20} fontStyle="italic" fill="var(--color-ink)">
        {rootLabel}
      </text>

      {placed.map(r => (
        <g key={r.id}>
          <circle cx={r.x} cy={Y1} r={5.5} fill="var(--color-ink)" />
          <text x={r.x} y={Y1 + 26} textAnchor="middle" fontFamily="var(--font-newsreader), Georgia, serif" fontSize={19} fill="var(--color-ink)">
            {r.name}
          </text>
          <text x={r.x} y={Y1 + 44} textAnchor="middle" fontFamily="var(--font-karla), sans-serif" fontSize={12} fill="var(--color-slate)">
            {plural(r.count + r.kids.reduce((n, k) => n + k.count, 0), 'member')}
          </text>
          {r.kids.map(k => (
            <g key={k.id}>
              <circle cx={k.x} cy={Y2} r={4} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={1.4} />
              <text x={k.x} y={Y2 + 26} textAnchor="middle" fontFamily="var(--font-newsreader), Georgia, serif" fontSize={16} fill="var(--color-ink)">
                {k.name}
              </text>
              <text x={k.x} y={Y2 + 44} textAnchor="middle" fontFamily="var(--font-karla), sans-serif" fontSize={12} fill="var(--color-slate)">
                {plural(k.count, 'member')}
              </text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}
