/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TRCN SMCS'

interface PasswordResetNotificationProps {
  memberName?: string
  defaultPassword?: string
}

const PasswordResetNotificationEmail = ({
  memberName,
  defaultPassword = 'trcn2026',
}: PasswordResetNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your password has been reset by an administrator</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={hr} />
        <Heading style={h2}>Password Reset Notification</Heading>
        <Text style={text}>
          {memberName ? `Dear ${memberName},` : 'Dear Member,'}
        </Text>
        <Text style={text}>
          Your account password has been reset by an administrator. Your new temporary password is:
        </Text>
        <Section style={codeSection}>
          <Text style={codeText}>{defaultPassword}</Text>
        </Section>
        <Text style={text}>
          Please log in with this temporary password and change it immediately for security purposes.
          You will be prompted to set a new password upon your next login.
        </Text>
        <Text style={warningText}>
          ⚠️ If you did not request this password reset, please contact the cooperative administrator immediately.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Best regards,<br />
          The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PasswordResetNotificationEmail,
  subject: 'Your Password Has Been Reset — TRCN SMCS',
  displayName: 'Password reset notification',
  previewData: { memberName: 'Onyia Christiana', defaultPassword: 'trcn2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '10px 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(217, 91%, 60%)', margin: '0' }
const h2 = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '20px 0 10px' }
const text = { fontSize: '14px', color: 'hsl(215, 16%, 47%)', lineHeight: '1.6', margin: '0 0 16px' }
const codeSection = {
  backgroundColor: 'hsl(210, 40%, 96%)',
  borderRadius: '0.75rem',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
}
const codeText = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(217, 91%, 60%)',
  letterSpacing: '2px',
  margin: '0',
}
const warningText = {
  fontSize: '13px',
  color: 'hsl(0, 84%, 60%)',
  lineHeight: '1.5',
  margin: '0 0 16px',
  padding: '12px',
  backgroundColor: 'hsl(0, 84%, 97%)',
  borderRadius: '0.75rem',
}
const hr = { borderColor: 'hsl(214, 32%, 91%)', margin: '20px 0' }
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 47%)', margin: '0' }
