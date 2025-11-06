-- Fix the guarantor update policy to allow status changes
DROP POLICY IF EXISTS "Guarantors can update own requests" ON public.loan_guarantor_approvals;

CREATE POLICY "Guarantors can update own requests"
ON public.loan_guarantor_approvals
FOR UPDATE
TO authenticated
USING (
  auth.uid() = guarantor_user_id AND status = 'pending'
)
WITH CHECK (
  auth.uid() = guarantor_user_id
);