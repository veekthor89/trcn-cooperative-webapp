
-- Allow users to create notifications for themselves (self-notifications for applications)
CREATE POLICY "Users can create own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow guarantors to notify loan applicants about their approval/denial
CREATE POLICY "Guarantors can notify loan applicants"
ON public.notifications FOR INSERT
WITH CHECK (
  type IN ('guarantor_approved', 'guarantor_denied')
  AND EXISTS (
    SELECT 1 FROM loan_guarantor_approvals
    WHERE guarantor_user_id = auth.uid()
    AND loan_id IN (
      SELECT id FROM loan_applications WHERE user_id = notifications.user_id
    )
  )
);
