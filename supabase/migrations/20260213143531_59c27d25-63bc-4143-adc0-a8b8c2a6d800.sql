
-- Fix 1: Make profile-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'profile-photos';

-- Fix 2: Tighten loans table RLS - remove excessive role access
-- Drop overly broad policies
DROP POLICY IF EXISTS "Financial secretaries can view all loans" ON public.loans;
DROP POLICY IF EXISTS "President can view all loans" ON public.loans;
DROP POLICY IF EXISTS "Treasurer can view and manage loans" ON public.loans;

-- Re-add treasurer with SELECT only (needed for disbursement/financial reporting)
CREATE POLICY "Treasurer can view loans for reporting"
  ON public.loans
  FOR SELECT
  USING (
    has_role(auth.uid(), 'treasurer'::app_role) OR 
    has_role(auth.uid(), 'assistant_treasurer'::app_role)
  );
