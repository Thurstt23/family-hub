import { expect, test } from '@playwright/test'
import { PASSWORD, deleteUser, ensureUser } from './support/supabase'

// Critical path 1 (10, section 1): signup -> pending -> approved -> hub.

test('the signup form asks the new member to confirm their email', async ({ page }) => {
  const email = `e2e-signup-${Date.now()}@example.test`
  await page.goto('/signup')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Check your email')
  await deleteUser(email)
})

test('a new member waits on /pending until a steward approves, then reaches /hub', async ({ browser }) => {
  const email = `e2e-newcomer-${Date.now()}@example.test`
  const name = `Nora Newcomer ${Date.now() % 10000}`
  // A confirmed account that has not been through onboarding yet. Email
  // confirmation itself is Supabase's job and is covered by the test above.
  await ensureUser(email, { name, status: 'pending', branch: null })

  const member = await (await browser.newContext()).newPage()
  await member.goto('/login')
  await member.locator('#email').fill(email)
  await member.locator('#password').fill(PASSWORD)
  await member.getByRole('button', { name: 'Sign in', exact: true }).click()
  await member.waitForURL('**/onboarding')

  await member.getByLabel('Full name').fill(name)
  await member.getByLabel('Family branch').selectOption({ label: 'Martin (Savannah)' })
  await member.getByLabel('City').fill('Savannah')
  await member.getByLabel('Country').fill('USA')
  await member.getByRole('button', { name: 'Send my request' }).click()
  await member.waitForURL('**/pending')

  // Not a blank page or a crash: the hub sends a pending member back.
  await member.goto('/hub')
  await expect(member).toHaveURL(/\/pending$/)

  const steward = await (await browser.newContext({ storageState: 'e2e/.auth/steward.json' })).newPage()
  await steward.goto('/admin/approvals')
  await steward.getByRole('button', { name: `Send approval for ${name}` }).click()
  await expect(steward.getByRole('status').filter({ hasText: 'approved' })).toBeVisible()

  // Next request, no re-login.
  await member.goto('/hub')
  await expect(member).toHaveURL(/\/hub$/)

  await deleteUser(email)
})
