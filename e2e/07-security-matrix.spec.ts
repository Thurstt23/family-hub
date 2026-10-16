import { expect, test } from '@playwright/test'
import Stripe from 'stripe'
import { PASSWORD, USERS, anonClient, deleteUser, ensureUser, serviceClient, signedInClient, userId } from './support/supabase'

// 10, section 2: every row is exercised by calling the API directly, because
// the UI already hides the buttons. The last row (service role key in the
// client bundle) is a build step: scripts/check-bundle-secrets.mjs.

const pendingEmail = `e2e-pending-${Date.now()}@example.test`
const outsiderEmail = `e2e-outsider-${Date.now()}@example.test`

test.beforeAll(async () => {
  await ensureUser(pendingEmail, { name: 'Pat Pending', status: 'pending', branch: 'martin-savannah' })
  // Pending, in a branch the steward does not look after.
  await ensureUser(outsiderEmail, { name: 'Otto Outsider', status: 'pending', branch: 'sawyer-charleston' })
})

test.afterAll(async () => {
  await deleteUser(pendingEmail)
  await deleteUser(outsiderEmail)
})

test('anon select on profiles returns 0 rows', async () => {
  const { data, error } = await anonClient().from('profiles').select('*')
  expect(error).toBeNull()
  expect(data).toEqual([])
})

test('a pending user reading the directory sees only their own row', async () => {
  const pending = await signedInClient(pendingEmail)
  const { data } = await pending.from('profiles').select('id, email')
  expect(data).toHaveLength(1)
  expect(data![0]!.email).toBe(pendingEmail)
})

test("member A cannot update member B's profile", async () => {
  const memberB = await userId(USERS.private.email)
  const a = await signedInClient(USERS.member.email)
  const { data } = await a.from('profiles').update({ city: 'Hacked' }).eq('id', memberB).select('id')
  expect(data ?? []).toEqual([])
  const { data: b } = await serviceClient().from('profiles').select('city').eq('id', memberB).single()
  expect(b?.city).not.toBe('Hacked')
})

test('a member setting their own status to active is silently reverted', async () => {
  const pending = await signedInClient(pendingEmail)
  const id = await userId(pendingEmail)
  await pending.from('profiles').update({ status: 'active' }).eq('id', id)
  const { data } = await serviceClient().from('profiles').select('status').eq('id', id).single()
  expect(data?.status).toBe('pending')
})

test('a member cannot write memberships', async () => {
  const member = await signedInClient(USERS.member.email)
  const id = await userId(USERS.member.email)
  const { data: lifetime } = await member.from('membership_tiers').select('id').eq('slug', 'lifetime').single()
  const insert = await member.from('memberships').insert({ user_id: id, tier_id: lifetime!.id })
  expect(insert.error).not.toBeNull()
  const update = await member.from('memberships').update({ tier_id: lifetime!.id }).eq('user_id', id).select('id')
  expect(update.data ?? []).toEqual([])
})

test('a steward cannot approve a member outside their branch, but can inside it', async () => {
  const steward = await signedInClient(USERS.steward.email)
  const outsider = await userId(outsiderEmail)
  const insider = await userId(pendingEmail)

  // Not even visible: the approvals queue is scoped by RLS.
  const { data: seen } = await steward.from('profiles').select('id').eq('id', outsider)
  expect(seen).toEqual([])

  const out = await steward.from('profiles').update({ status: 'active' }).eq('id', outsider).select('id')
  expect(out.data ?? []).toEqual([])
  const { data: o } = await serviceClient().from('profiles').select('status').eq('id', outsider).single()
  expect(o?.status).toBe('pending')

  const inn = await steward.from('profiles').update({ status: 'active' }).eq('id', insider).select('status')
  expect(inn.data?.[0]?.status).toBe('active')
  // Stewards may change status only; other fields are reverted by the trigger.
  await steward.from('profiles').update({ city: 'Elsewhere' }).eq('id', insider)
  const { data: i } = await serviceClient().from('profiles').select('city').eq('id', insider).single()
  expect(i?.city).not.toBe('Elsewhere')
  await serviceClient().from('profiles').update({ status: 'pending' }).eq('id', insider)
})

test('an admin cannot insert into user_roles', async () => {
  const admin = await signedInClient(USERS.admin.email)
  const { error } = await admin.from('user_roles').insert({ user_id: await userId(pendingEmail), role: 'steward' })
  expect(error).not.toBeNull()
})

test('a steward cannot read the audit log or payments', async () => {
  const steward = await signedInClient(USERS.steward.email)
  expect((await steward.from('audit_log').select('id').limit(1)).data).toEqual([])
  expect((await steward.from('payments').select('id').limit(1)).data).toEqual([])
  const stats = await steward.rpc('admin_dashboard_stats')
  expect(stats.data?.arr_cents ?? null).toBeNull()
})

test('the webhook rejects a forged signature with 400', async ({ request }) => {
  const res = await request.post('/api/webhooks/stripe', {
    data: JSON.stringify({ id: 'evt_forged', type: 'invoice.paid' }),
    headers: { 'stripe-signature': 't=1,v1=deadbeef', 'content-type': 'application/json' },
  })
  expect(res.status()).toBe(400)
})

test('a replayed webhook event is accepted once and creates no duplicate rows', async ({ request }) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET!
  const invoiceId = `in_e2e_${Date.now()}`
  const payload = JSON.stringify({
    id: `evt_e2e_${Date.now()}`,
    object: 'event',
    type: 'invoice.paid',
    data: {
      object: {
        id: invoiceId,
        object: 'invoice',
        customer: null,
        amount_paid: 2500,
        currency: 'usd',
        hosted_invoice_url: null,
        status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
        metadata: {},
      },
    },
  })
  const stripe = new Stripe('sk_test_unused')
  for (let i = 0; i < 2; i++) {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret })
    const res = await request.post('/api/webhooks/stripe', {
      data: payload,
      headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    })
    expect(res.status()).toBe(200)
  }
  const svc = serviceClient()
  const { count } = await svc.from('payments').select('id', { count: 'exact', head: true }).eq('stripe_invoice_id', invoiceId)
  expect(count).toBe(1)
  await svc.from('payments').delete().eq('stripe_invoice_id', invoiceId)
})

test('cron routes without CRON_SECRET return 401', async ({ request }) => {
  for (const path of ['/api/cron/reconcile-memberships', '/api/cron/announcement-digest']) {
    expect((await request.get(path)).status()).toBe(401)
    expect((await request.get(path, { headers: { authorization: 'Bearer wrong' } })).status()).toBe(401)
  }
})

test('an external next= redirect is rejected after sign in', async ({ page }) => {
  await page.goto('/login?next=//evil.example/steal')
  await page.locator('#email').fill(USERS.member.email)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForLoadState('networkidle')
  expect(new URL(page.url()).host).toBe(new URL(test.info().project.use.baseURL!).host)
})

test('markdown and comments containing a script tag render inert', async ({ browser }) => {
  const svc = serviceClient()
  const slug = `e2e-xss-${Date.now()}`
  const { data: post } = await svc
    .from('posts')
    .insert({
      slug,
      title: 'XSS probe',
      body: 'Hello <script>window.__pwned = 1</script> <img src=x onerror="window.__pwned = 2">',
      kind: 'notice',
      visibility: 'members',
      published_at: new Date(Date.now() - 60_000).toISOString(),
    })
    .select('id')
    .single()
  const member = await signedInClient(USERS.member.email)
  await member.from('comments').insert({ post_id: post!.id, author_id: await userId(USERS.member.email), body: '<script>window.__pwned = 3</script>' })

  const page = await (await browser.newContext({ storageState: 'e2e/.auth/member.json' })).newPage()
  await page.goto(`/hub/posts/${slug}`)
  await page.waitForLoadState('networkidle')
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined()

  await svc.from('posts').delete().eq('id', post!.id)
})

test('an SVG renamed to .png is rejected by the server', async ({ browser }) => {
  const page = await (await browser.newContext({ storageState: 'e2e/.auth/member.json' })).newPage()
  await page.goto('/me')
  await page.getByTestId('avatar-input').setInputFiles({
    name: 'portrait.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>'),
  })
  await expect(page.getByRole('alert').filter({ hasText: 'not a JPG, PNG, WebP or GIF' })).toBeVisible()
})
