import { expect, test } from '@playwright/test'
import { USERS, serviceClient, signedInClient, userId } from './support/supabase'

// Critical path 5: RSVP, edit it, the deadline passes, the RSVP locks, and
// the lock holds against a direct API call too.
test.use({ storageState: 'e2e/.auth/member.json' })

const slug = `e2e-picnic-${Date.now()}`
let eventId = ''

test.beforeAll(async () => {
  const { data, error } = await serviceClient()
    .from('events')
    .insert({
      slug,
      title: 'E2E Riverside Picnic',
      description: 'Bring a chair.',
      location_name: 'Forsyth Park',
      starts_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      rsvp_deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      capacity: 40,
      visibility: 'members',
    })
    .select('id')
    .single()
  if (error) throw error
  eventId = data.id
})

test.afterAll(async () => {
  await serviceClient().from('events').delete().eq('id', eventId)
})

test('RSVP, edit, then the deadline locks it', async ({ page }) => {
  const memberId = await userId(USERS.member.email)

  await page.goto(`/events/${slug}`)
  await page.getByLabel('Your Response').selectOption('going')
  await page.getByLabel('Additional Guests').selectOption('1')
  await page.getByRole('button', { name: 'Submit RSVP' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Your RSVP is saved' })).toBeVisible()

  await page.reload()
  await page.getByLabel('Additional Guests').selectOption('2')
  await page.getByRole('button', { name: 'Update RSVP' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Your RSVP is saved' })).toBeVisible()

  const { data: row } = await serviceClient().from('event_rsvps').select('status, guests_count').eq('event_id', eventId).eq('user_id', memberId).single()
  expect(row).toEqual({ status: 'going', guests_count: 2 })

  // The deadline passes.
  await serviceClient().from('events').update({ rsvp_deadline: new Date(Date.now() - 60_000).toISOString() }).eq('id', eventId)

  await page.reload()
  await expect(page.getByText('The RSVP deadline for this event has passed.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Update RSVP' })).toHaveCount(0)

  // And the database refuses a change made around the UI.
  const member = await signedInClient(USERS.member.email)
  const { error } = await member
    .from('event_rsvps')
    .update({ guests_count: 5 })
    .eq('event_id', eventId)
    .eq('user_id', memberId)
  expect(error?.message).toContain('RSVP deadline has passed')
})
