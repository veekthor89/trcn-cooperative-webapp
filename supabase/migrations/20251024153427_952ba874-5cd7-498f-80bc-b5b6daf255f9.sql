-- Allow users to view other profiles' basic info for guarantor selection
-- This is needed so users can search for and select guarantors when applying for loans
CREATE POLICY "Users can view other profiles for guarantor selection"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the old restrictive policy that only allowed viewing own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;