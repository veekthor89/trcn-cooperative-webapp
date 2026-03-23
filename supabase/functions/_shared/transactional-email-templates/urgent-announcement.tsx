/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TRCN SMCS'

interface UrgentAnnouncementProps {
  title?: string
  content?: string
}

const UrgentAnnouncementEmail = ({ title = 'Important Announcement', content = '' }: UrgentAnnouncementProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Important Announcement - {title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={hr} />
        <Section style={urgentBanner}>
          <Text style={urgentText}>⚠️ IMPORTANT ANNOUNCEMENT</Text>
        </Section>
        <Heading style={h2}>{title}</Heading>
        <Text style={bodyText}>{content}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} | app.trcncoop.ng
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: UrgentAnnouncementEmail,
  subject: (data: Record<string, any>) => `Important Announcement - ${data.title || 'TRCN Cooperative'}`,
  displayName: 'Urgent/Important announcement',
  previewData: { title: 'Emergency Meeting Notice', content: 'All members are required to attend the emergency general meeting scheduled for Friday.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '10px 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#006DFF', margin: '0' }
const h2 = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '20px 0 10px' }
const bodyText = { fontSize: '14px', color: 'hsl(215, 16%, 47%)', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' as const }
const urgentBanner = {
  backgroundColor: '#FEF2F2',
  borderRadius: '0.75rem',
  padding: '12px 16px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const urgentText = { fontSize: '13px', fontWeight: 'bold' as const, color: '#DC2626', margin: '0' }
const hr = { borderColor: 'hsl(214, 32%, 91%)', margin: '20px 0' }
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 47%)', margin: '0', textAlign: 'center' as const }
