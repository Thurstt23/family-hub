// Fails the build if a server secret reached the browser bundle
// (10, security matrix, last row). Run after `next build`:
//   node scripts/check-bundle-secrets.mjs
// It searches every file under .next/static for the literal values of the
// secrets in the current environment, plus a few unmistakable prefixes.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '.next/static'
const SECRET_VARS = ['SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'CRON_SECRET', 'R2_SECRET_ACCESS_KEY']
const PATTERNS = [/sk_live_[A-Za-z0-9]{10,}/, /sk_test_[A-Za-z0-9]{10,}/, /whsec_[A-Za-z0-9]{10,}/, /SUPABASE_SERVICE_ROLE_KEY/]

const needles = SECRET_VARS.map(name => [name, process.env[name]])
  .filter(([, v]) => v && v.length >= 12 && v !== 'dummy')

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) yield* walk(p)
    else yield p
  }
}

let problems = 0
let files = 0
try {
  statSync(ROOT)
} catch {
  console.error(`${ROOT} not found. Run next build first.`)
  process.exit(2)
}
for (const file of walk(ROOT)) {
  files++
  const text = readFileSync(file, 'latin1')
  for (const [name, value] of needles) {
    if (text.includes(value)) {
      console.error(`LEAK: the value of ${name} appears in ${file}`)
      problems++
    }
  }
  for (const re of PATTERNS) {
    if (re.test(text)) {
      console.error(`LEAK: ${re} matches in ${file}`)
      problems++
    }
  }
}

if (problems) {
  console.error(`${problems} secret leak(s) in the client bundle.`)
  process.exit(1)
}
console.log(`No server secrets in ${files} client files (${needles.length} secret values checked).`)
