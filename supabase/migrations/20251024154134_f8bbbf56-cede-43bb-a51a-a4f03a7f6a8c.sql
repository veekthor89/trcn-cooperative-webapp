-- Make purpose column nullable since it's only required for housing loans
ALTER TABLE public.loan_applications 
ALTER COLUMN purpose DROP NOT NULL;