import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (err) {
    // A throw here (usually a missing or wrong Supabase URL/key in the
    // hosting environment) used to take down every page with Vercel's
    // MIDDLEWARE_INVOCATION_FAILED. Log the reason so it shows in Vercel's
    // Logs tab, and let the request through: pages and RLS still check
    // auth on their own, so nothing protected is exposed.
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'middleware.failed',
        path: request.nextUrl.pathname,
        message: err instanceof Error ? err.message : String(err),
        supabaseUrlSet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        supabaseUrlHost: safeHost(process.env.NEXT_PUBLIC_SUPABASE_URL),
        anonKeySet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      })
    )
    return NextResponse.next({ request })
  }
}

// Host only (never the key), so the log says which project it points at.
function safeHost(url: string | undefined) {
  try {
    return url ? new URL(url).host : null
  } catch {
    return 'invalid-url'
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
