import { ImageResponse } from 'next/og'

export const alt = 'The Martin Sawyer Family'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#10233A',
          color: '#EFF1EE',
        }}
      >
        <div style={{ fontSize: 30, color: '#A97C2F', marginBottom: 24 }}>
          Martin Sawyer Reunion
        </div>
        <div style={{ fontSize: 72, lineHeight: 1.1 }}>The Martin Sawyer Family</div>
        <div style={{ fontSize: 32, color: '#EFF1EE', opacity: 0.85, marginTop: 32 }}>
          Six branches. Four generations. One register.
        </div>
      </div>
    ),
    { ...size }
  )
}
