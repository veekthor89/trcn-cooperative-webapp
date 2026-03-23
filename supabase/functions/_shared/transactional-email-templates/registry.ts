/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as passwordResetNotification } from './password-reset-notification.tsx'
import { template as loanDisbursed } from './loan-disbursed.tsx'
import { template as depositApproved } from './deposit-approved.tsx'
import { template as savingsDepositConfirmed } from './savings-deposit-confirmed.tsx'
import { template as specialContributionPayout } from './special-contribution-payout.tsx'
import { template as sharesPurchased } from './shares-purchased.tsx'
import { template as urgentAnnouncement } from './urgent-announcement.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'password-reset-notification': passwordResetNotification,
  'loan-disbursed': loanDisbursed,
  'deposit-approved': depositApproved,
  'savings-deposit-confirmed': savingsDepositConfirmed,
  'special-contribution-payout': specialContributionPayout,
  'shares-purchased': sharesPurchased,
  'urgent-announcement': urgentAnnouncement,
}
