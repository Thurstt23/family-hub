import { expect, test } from '@playwright/test'
import { USERS, setTier, userId } from './support/supabase'

// Critical path 3: free to paid in Stripe test mode. Needs real test keys,
// a supporter price mapped in membership_tiers, and the webhook forwarded:
//   stripe listen --forward-to localhost:3000/api/webhooks/stripe
// then run with STRIPE_E2E=1.
test.skip(!process.env.STRIPE_E2E, 'Set STRIPE_E2E=1 with stripe listen running to exercise Checkout.')
test.use({ storageState: 'e2e/.auth/member.json' })

test.afterAll(async () => {
  await setTier(await userId(USERS.member.email), 'free')
})

test('checkout in test mode, webhook fires, /me/membership shows the new tier', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/me/membership')
  await page.locator('form', { has: page.locator('input[name="tierSlug"][value="supporter"]') }).getByRole('button', { name: 'Upgrade' }).click()

  await page.waitForURL(/checkout\.stripe\.com/)
  await page.locator('#cardNumber').fill('4242 4242 4242 4242')
  await page.locator('#cardExpiry').fill('12 / 34')
  await page.locator('#cardCvc').fill('123')
  await page.locator('#billingName').fill(USERS.member.name)
  const zip = page.locator('#billingPostalCode')
  if (await zip.isVisible()) await zip.fill('31401')
  await page.getByTestId('hosted-payment-submit-button').click()

  await page.waitForURL('**/me/membership?checkout=success', { timeout: 60_000 })
  // Entitlement only comes from the webhook; the page re-reads until it lands.
  await expect(page.getByText('Your membership is now Supporter')).toBeVisible({ timeout: 45_000 })
})
