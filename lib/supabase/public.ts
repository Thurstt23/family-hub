import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '../env'

// Stateless, anon-key client with no cookie access. Use this in public,
// unauthenticated marketing routes (07/08 Phase 3: `/`, `/events`) that are
// statically revalidated — `lib/supabase/server.ts` reads cookies via
// `next/headers`, which forces those routes into full dynamic SSR on every
// request and defeats hourly ISR.
export function createClient() {
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
