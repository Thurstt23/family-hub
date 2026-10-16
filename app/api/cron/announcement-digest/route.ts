import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isAuthorizedCron } from '@/lib/cron/auth'
import { resend } from '@/lib/email/send'
import { AnnouncementDigestEmail, type DigestPost } from '@/lib/email/templates'
import { env } from '@/lib/env'
import { alertOps } from '@/lib/observability/alert'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PAGE = 1000
const BATCH = 100 // Resend batch limit

// ISO week key, e.g. 2026-W42. One digest per week, whatever the retries.
function weekKey(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// Weekly announcement digest (08, Phase 9). Opt outs are re-read immediately
// before every batch is sent, so an unsubscribe that lands mid-run is honoured.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const week = weekKey(now)

  const { data: already } = await supabaseAdmin
    .from('audit_log')
    .select('id')
    .eq('action', 'digest.sent')
    .eq('entity_id', week)
    .limit(1)
  if (already?.length) return NextResponse.json({ message: 'Already sent this week', week })

  // Only public and members-wide announcements: listing a tier gated title to
  // a free member would leak what the paywall hides.
  const { data: posts, error: postsError } = await supabaseAdmin
    .from('posts')
    .select('title, slug, excerpt, published_at')
    .eq('kind', 'announcement')
    .in('visibility', ['public', 'members'])
    .gte('published_at', new Date(now.getTime() - 7 * 86400000).toISOString())
    .lte('published_at', now.toISOString())
    .order('published_at', { ascending: false })
  if (postsError) {
    await alertOps('digest.failed', { week, error: postsError.message })
    return NextResponse.json({ error: postsError.message }, { status: 500 })
  }
  if (!posts?.length) return NextResponse.json({ message: 'No announcements this week', week, sent: 0 })

  const subject = posts.length === 1 ? `This week: ${posts[0]!.title}` : `This week in the family: ${posts.length} announcements`
  let sent = 0
  let skipped = 0
  let batchNo = 0

  for (let offset = 0; ; offset += PAGE) {
    const { data: members, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('status', 'active')
      .not('email', 'is', null)
      .order('id')
      .range(offset, offset + PAGE - 1)
    if (error) {
      await alertOps('digest.failed', { week, offset, error: error.message })
      return NextResponse.json({ error: error.message, sent }, { status: 500 })
    }
    if (!members?.length) break

    for (let i = 0; i < members.length; i += BATCH) {
      const chunk = members.slice(i, i + BATCH)
      // Honour the opt out right before sending (no row means the default: on).
      const { data: prefs } = await supabaseAdmin
        .from('email_preferences')
        .select('user_id, announcements, unsubscribe_token')
        .in('user_id', chunk.map(m => m.id))
      const prefBy = new Map((prefs ?? []).map(p => [p.user_id, p]))

      const emails = chunk.flatMap(m => {
        const pref = prefBy.get(m.id)
        if (!pref || !pref.announcements) {
          skipped++
          return []
        }
        const unsubscribeUrl = `${env.NEXT_PUBLIC_SITE_URL}/unsubscribe?token=${pref.unsubscribe_token}`
        return [
          {
            from: env.EMAIL_FROM,
            to: m.email as string,
            subject,
            react: AnnouncementDigestEmail({ name: m.full_name, posts: posts as DigestPost[], siteUrl: env.NEXT_PUBLIC_SITE_URL, unsubscribeUrl }),
            headers: {
              'List-Unsubscribe': `<${env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?token=${pref.unsubscribe_token}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          },
        ]
      })
      if (!emails.length) continue

      batchNo++
      // The idempotency key makes a retried run resend nothing Resend already accepted.
      const { error: sendError } = await resend.batch.send(emails, { idempotencyKey: `digest-${week}-${batchNo}` })
      if (sendError) {
        await alertOps('digest.batch_failed', { week, batch: batchNo, error: sendError.message })
        continue
      }
      sent += emails.length
    }
    if (members.length < PAGE) break
  }

  await supabaseAdmin.from('audit_log').insert({
    action: 'digest.sent',
    entity: 'digest',
    entity_id: week,
    meta: { posts: posts.map(p => p.slug), sent, skipped },
  })

  return NextResponse.json({ message: 'Digest sent', week, sent, skipped })
}
