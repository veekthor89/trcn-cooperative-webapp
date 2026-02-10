
-- Fix 1: Replace the overly permissive profile SELECT policy with a secure RPC
-- Drop the policy that exposes ALL PII to any authenticated user
DROP POLICY IF EXISTS "Users can view other profiles for guarantor selection" ON public.profiles;

-- Add a restrictive policy so users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Create a secure RPC that returns only safe fields for guarantor search
CREATE OR REPLACE FUNCTION public.search_guarantor_profiles(
  search_term text,
  exclude_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  full_name text,
  member_number text,
  department text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.member_number, p.department
  FROM public.profiles p
  WHERE p.id != ALL(exclude_ids)
    AND (
      p.full_name ILIKE '%' || search_term || '%'
      OR p.member_number ILIKE '%' || search_term || '%'
    )
  LIMIT 10;
$$;
