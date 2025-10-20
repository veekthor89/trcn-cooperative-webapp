-- Create loan guarantor approvals table
CREATE TABLE IF NOT EXISTS public.loan_guarantor_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  loan_application_number text,
  guarantor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guarantor_member_id text NOT NULL,
  guarantor_name text NOT NULL,
  guarantor_position integer NOT NULL CHECK (guarantor_position IN (1, 2)),
  applicant_member_id text NOT NULL,
  applicant_name text NOT NULL,
  loan_amount numeric NOT NULL,
  loan_type loan_type NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'expired')),
  response_date timestamp with time zone,
  response_reason text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loan_guarantor_approvals ENABLE ROW LEVEL SECURITY;

-- Guarantors can view their own approval requests
CREATE POLICY "Guarantors can view own requests"
ON public.loan_guarantor_approvals
FOR SELECT
USING (
  auth.uid() = guarantor_user_id
);

-- Guarantors can update their own approval requests
CREATE POLICY "Guarantors can update own requests"
ON public.loan_guarantor_approvals
FOR UPDATE
USING (
  auth.uid() = guarantor_user_id
  AND status = 'pending'
);

-- Applicants can view their loan guarantor requests
CREATE POLICY "Applicants can view their guarantor requests"
ON public.loan_guarantor_approvals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.loan_applications
    WHERE loan_applications.id = loan_guarantor_approvals.loan_id
    AND loan_applications.user_id = auth.uid()
  )
);

-- Admins can view all guarantor approvals
CREATE POLICY "Admins can view all guarantor approvals"
ON public.loan_guarantor_approvals
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can manage all guarantor approvals
CREATE POLICY "Admins can manage guarantor approvals"
ON public.loan_guarantor_approvals
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add member_number to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'profiles' 
                 AND column_name = 'member_number') THEN
    ALTER TABLE public.profiles ADD COLUMN member_number text UNIQUE;
  END IF;
END $$;

-- Create index for faster guarantor lookups
CREATE INDEX IF NOT EXISTS idx_profiles_member_number ON public.profiles(member_number);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_loan_guarantor_approvals_guarantor ON public.loan_guarantor_approvals(guarantor_user_id);
CREATE INDEX IF NOT EXISTS idx_loan_guarantor_approvals_loan ON public.loan_guarantor_approvals(loan_id);