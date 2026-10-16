import 'server-only'
import { timingSafeEqual } from 'node:crypto'

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Without a match the
// route is a public downgrade endpoint, so anything else gets a 401
// (05, section 5; 10, security matrix).
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') ?? ''
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
