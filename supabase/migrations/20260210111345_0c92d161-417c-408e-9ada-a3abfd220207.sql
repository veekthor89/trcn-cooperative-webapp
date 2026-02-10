
-- Step 1: Add EXCO roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'president';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_president';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'general_secretary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'assistant_general_secretary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financial_secretary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'assistant_financial_secretary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'treasurer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'assistant_treasurer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pro';

-- Step 2: Add new workflow statuses to application_status enum
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'pending_financial_review';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'pending_presidential_approval';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'approved_awaiting_disbursement';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'disbursed';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'info_requested';

-- Step 3: Add workflow columns to loan_applications
ALTER TABLE public.loan_applications 
  ADD COLUMN IF NOT EXISTS financial_reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS financial_review_date timestamptz,
  ADD COLUMN IF NOT EXISTS financial_review_comments text,
  ADD COLUMN IF NOT EXISTS presidential_approval_date timestamptz,
  ADD COLUMN IF NOT EXISTS presidential_comments text,
  ADD COLUMN IF NOT EXISTS disbursement_date timestamptz,
  ADD COLUMN IF NOT EXISTS disbursement_method text,
  ADD COLUMN IF NOT EXISTS disbursement_reference text,
  ADD COLUMN IF NOT EXISTS disbursed_by uuid,
  ADD COLUMN IF NOT EXISTS disbursement_notes text,
  ADD COLUMN IF NOT EXISTS info_request_message text;

-- Step 4: Create loan_approval_history table
CREATE TABLE IF NOT EXISTS public.loan_approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid NOT NULL,
  performer_role text NOT NULL,
  performer_name text,
  comments text,
  previous_status text,
  new_status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.loan_approval_history ENABLE ROW LEVEL SECURITY;
