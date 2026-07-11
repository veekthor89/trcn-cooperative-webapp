## Bulk Upload Consolidation Plan

Replace the 5 separate bulk upload pages with a single unified page containing two purpose-built sections: **New Member Onboarding** and **Monthly Salary Deduction Update**.

### 1. Sidebar cleanup (`src/components/DashboardLayout.tsx`)
- Remove all 5 existing bulk upload buttons under Data Management.
- Add a single "Bulk Upload" button that navigates to `/dashboard/bulk-upload`.

### 2. Route cleanup (`src/App.tsx`)
- Keep `/dashboard/bulk-upload` route pointing to the new unified page.
- Remove the 4 legacy routes: `/bulk-upload-accounts`, `/bulk-upload-loans`, `/bulk-upload-transactions`, `/bulk-upload-special-contributions`, and their imports.
- Delete the old page files: `BulkUploadAccounts.tsx`, `BulkUploadLoans.tsx`, `BulkUploadTransactions.tsx`, `BulkUploadSpecialContributions.tsx`.

### 3. New unified page (`src/pages/BulkUpload.tsx` — rewritten)
A single page with two Cards separated by a divider.

**Section 1 — New Member Onboarding**
- Description text as specified.
- Download Template button → generates `.xlsx` with columns: `full_name, email, phone, address, date_of_birth, savings_balance, special_loan_amount, trade_loan_amount, normal_loan_amount, land_loan_amount, contribution_amount`.
- Drag-and-drop zone + "Browse File" button; accepts `.xlsx` / `.csv`.
- Upload progress indicator (spinner + row counter).
- Summary card after processing: created / skipped duplicates / errors, plus a "Download Error Report" button (.xlsx).

**Section 2 — Monthly Salary Deduction Update**
- Description text as specified.
- Month selector (month + year picker).
- Download Template button → columns: `full_name, email, savings_deduction, contribution_amount, special_loan_repayment, trade_loan_repayment, normal_loan_repayment, land_loan_repayment, month`.
- Drag-and-drop upload area.
- Confirmation dialog if any transaction rows already exist for the selected month.
- Progress + summary card + error report download.

### 4. Edge functions
Create two new edge functions (both auth+admin gated, service-role for writes):

**`supabase/functions/bulk-onboard-members/index.ts`**
- Validates each row.
- Creates auth user with password `trcn2026`, upserts profile (with `must_change_password: true`).
- Inserts opening-balance `deposit` transaction (with `included_in_opening_balance: true`) for `savings_balance`.
- For each loan amount > 0, inserts a row into `loans` (status `active`) with type mapped: `special_loan_amount → special`, `trade_loan_amount → trade`, `normal_loan_amount → normal`, `land_loan_amount → land`. Uses the existing loan schema (principal + outstanding = amount).
- For `contribution_amount > 0`, inserts a `special_contributions` row (opening balance).
- Returns per-row status: `created | skipped_duplicate | error` + reason.

**`supabase/functions/bulk-monthly-deductions/index.ts`**
- Accepts `{ rows, month, confirmOverride }`.
- Pre-check: if any transaction exists tagged with the selected month and returns `requiresConfirmation: true` unless `confirmOverride`.
- For each row: match member by email; skip duplicates within the batch; for each non-zero column, insert the appropriate transaction (`deposit` for savings/contribution, `repayment` for loan lines against the active loan of that type). Balances are updated by the existing `update_account_balance_on_transaction` trigger.
- Validates `month` as `YYYY-MM`.
- Returns per-row results + counts.

### 5. Frontend helpers
- Use existing `xlsx` dependency to parse uploads and generate templates + error reports.
- Reuse `edgeFunctionError` for error formatting.

### Technical notes
- No schema migration needed — reuses existing tables (`profiles`, `transactions`, `loans`, `special_contributions`, `accounts`) and triggers.
- Loan type mapping assumes the existing `loans.loan_type` enum already includes `special`, `trade`, `normal`, `land` (will verify from `types.ts` before writing the function; adjust naming if needed).
- Opening-balance transactions use `included_in_opening_balance = true` to avoid double-counting per the project's opening balance handling rule.
- Monthly deduction transactions include a `description` like `"Salary deduction 2026-07"` so we can detect prior uploads for a given month.
