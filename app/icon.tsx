import { ImageResponse } from 'next/og'

// App and PWA icons, drawn at build time: an ink square with a paper
// monogram. "maskable" keeps the letters inside the 80% safe zone.
export function generateImageMetadata() {
  return [
    { id: '32', size: { width: 32, height: 32 }, contentType: 'image/png' },
    { id: '192', size: { width: 192, height: 192 }, contentType: 'image/png' },
    { id: '512', size: { width: 512, height: 512 }, contentType: 'image/png' },
    { id: 'maskable', size: { width: 512, height: 512 }, contentType: 'image/png' },
  ]
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const key = await id
  const size = key === '32' ? 32 : key === '192' ? 192 : 512
  const scale = key === 'maskable' ? 0.32 : 0.42
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#10233A',
          color: '#EFF1EE',
          fontFamily: 'Georgia, serif',
          fontSize: Math.round(size * scale),
          letterSpacing: Math.round(size * -0.01),
          borderBottom: key === '32' ? 'none' : `${Math.round(size * 0.04)}px solid #A97C2F`,
        }}
      >
        MS
      </div>
    ),
    { width: size, height: size }
  )
}
