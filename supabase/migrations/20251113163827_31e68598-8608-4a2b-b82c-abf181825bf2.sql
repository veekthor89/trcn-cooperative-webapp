-- Add account_type column to special_contributions table
ALTER TABLE public.special_contributions 
ADD COLUMN account_type text;

-- Add a check constraint to ensure only 'Savings' or 'Current' values
ALTER TABLE public.special_contributions
ADD CONSTRAINT check_account_type CHECK (account_type IN ('Savings', 'Current'));