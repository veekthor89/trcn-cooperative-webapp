-- Drop existing special_contributions table and recreate with new structure
DROP TABLE IF EXISTS public.special_contributions CASCADE;

-- Create enum for contribution status
CREATE TYPE public.contribution_status AS ENUM ('draft', 'pending', 'approved', 'active', 'completed', 'rejected', 'cancelled');

-- Create enum for purpose categories
CREATE TYPE public.contribution_purpose AS ENUM (
  'emergency_fund',
  'house_purchase',
  'car_purchase',
  'children_education',
  'wedding',
  'medical',
  'business_capital',
  'end_of_year_expenses',
  'other'
);

-- Create special_contributions table with comprehensive fields
CREATE TABLE public.special_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_number text,
  contribution_year integer NOT NULL,
  monthly_amount numeric(10,2) NOT NULL CHECK (monthly_amount >= 5000 AND monthly_amount <= 500000),
  duration_months integer NOT NULL DEFAULT 11,
  total_expected numeric(10,2) GENERATED ALWAYS AS (monthly_amount * 11) STORED,
  purpose_category contribution_purpose NOT NULL,
  purpose_description text,
  
  -- Member info (editable in form)
  department text,
  state_of_assignment text,
  
  -- Bank details
  bank_name text NOT NULL,
  account_number text NOT NULL CHECK (length(account_number) = 10),
  account_name text NOT NULL,
  
  -- Status and approval
  application_status contribution_status NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_date timestamp with time zone,
  
  -- Financial tracking
  total_contributed numeric(10,2) DEFAULT 0,
  balance numeric(10,2) GENERATED ALWAYS AS (monthly_amount * 11 - COALESCE(total_contributed, 0)) STORED,
  
  -- Dates
  maturity_date date GENERATED ALWAYS AS (make_date(contribution_year, 11, 30)) STORED,
  withdrawal_date timestamp with time zone,
  withdrawal_amount numeric(10,2),
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraint: One active/pending/approved contribution per member per year
  CONSTRAINT unique_contribution_per_year UNIQUE (user_id, contribution_year)
);

-- Create special_contribution_deductions table for monthly tracking
CREATE TABLE public.special_contribution_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid REFERENCES public.special_contributions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deduction_month integer NOT NULL CHECK (deduction_month BETWEEN 1 AND 11),
  deduction_year integer NOT NULL,
  amount numeric(10,2) NOT NULL,
  deduction_date timestamp with time zone DEFAULT now(),
  reference_number text,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Prevent duplicate deductions for same month/year
  CONSTRAINT unique_deduction_per_month UNIQUE (contribution_id, deduction_month, deduction_year)
);

-- Enable RLS
ALTER TABLE public.special_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_contribution_deductions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for special_contributions
CREATE POLICY "Users can view own contributions"
  ON public.special_contributions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contributions"
  ON public.special_contributions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft/pending contributions"
  ON public.special_contributions
  FOR UPDATE
  USING (auth.uid() = user_id AND application_status IN ('draft', 'pending'));

CREATE POLICY "Admins can view all contributions"
  ON public.special_contributions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all contributions"
  ON public.special_contributions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for special_contribution_deductions
CREATE POLICY "Users can view own deductions"
  ON public.special_contribution_deductions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deductions"
  ON public.special_contribution_deductions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage deductions"
  ON public.special_contribution_deductions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_special_contributions_updated_at
  BEFORE UPDATE ON public.special_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_contributions_user_year ON public.special_contributions(user_id, contribution_year);
CREATE INDEX idx_contributions_status ON public.special_contributions(application_status);
CREATE INDEX idx_contributions_maturity ON public.special_contributions(maturity_date);
CREATE INDEX idx_deductions_contribution ON public.special_contribution_deductions(contribution_id);
CREATE INDEX idx_deductions_date ON public.special_contribution_deductions(deduction_year, deduction_month);