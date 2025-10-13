-- Add guarantor and bank details to loan_applications table
ALTER TABLE loan_applications
ADD COLUMN guarantor_1_name text,
ADD COLUMN guarantor_1_member_number text,
ADD COLUMN guarantor_1_phone text,
ADD COLUMN guarantor_2_name text,
ADD COLUMN guarantor_2_member_number text,
ADD COLUMN guarantor_2_phone text,
ADD COLUMN bank_name text,
ADD COLUMN account_number text,
ADD COLUMN account_name text,
ADD COLUMN account_type text,
ADD COLUMN monthly_income numeric,
ADD COLUMN repayment_period integer,
ADD COLUMN interest_amount numeric,
ADD COLUMN amount_received numeric,
ADD COLUMN monthly_payment numeric,
ADD COLUMN terms_accepted boolean DEFAULT false,
ADD COLUMN draft boolean DEFAULT false;

-- Add check constraint for repayment period
ALTER TABLE loan_applications
ADD CONSTRAINT valid_repayment_period 
CHECK (repayment_period IN (3, 6, 12, 18, 24, 36));