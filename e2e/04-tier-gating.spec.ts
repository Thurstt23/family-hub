import { expect, test } from '@playwright/test'
import { USERS, serviceClient, signedInClient } from './support/supabase'

// Critical path 4: a free member calling the gated post API directly gets
// no rows; the patron does. RLS is the boundary, not the UI.

const slug = `e2e-patron-only-${Date.now()}`
const secret = `Patron archive passphrase ${Date.now()}`
let postId = ''

test.beforeAll(async () => {
  const { data, error } = await serviceClient()
    .from('posts')
    .insert({
      slug,
      title: 'Patron archive notes',
      body: secret,
      kind: 'notice',
      visibility: 'tier_gated',
      min_tier_level: 20,
      published_at: new Date(Date.now() - 60_000).toISOString(),
    })
    .select('id')
    .single()
  if (error) throw error
  postId = data.id
})

test.afterAll(async () => {
  await serviceClient().from('posts').delete().eq('id', postId)
})

test('a free member selecting a tier gated post directly gets zero rows', async () => {
  const free = await signedInClient(USERS.member.email)
  const { data, error } = await free.from('posts').select('id, body').eq('id', postId)
  expect(error).toBeNull()
  expect(data).toEqual([])
})

test('a patron can read the same post', async () => {
  const patron = await signedInClient(USERS.patron.email)
  const { data } = await patron.from('posts').select('id, body').eq('id', postId)
  expect(data).toHaveLength(1)
  expect(data![0]!.body).toBe(secret)
})

test('the gated text is not in the HTML a free member receives', async ({ browser }) => {
  const page = await (await browser.newContext({ storageState: 'e2e/.auth/member.json' })).newPage()
  const res = await page.request.get(`/hub/posts/${slug}`)
  expect(await res.text()).not.toContain(secret)
})
