DROP POLICY IF EXISTS "Authorized users can insert history" ON public.loan_approval_history;

CREATE POLICY "Privileged roles can insert history"
ON public.loan_approval_history
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = performed_by
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'loan_officer'::app_role)
    OR public.has_role(auth.uid(), 'financial_secretary'::app_role)
    OR public.has_role(auth.uid(), 'assistant_financial_secretary'::app_role)
    OR public.has_role(auth.uid(), 'president'::app_role)
    OR public.has_role(auth.uid(), 'treasurer'::app_role)
    OR public.has_role(auth.uid(), 'assistant_treasurer'::app_role)
  )
);