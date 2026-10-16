'use client'

// Replaces the root layout when it fails, so it brings its own <html> and
// inline styles: globals.css and the fonts may be what broke.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#EFF1EE', color: '#10233A', fontFamily: 'Georgia, serif' }}>
        <main style={{ maxWidth: 480, margin: '15vh auto', padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontWeight: 500 }}>The site could not load.</h1>
          <p style={{ fontFamily: 'Helvetica, Arial, sans-serif', color: '#5A6672' }}>
            Try again in a moment.{error.digest ? ` Reference: ${error.digest}` : ''}
          </p>
          <button
            onClick={reset}
            style={{ background: '#8A6424', color: '#fff', border: 0, borderRadius: 4, padding: '10px 18px', fontSize: 16, cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
