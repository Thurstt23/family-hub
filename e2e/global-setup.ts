import { chromium, type FullConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { PASSWORD, USERS, branchId, ensureUser, serviceClient, setTier } from './support/supabase'

// Seeds the fixture accounts and stores one signed-in browser state per role
// (10, section 1: member.json, steward.json, admin.json, plus owner.json).
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]!.use.baseURL!
  mkdirSync('e2e/.auth', { recursive: true })

  const ids: Record<string, string> = {}
  for (const [key, u] of Object.entries(USERS)) {
    ids[key] = await ensureUser(u.email, { name: u.name, branch: u.branch, roles: u.roles })
  }

  const svc = serviceClient()
  // The steward looks after Martin (Savannah) only.
  await svc.from('branch_stewards').delete().eq('user_id', ids.steward!)
  await svc.from('branch_stewards').insert({ user_id: ids.steward!, branch_id: await branchId('martin-savannah') })
  // Undo anything an earlier run of the role test granted.
  await svc.from('user_roles').delete().eq('user_id', ids.admin!).neq('role', 'member').neq('role', 'admin')
  await svc.from('user_roles').delete().eq('user_id', ids.member!).neq('role', 'member')

  await setTier(ids.member!, 'free')
  await setTier(ids.patron!, 'patron')
  await svc
    .from('profiles')
    .update({ phone: '+1 912 555 0199', show_phone: false, show_email: false })
    .eq('id', ids.private!)

  const browser = await chromium.launch()
  for (const key of ['member', 'steward', 'admin', 'owner'] as const) {
    const page = await browser.newPage({ baseURL })
    await page.goto('/login')
    await page.locator('#email').fill(USERS[key].email)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL('**/hub')
    await page.context().storageState({ path: `e2e/.auth/${key}.json` })
    await page.close()
  }
  await browser.close()
}
