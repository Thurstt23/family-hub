import { expect, test } from '@playwright/test'
import { USERS, serviceClient } from './support/supabase'

// Critical path 2: search a surname, open the profile, and check that hidden
// fields are absent from the raw response, not merely hidden with CSS.
test.use({ storageState: 'e2e/.auth/member.json' })

test('directory search finds a member and hidden contact fields never reach the HTML', async ({ page }) => {
  const { data: target } = await serviceClient()
    .from('profiles')
    .select('handle, phone, email, show_phone, show_email')
    .eq('email', USERS.private.email)
    .single()
  expect(target?.show_phone).toBe(false)
  expect(target?.phone).toBeTruthy()

  await page.goto('/directory?search=Quietly')
  const row = page.getByRole('link', { name: /Quentin Quietly/ })
  await expect(row).toBeVisible()

  // Keyboard reaches and opens the row (08, Phase 4).
  await row.focus()
  await page.keyboard.press('Enter')
  await page.waitForURL(`**/directory/${target!.handle}`)
  await expect(page.getByRole('heading', { name: 'Quentin Quietly' })).toBeVisible()

  const res = await page.request.get(`/directory/${target!.handle}`)
  expect(res.status()).toBe(200)
  const body = await res.text()
  expect(body).toContain('Quentin Quietly')
  expect(body).not.toContain(target!.phone!)
  expect(body).not.toContain('555 0199')
  expect(body).not.toContain(target!.email!)
})
