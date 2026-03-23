/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TRCN SMCS'

interface DepositApprovedProps {
  memberName?: string
  amount?: string
  depositType?: string
}

const DepositApprovedEmail = ({ memberName, amount = '0', depositType = 'Savings' }: DepositApprovedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your deposit of ₦{amount} has been confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={hr} />
        <Heading style={h2}>Deposit Confirmed — ₦{amount}</Heading>
        <Text style={text}>
          {memberName ? `Dear ${memberName},` : 'Dear Member,'}
        </Text>
        <Text style={text}>
          Your deposit of <strong>₦{amount}</strong> has been verified and added to your <strong>{depositType}</strong> account.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} | app.trcncoop.ng
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DepositApprovedEmail,
  subject: (data: Record<string, any>) => `Deposit Confirmed - ₦${data.amount || '0'}`,
  displayName: 'Deposit approved notification',
  previewData: { memberName: 'Onyia Christiana', amount: '50,000', depositType: 'Savings' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '10px 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#006DFF', margin: '0' }
const h2 = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '20px 0 10px' }
const text = { fontSize: '14px', color: 'hsl(215, 16%, 47%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(214, 32%, 91%)', margin: '20px 0' }
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 47%)', margin: '0', textAlign: 'center' as const }
