// 100 simultaneous RSVPs on one event must never overshoot capacity
// (10, section 3; 08, Phase 5 race test). Local or staging only.
//
//   node scripts/rsvp-race.ts            # 100 members racing for 25 places
//
// Uses the service role to arrange fixtures, then signs each racer in with
// the anon key so every RSVP goes through RLS and the capacity trigger.

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run against production.')
  process.exit(1)
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RACERS = Number(process.env.RACERS ?? 100)
const CAPACITY = Number(process.env.CAPACITY ?? 25)
const PASSWORD = 'race-Correct-Horse-42'

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })

async function racer(i: number) {
  const email = `race-${i}@example.test`
  let { data: existing } = await svc.from('profiles').select('id').eq('email', email).maybeSingle()
  if (!existing) {
    const { data, error } = await svc.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `Racer ${i}` } })
    if (error) throw error
    existing = { id: data.user.id }
  }
  await svc.from('profiles').update({ status: 'active' }).eq('id', existing.id)
  const client = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw error
  return { id: existing.id, client }
}

async function main() {
  const { data: event, error } = await svc
    .from('events')
    .insert({
      slug: `race-${Date.now()}`,
      title: 'Race test',
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      capacity: CAPACITY,
      visibility: 'members',
    })
    .select('id')
    .single()
  if (error) throw error

  console.log(`Preparing ${RACERS} members…`)
  const racers = await Promise.all(Array.from({ length: RACERS }, (_, i) => racer(i)))

  console.log(`Firing ${RACERS} RSVPs at once for ${CAPACITY} places…`)
  const results = await Promise.all(
    racers.map(r => r.client.from('event_rsvps').insert({ event_id: event.id, user_id: r.id, status: 'going', guests_count: 0 }))
  )
  const accepted = results.filter(r => !r.error).length
  const refused = results.filter(r => r.error?.message.includes('capacity')).length
  const other = results.filter(r => r.error && !r.error.message.includes('capacity'))

  const { data: rows } = await svc.from('event_rsvps').select('guests_count').eq('event_id', event.id).eq('status', 'going')
  const seats = (rows ?? []).reduce((n, r) => n + 1 + r.guests_count, 0)

  await svc.from('events').delete().eq('id', event.id)

  console.log({ accepted, refusedForCapacity: refused, otherErrors: other.length, seatsTaken: seats, capacity: CAPACITY })
  if (other.length) console.log('First other error:', other[0]!.error)
  if (seats > CAPACITY) {
    console.error('FAIL: capacity overshoot')
    process.exit(1)
  }
  console.log('PASS: no overshoot')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
