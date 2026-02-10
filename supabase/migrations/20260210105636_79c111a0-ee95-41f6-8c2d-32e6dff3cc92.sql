
-- Fix 1: Remove overly permissive notification INSERT policy
DROP POLICY IF EXISTS "Allow authenticated users to create notifications" ON public.notifications;

-- Fix 2: Add auth check to guarantor search RPC
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
  WHERE auth.uid() IS NOT NULL
    AND p.id != ALL(exclude_ids)
    AND p.id != auth.uid()
    AND (
      p.full_name ILIKE '%' || search_term || '%'
      OR p.member_number ILIKE '%' || search_term || '%'
    )
  LIMIT 10;
$$;
