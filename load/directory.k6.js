// k6 load test for the directory (10, section 3).
//
//   k6 run load/directory.k6.js \
//     -e BASE_URL=https://staging.example.com \
//     -e SUPABASE_URL=https://<ref>.supabase.co -e SUPABASE_ANON_KEY=... \
//     -e EMAIL=e2e-member@example.test -e PASSWORD=...
//
// Two scenarios, run together:
//   pages:    200 virtual users loading /directory pages (p95 < 800ms, 0 5xx)
//   searches:  50 virtual users running searches (p95 < 600ms)
// Each VU signs in once through Supabase Auth and sends the session cookie
// the way @supabase/ssr stores it, so the app renders the real, RLS-scoped page.

import http from 'k6/http'
import { check, sleep } from 'k6'
import encoding from 'k6/encoding'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = __ENV.SUPABASE_URL
const ANON = __ENV.SUPABASE_ANON_KEY
const EMAIL = __ENV.EMAIL
const PASSWORD = __ENV.PASSWORD

const SURNAMES = ['smith', 'martin', 'sawyer', 'johnson', 'brown', 'davis', 'miller', 'wilson', 'moore', 'taylor']
const CITIES = ['savannah', 'atlanta', 'charleston', 'macon', 'augusta']

export const options = {
  scenarios: {
    pages: {
      executor: 'constant-vus',
      vus: 200,
      duration: '2m',
      exec: 'browse',
      tags: { scenario: 'pages' },
    },
    searches: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      exec: 'search',
      tags: { scenario: 'searches' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:pages}': ['p(95)<800'],
    'http_req_duration{scenario:searches}': ['p(95)<600'],
    'http_req_failed': ['rate<0.001'],
    'checks': ['rate>0.999'],
  },
}

// One sign in for the whole run; every VU reuses the session.
export function setup() {
  if (!SUPABASE_URL || !ANON || !EMAIL || !PASSWORD) {
    throw new Error('Set SUPABASE_URL, SUPABASE_ANON_KEY, EMAIL and PASSWORD')
  }
  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { apikey: ANON, 'Content-Type': 'application/json' } }
  )
  if (res.status !== 200) throw new Error(`sign in failed: ${res.status} ${res.body}`)
  const ref = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]
  const name = SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost') ? 'sb-127-auth-token' : `sb-${ref}-auth-token`
  // @supabase/ssr cookie format: "base64-" + base64url(JSON session).
  const value = 'base64-' + encoding.b64encode(res.body, 'rawurl')
  // Values over 3180 characters are split into name.0, name.1, ... like the library does.
  const CHUNK = 3180
  if (value.length <= CHUNK) return { cookie: `${name}=${value}` }
  const parts = []
  for (let i = 0; i * CHUNK < value.length; i++) parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`)
  return { cookie: parts.join('; ') }
}

function get(path, data, tag) {
  const res = http.get(`${BASE_URL}${path}`, { headers: { Cookie: data.cookie }, redirects: 0, tags: { name: tag } })
  check(res, {
    'status 200': r => r.status === 200,
    'is the directory, not a redirect to login': r => r.body && r.body.includes('Directory'),
  })
  return res
}

export function browse(data) {
  const page = Math.floor(Math.random() * 160)
  get(`/directory?page=${page}`, data, 'directory page')
  sleep(1 + Math.random() * 2)
}

export function search(data) {
  const q = Math.random() < 0.7 ? SURNAMES[Math.floor(Math.random() * SURNAMES.length)] : ''
  const city = Math.random() < 0.3 ? CITIES[Math.floor(Math.random() * CITIES.length)] : ''
  get(`/directory?search=${q}&city=${city}`, data, 'directory search')
  sleep(0.5 + Math.random())
}
