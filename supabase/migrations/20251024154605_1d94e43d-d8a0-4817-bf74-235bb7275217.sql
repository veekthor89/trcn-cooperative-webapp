-- Drop the restrictive check constraint
ALTER TABLE public.loan_applications 
DROP CONSTRAINT IF EXISTS valid_repayment_period;

-- Add a more flexible constraint that allows any period between 3 and 120 months
ALTER TABLE public.loan_applications 
ADD CONSTRAINT valid_repayment_period 
CHECK (repayment_period >= 3 AND repayment_period <= 120);