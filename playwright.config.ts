import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

// The suite runs against a local Supabase (`supabase start`, then
// `supabase db reset`) and a production build of the app. See the README
// section "Running the end-to-end tests".
loadEnv({ path: '.env.local' })

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm build && pnpm start',
        url: baseURL,
        timeout: 300_000,
        reuseExistingServer: true,
      },
})
