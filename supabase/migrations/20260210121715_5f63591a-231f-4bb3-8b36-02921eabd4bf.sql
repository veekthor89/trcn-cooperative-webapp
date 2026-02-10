
-- RLS policies for loan_approval_history
CREATE POLICY "Users can view history of own applications"
ON public.loan_approval_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM loan_applications la
    WHERE la.id = loan_approval_history.loan_application_id
    AND la.user_id = auth.uid()
  )
);

CREATE POLICY "EXCO members can view all history"
ON public.loan_approval_history FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'president'::app_role) OR
  has_role(auth.uid(), 'vice_president'::app_role) OR
  has_role(auth.uid(), 'general_secretary'::app_role) OR
  has_role(auth.uid(), 'assistant_general_secretary'::app_role) OR
  has_role(auth.uid(), 'financial_secretary'::app_role) OR
  has_role(auth.uid(), 'assistant_financial_secretary'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'assistant_treasurer'::app_role) OR
  has_role(auth.uid(), 'pro'::app_role)
);

CREATE POLICY "Authorized users can insert history"
ON public.loan_approval_history FOR INSERT
WITH CHECK (auth.uid() = performed_by);

-- EXCO access to loan_applications
CREATE POLICY "Financial secretaries can view all applications"
ON public.loan_applications FOR SELECT
USING (
  has_role(auth.uid(), 'financial_secretary'::app_role) OR
  has_role(auth.uid(), 'assistant_financial_secretary'::app_role)
);

CREATE POLICY "President can view all applications"
ON public.loan_applications FOR SELECT
USING (has_role(auth.uid(), 'president'::app_role));

CREATE POLICY "Treasurer can view all applications"
ON public.loan_applications FOR SELECT
USING (
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'assistant_treasurer'::app_role)
);

CREATE POLICY "View-only EXCO can view all applications"
ON public.loan_applications FOR SELECT
USING (
  has_role(auth.uid(), 'vice_president'::app_role) OR
  has_role(auth.uid(), 'general_secretary'::app_role) OR
  has_role(auth.uid(), 'assistant_general_secretary'::app_role) OR
  has_role(auth.uid(), 'pro'::app_role)
);

CREATE POLICY "Financial secretaries can update applications"
ON public.loan_applications FOR UPDATE
USING (
  has_role(auth.uid(), 'financial_secretary'::app_role) OR
  has_role(auth.uid(), 'assistant_financial_secretary'::app_role)
);

CREATE POLICY "President can update applications"
ON public.loan_applications FOR UPDATE
USING (has_role(auth.uid(), 'president'::app_role));

CREATE POLICY "Treasurer can update applications"
ON public.loan_applications FOR UPDATE
USING (
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'assistant_treasurer'::app_role)
);

CREATE POLICY "Users can update own applications when info requested"
ON public.loan_applications FOR UPDATE
USING (
  auth.uid() = user_id AND status = 'info_requested'::application_status
);

-- EXCO access to profiles
CREATE POLICY "EXCO can view all profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'president'::app_role) OR
  has_role(auth.uid(), 'vice_president'::app_role) OR
  has_role(auth.uid(), 'general_secretary'::app_role) OR
  has_role(auth.uid(), 'assistant_general_secretary'::app_role) OR
  has_role(auth.uid(), 'financial_secretary'::app_role) OR
  has_role(auth.uid(), 'assistant_financial_secretary'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'assistant_treasurer'::app_role) OR
  has_role(auth.uid(), 'pro'::app_role)
);

-- EXCO notification creation
CREATE POLICY "EXCO can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'president'::app_role) OR
  has_role(auth.uid(), 'financial_secretary'::app_role) OR
  has_role(auth.uid(), 'assistant_financial_secretary'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'assistant_treasurer'::app_role)
);

-- EXCO access to loans table
CREATE POLICY "Financial secretaries can view all loans"
ON public.loans FOR SELECT
USING (
  has_role(auth.uid(), 'financial_secretary'::app_role) OR
  has_role(auth.uid(), 'assistant_financial_secretary'::app_role)
);

CREATE POLICY "President can view all loans"
ON public.loans FOR SELECT
USING (has_role(auth.uid(), 'president'::app_role));

CREATE POLICY "Treasurer can view and manage loans"
ON public.loans FOR ALL
USING (
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'assistant_treasurer'::app_role)
);

-- Helper function
CREATE OR REPLACE FUNCTION public.has_any_exco_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('president', 'vice_president', 'general_secretary', 'assistant_general_secretary', 'financial_secretary', 'assistant_financial_secretary', 'treasurer', 'assistant_treasurer', 'pro')
  )
$$;
