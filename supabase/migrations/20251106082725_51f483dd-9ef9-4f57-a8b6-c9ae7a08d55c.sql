
-- Drop existing restrictive insert policy if it exists
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Create proper policy allowing authenticated users to create notifications for anyone
-- This is needed for guarantors to notify applicants and other notification flows
CREATE POLICY "Allow authenticated users to create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);
