import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'

// Tokens from 07 Design System. Email clients ignore CSS variables, so the
// hex values are repeated here.
export const color = {
  ink: '#10233A',
  paper: '#EFF1EE',
  card: '#FFFFFF',
  slate: '#5A6672',
  rule: '#D6DAD5',
  brass: '#A97C2F',
  mulberry: '#6E2F45',
  clay: '#9C4A32',
}

export const text = {
  fontFamily: 'Karla, Helvetica, Arial, sans-serif',
  fontSize: '17px',
  lineHeight: '1.6',
  color: color.ink,
  margin: '0 0 16px',
}

export const heading = {
  fontFamily: 'Newsreader, Georgia, serif',
  fontSize: '30px',
  fontWeight: 500,
  lineHeight: '1.2',
  color: color.ink,
  margin: '0 0 24px',
}

export const button = {
  backgroundColor: color.brass,
  color: color.card,
  fontFamily: text.fontFamily,
  fontSize: '16px',
  fontWeight: 700,
  textDecoration: 'none',
  padding: '12px 20px',
  borderRadius: '4px',
  display: 'inline-block',
}

export function EmailLayout({
  preview,
  children,
  footer,
}: {
  preview: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: color.paper, margin: 0, padding: '32px 0' }}>
        <Container style={{ backgroundColor: color.card, maxWidth: '560px', padding: '40px 32px', border: `1px solid ${color.rule}` }}>
          <Text style={{ ...text, fontFamily: heading.fontFamily, fontSize: '18px', margin: '0 0 32px' }}>
            Martin Sawyer Reunion
          </Text>
          {children}
          <Hr style={{ borderColor: color.rule, margin: '32px 0 16px' }} />
          <Section>
            <Text style={{ ...text, fontSize: '13px', color: color.slate, margin: 0 }}>
              {footer ?? 'You are receiving this because you have an account on the Martin Sawyer family register.'}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
