-- Fix special_contributions RLS policies to prevent direct manipulation of financial data

-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Users can manage own savings goals" ON public.special_contributions;

-- Create separate, granular policies

-- SELECT: Users can view their own contributions
CREATE POLICY "Users can view own contributions"
  ON public.special_contributions
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can create contributions with validation
CREATE POLICY "Users can create contributions"
  ON public.special_contributions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    target_amount > 0 AND
    target_amount <= 100000000 AND
    current_amount = 0 AND  -- Must start at 0, updated only via transactions
    contribution_name IS NOT NULL AND
    length(contribution_name) >= 2 AND
    length(contribution_name) <= 200
  );

-- UPDATE: Users can only update name and target, not current_amount
CREATE POLICY "Users can update contribution details"
  ON public.special_contributions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    current_amount = (SELECT current_amount FROM special_contributions WHERE id = special_contributions.id) AND  -- Prevent direct modification
    target_amount > 0 AND
    target_amount <= 100000000 AND
    contribution_name IS NOT NULL AND
    length(contribution_name) >= 2 AND
    length(contribution_name) <= 200
  );

-- DELETE: Prevent user deletion, only admins can delete for data integrity
CREATE POLICY "Only admins can delete contributions"
  ON public.special_contributions
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Admin policies for override
CREATE POLICY "Admins can view all contributions"
  ON public.special_contributions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage contributions"
  ON public.special_contributions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));