-- 1. Tighten guarantor notification insert: must target the actual applicant
DROP POLICY IF EXISTS "Guarantors can notify loan applicants" ON public.notifications;
CREATE POLICY "Guarantors can notify loan applicants"
ON public.notifications
FOR INSERT
WITH CHECK (
  type IN ('guarantor_approved', 'guarantor_denied')
  AND EXISTS (
    SELECT 1
    FROM public.loan_guarantor_approvals lga
    JOIN public.loan_applications la ON la.id = lga.loan_id
    WHERE lga.guarantor_user_id = auth.uid()
      AND la.user_id = notifications.user_id
  )
);

-- 2. Add owner UPDATE/DELETE policies for deposit-receipts bucket
CREATE POLICY "Users can update own receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'deposit-receipts' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'deposit-receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'deposit-receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 3. Set immutable search_path on pgmq wrapper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;

-- 4. Revoke public/anon EXECUTE on pgmq wrapper functions (only service role / authenticated edge calls need them)
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;