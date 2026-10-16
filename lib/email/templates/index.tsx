import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { EmailLayout, button, color, heading, text } from './layout'

// One component per row of the system email table in 04, section 7. The two
// rows sent by Supabase Auth (confirm email, password reset) are configured
// in Supabase, not here.

export function PendingReceivedEmail({ name }: { name: string }) {
  return (
    <EmailLayout preview="We received your request to join the family register.">
      <Heading style={heading}>We received your request</Heading>
      <Text style={text}>Dear {name},</Text>
      <Text style={text}>
        Thank you for joining the Martin Sawyer family register. A steward from your branch will
        review your request, usually within a few days. We will write again as soon as you are approved.
      </Text>
      <Text style={text}>Nothing else is needed from you for now.</Text>
    </EmailLayout>
  )
}

export function WelcomeEmail({ name, siteUrl }: { name: string; siteUrl: string }) {
  return (
    <EmailLayout preview="You have been approved. Welcome to the hub.">
      <Heading style={heading}>Welcome to the hub</Heading>
      <Text style={text}>Dear {name},</Text>
      <Text style={text}>
        Your request has been approved. You can now open the family directory, see upcoming
        gatherings, and share photographs with the rest of the family.
      </Text>
      <Section style={{ margin: '8px 0 24px' }}>
        <Button href={`${siteUrl}/hub`} style={button}>Open the hub</Button>
      </Section>
      <Text style={text}>
        A good first step is to check your entry in the directory and choose which details other members can see.
      </Text>
    </EmailLayout>
  )
}

export type StatusKind = 'rejected' | 'suspended' | 'reinstated' | 'info_requested'

const STATUS_COPY: Record<StatusKind, { subject: string; heading: string; body: string }> = {
  rejected: {
    subject: 'An update on your request to join',
    heading: 'An update on your request',
    body: 'A steward reviewed your request and was not able to approve it yet.',
  },
  suspended: {
    subject: 'Your account has been suspended',
    heading: 'Your account has been suspended',
    body: 'An administrator has suspended your access to the family hub.',
  },
  reinstated: {
    subject: 'Your account has been reinstated',
    heading: 'Your access is restored',
    body: 'An administrator has reinstated your account. You can sign in again as usual.',
  },
  info_requested: {
    subject: 'We need a little more information',
    heading: 'A little more information, please',
    body: 'A steward is reviewing your request and needs a few more details before approving it.',
  },
}

export function statusSubject(kind: StatusKind) {
  return STATUS_COPY[kind].subject
}

export function StatusUpdateEmail({
  name,
  kind,
  reason,
  siteUrl,
}: {
  name: string
  kind: StatusKind
  reason?: string | null
  siteUrl: string
}) {
  const copy = STATUS_COPY[kind]
  return (
    <EmailLayout preview={copy.subject}>
      <Heading style={heading}>{copy.heading}</Heading>
      <Text style={text}>Dear {name},</Text>
      <Text style={text}>{copy.body}</Text>
      {reason ? (
        <Section style={{ borderLeft: `3px solid ${color.rule}`, padding: '4px 0 4px 16px', margin: '0 0 16px' }}>
          <Text style={{ ...text, margin: 0 }}>{reason}</Text>
        </Section>
      ) : null}
      {kind === 'info_requested' || kind === 'rejected' ? (
        <Text style={text}>
          You can update your details at <Link href={`${siteUrl}/onboarding`} style={{ color: color.brass }}>{siteUrl}/onboarding</Link>,
          or simply reply to this email.
        </Text>
      ) : (
        <Text style={text}>If you think this is a mistake, reply to this email and a steward will look into it.</Text>
      )}
    </EmailLayout>
  )
}

export function PaymentFailedEmail({ name, siteUrl }: { name: string; siteUrl: string }) {
  return (
    <EmailLayout preview="Your membership payment did not go through.">
      <Heading style={heading}>Update your card</Heading>
      <Text style={text}>Dear {name},</Text>
      <Text style={text}>
        We could not collect your latest membership payment. Your benefits stay in place while Stripe
        retries, but please update your card so nothing lapses.
      </Text>
      <Section style={{ margin: '8px 0 24px' }}>
        <Button href={`${siteUrl}/me/membership`} style={button}>Update payment details</Button>
      </Section>
      <Text style={{ ...text, fontSize: '15px', color: color.slate }}>
        The button opens your membership page, where &ldquo;Manage billing&rdquo; takes you to the secure Stripe portal.
      </Text>
    </EmailLayout>
  )
}

export type DigestPost = { title: string; slug: string; excerpt: string | null; published_at: string }

export function AnnouncementDigestEmail({
  name,
  posts,
  siteUrl,
  unsubscribeUrl,
}: {
  name: string
  posts: DigestPost[]
  siteUrl: string
  unsubscribeUrl: string
}) {
  return (
    <EmailLayout
      preview={`${posts.length} new announcement${posts.length === 1 ? '' : 's'} from the family`}
      footer={
        <>
          You receive this weekly digest because announcement emails are on for your account.{' '}
          <Link href={unsubscribeUrl} style={{ color: color.slate, textDecoration: 'underline' }}>Unsubscribe</Link>
          {' '}or change it on your profile page.
        </>
      }
    >
      <Heading style={heading}>This week in the family</Heading>
      <Text style={text}>Dear {name}, here is what was announced this week.</Text>
      {posts.map(post => (
        <Section key={post.slug} style={{ borderTop: `1px solid ${color.rule}`, padding: '16px 0 0', margin: '0 0 16px' }}>
          <Link href={`${siteUrl}/hub/posts/${post.slug}`} style={{ ...text, fontWeight: 700, color: color.ink, textDecoration: 'none' }}>
            {post.title}
          </Link>
          {post.excerpt ? <Text style={{ ...text, color: color.slate, margin: '4px 0 0' }}>{post.excerpt}</Text> : null}
        </Section>
      ))}
    </EmailLayout>
  )
}
