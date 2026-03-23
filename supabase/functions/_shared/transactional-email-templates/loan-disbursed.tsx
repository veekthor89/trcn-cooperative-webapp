/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TRCN SMCS'

interface LoanDisbursedProps {
  memberName?: string
  loanType?: string
  amount?: string
}

const LoanDisbursedEmail = ({ memberName, loanType = 'Loan', amount = '0' }: LoanDisbursedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {loanType} of ₦{amount} has been disbursed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={hr} />
        <Heading style={h2}>Loan Disbursed — ₦{amount}</Heading>
        <Text style={text}>
          {memberName ? `Dear ${memberName},` : 'Dear Member,'}
        </Text>
        <Text style={text}>
          Your <strong>{loanType}</strong> of <strong>₦{amount}</strong> has been disbursed. Check your account for details.
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
  component: LoanDisbursedEmail,
  subject: (data: Record<string, any>) => `Loan Disbursed - ₦${data.amount || '0'}`,
  displayName: 'Loan disbursed notification',
  previewData: { memberName: 'Onyia Christiana', loanType: 'Normal Loan', amount: '500,000' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '10px 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#006DFF', margin: '0' }
const h2 = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '20px 0 10px' }
const text = { fontSize: '14px', color: 'hsl(215, 16%, 47%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(214, 32%, 91%)', margin: '20px 0' }
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 47%)', margin: '0', textAlign: 'center' as const }
