import 'server-only'
import type { ReactElement } from 'react'
import { Resend } from 'resend'
import { env } from '@/lib/env'
import {
  PaymentFailedEmail,
  PendingReceivedEmail,
  StatusUpdateEmail,
  WelcomeEmail,
  statusSubject,
  type StatusKind,
} from './templates'

export const resend = new Resend(env.RESEND_API_KEY)

// Email is a side effect of an action, never its gate: a Resend outage must
// not roll back an approval. Failures are logged and reported as false.
export async function sendEmail(opts: {
  to: string
  subject: string
  react: ReactElement
  headers?: Record<string, string>
}): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      react: opts.react,
      headers: opts.headers,
    })
    if (error) {
      console.error(`[email] "${opts.subject}" to ${opts.to} failed:`, error.message)
      return false
    }
    return true
  } catch (err) {
    console.error(`[email] "${opts.subject}" to ${opts.to} threw:`, err)
    return false
  }
}

type Recipient = { email: string | null; full_name: string }

export function sendPendingReceived(p: Recipient) {
  if (!p.email) return Promise.resolve(false)
  return sendEmail({
    to: p.email,
    subject: 'We received your request',
    react: PendingReceivedEmail({ name: p.full_name }),
  })
}

export function sendWelcome(p: Recipient) {
  if (!p.email) return Promise.resolve(false)
  return sendEmail({
    to: p.email,
    subject: 'Welcome to the hub',
    react: WelcomeEmail({ name: p.full_name, siteUrl: env.NEXT_PUBLIC_SITE_URL }),
  })
}

export function sendStatusUpdate(p: Recipient, kind: StatusKind, reason?: string | null) {
  if (!p.email) return Promise.resolve(false)
  return sendEmail({
    to: p.email,
    subject: statusSubject(kind),
    react: StatusUpdateEmail({ name: p.full_name, kind, reason, siteUrl: env.NEXT_PUBLIC_SITE_URL }),
  })
}

export function sendPaymentFailed(p: Recipient) {
  if (!p.email) return Promise.resolve(false)
  return sendEmail({
    to: p.email,
    subject: 'Your membership payment did not go through',
    react: PaymentFailedEmail({ name: p.full_name, siteUrl: env.NEXT_PUBLIC_SITE_URL }),
  })
}
