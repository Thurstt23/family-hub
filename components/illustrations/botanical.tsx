import { cn } from 'cn'

// A line-art sprig in the manner of an engraved botanical plate: one curved
// stem, two side shoots, almond leaves with a midrib, a few berries.
// Generated from a seed so it is identical on every render. Colour comes from
// `currentColor`; with `animated`, every stroke draws itself once on load
// (the `.draw-in` keyframes in globals.css).

type Pt = [number, number]

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

function tangentAngle(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number) {
  const a = bezier(p0, p1, p2, p3, Math.max(0, t - 0.01))
  const b = bezier(p0, p1, p2, p3, Math.min(1, t + 0.01))
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
}

function leafPath(length: number, width: number) {
  const L = length
  const W = width
  return `M0 0 C ${W} ${-L * 0.3}, ${W * 0.9} ${-L * 0.72}, 0 ${-L} C ${-W * 0.9} ${-L * 0.72}, ${-W} ${-L * 0.3}, 0 0 Z M0 ${-L * 0.08} L0 ${-L * 0.86}`
}

type Stem = { p: [Pt, Pt, Pt, Pt]; leaves: number; size: number; start: number }

const STEMS: Stem[] = [
  { p: [[70, 590], [60, 420], [190, 300], [300, 40]], leaves: 13, size: 1, start: 0.12 },
  { p: [[118, 430], [170, 410], [250, 380], [340, 300]], leaves: 6, size: 0.75, start: 0.2 },
  { p: [[176, 300], [150, 240], [140, 190], [150, 120]], leaves: 5, size: 0.7, start: 0.25 },
]

const BERRIES: Pt[] = [[318, 292], [330, 278], [342, 290], [148, 108], [160, 98], [292, 34], [306, 40]]

export function Botanical({ className, animated = false, title }: { className?: string; animated?: boolean; title?: string }) {
  let i = 0
  const next = () => ({ ['--i' as string]: i++ })

  return (
    <svg
      viewBox="0 0 400 600"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(animated && 'draw-in', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {STEMS.map((s, si) => {
        const [p0, p1, p2, p3] = s.p
        const leaves = Array.from({ length: s.leaves }, (_, k) => {
          const t = s.start + (k / s.leaves) * (1 - s.start) * 0.98
          const [x, y] = bezier(p0, p1, p2, p3, t)
          const side = k % 2 === 0 ? 1 : -1
          const angle = tangentAngle(p0, p1, p2, p3, t) + 90 + side * (48 - k * 1.5)
          const length = (34 + ((k * 7) % 11)) * s.size * (1 - t * 0.35)
          return { x, y, angle, length, width: length * 0.36 }
        })
        return (
          <g key={si}>
            <path d={`M${p0} C${p1} ${p2} ${p3}`} pathLength={1} style={next()} />
            {leaves.map((l, k) => (
              <path
                key={k}
                d={leafPath(l.length, l.width)}
                transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.angle.toFixed(1)})`}
                pathLength={1}
                style={next()}
              />
            ))}
          </g>
        )
      })}
      {BERRIES.map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r={4.2} pathLength={1} style={next()} />
      ))}
    </svg>
  )
}
