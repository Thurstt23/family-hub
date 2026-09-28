import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Always return the response object that carries the refreshed cookies.
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const path = url.pathname

  // `/events` itself is the Phase 3 public marketing page (07, section 4;
  // 08, Phase 3) and must stay reachable while signed out. Only the
  // members-only sub-routes under it (RSVP management etc.) are gated.
  const isProtectedRoot =
    path.startsWith('/hub') ||
    path.startsWith('/directory') ||
    path.startsWith('/me') ||
    path.startsWith('/branches') ||
    path.startsWith('/posts') ||
    path.startsWith('/gallery') ||
    path.startsWith('/admin')

  if (isProtectedRoot && !user) {
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
