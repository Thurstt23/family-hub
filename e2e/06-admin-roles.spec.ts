import { expect, test } from '@playwright/test'
import { USERS, serviceClient, signedInClient, userId } from './support/supabase'

// Critical path 6 plus the role rails from 06, section 5.

test.afterAll(async () => {
  const id = await userId(USERS.member.email)
  await serviceClient().from('user_roles').delete().eq('user_id', id).eq('role', 'admin')
})

test('an admin cannot grant admin, through the API or the UI', async ({ browser }) => {
  const memberId = await userId(USERS.member.email)
  const admin = await signedInClient(USERS.admin.email)
  const { error } = await admin.from('user_roles').insert({ user_id: memberId, role: 'admin' })
  expect(error).not.toBeNull()

  const page = await (await browser.newContext({ storageState: 'e2e/.auth/admin.json' })).newPage()
  await page.goto(`/admin/members/${memberId}`)
  await expect(page.getByText('Only an owner can grant or revoke roles.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Grant', exact: true })).toHaveCount(0)
})

test('an owner grants admin and it takes effect on the next request', async ({ browser }) => {
  const memberId = await userId(USERS.member.email)
  const owner = await (await browser.newContext({ storageState: 'e2e/.auth/owner.json' })).newPage()
  await owner.goto(`/admin/members/${memberId}`)
  await owner.getByLabel('Grant role').selectOption('admin')
  await owner.getByRole('button', { name: 'Grant', exact: true }).click()
  await expect(owner.getByRole('status').filter({ hasText: 'Granted admin' })).toBeVisible()

  // The member, already signed in, can open the admin console without
  // signing in again.
  const member = await (await browser.newContext({ storageState: 'e2e/.auth/member.json' })).newPage()
  await member.goto('/admin/members')
  await expect(member).toHaveURL(/\/admin\/members$/)

  // Every mutating action leaves an audit row.
  const { data: audit } = await serviceClient()
    .from('audit_log')
    .select('action, meta')
    .eq('action', 'role.grant')
    .eq('entity_id', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
  expect(audit?.[0]?.meta).toMatchObject({ role: 'admin' })
})

test('the last owner cannot be removed and nobody can revoke their own role', async () => {
  const ownerId = await userId(USERS.owner.email)
  const svc = serviceClient()
  const { count } = await svc.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'owner')
  test.skip((count ?? 0) !== 1, 'Another owner exists in this database; the last-owner rule cannot be exercised.')

  const owner = await signedInClient(USERS.owner.email)
  const { error } = await owner.from('user_roles').delete().eq('user_id', ownerId).eq('role', 'owner')
  expect(error?.message).toMatch(/own role|last owner/)

  const { data: still } = await svc.from('user_roles').select('role').eq('user_id', ownerId).eq('role', 'owner')
  expect(still).toHaveLength(1)
})
