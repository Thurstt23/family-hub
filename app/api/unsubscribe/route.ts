import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

// RFC 8058 one-click unsubscribe: mail clients POST here from the
// List-Unsubscribe header without opening a page. The token is the only
// credential, and the RPC can only switch announcements off for its owner.
export async function POST(req: Request) {
  const token = z.string().uuid().safeParse(new URL(req.url).searchParams.get('token'))
  if (!token.success) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  const { error } = await createClient().rpc('unsubscribe_by_token', { p_token: token.data })
  if (error) return NextResponse.json({ error: 'Could not unsubscribe' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
