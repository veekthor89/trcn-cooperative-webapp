-- Allow authenticated users to create notifications
-- This is needed so guarantors can notify applicants of their decision
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);