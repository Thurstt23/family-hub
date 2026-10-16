import 'server-only'
import { sendEmail } from '@/lib/email/send'
import { createElement } from 'react'

// Structured error line for Vercel logs (filterable by `"level":"error"`),
// plus an email to ALERT_EMAIL when it is set. A silent webhook failure means
// paying members without access (09, section 7), so it must reach a person.
export async function alertOps(event: string, details: Record<string, unknown>) {
  console.error(JSON.stringify({ level: 'error', event, ...details, at: new Date().toISOString() }))
  const to = process.env.ALERT_EMAIL
  if (!to) return
  await sendEmail({
    to,
    subject: `[Martin Sawyer Reunion] ${event}`,
    react: createElement('pre', { style: { fontFamily: 'monospace', fontSize: '13px' } }, JSON.stringify(details, null, 2)),
  })
}
