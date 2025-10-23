-- Create enums for share subscription system
CREATE TYPE payment_method AS ENUM ('cash_deposit', 'bank_transfer', 'salary_deduction');
CREATE TYPE subscription_status AS ENUM ('draft', 'pending', 'payment_verified', 'approved', 'rejected', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'failed');
CREATE TYPE share_transaction_type AS ENUM ('purchase', 'dividend', 'transfer', 'sale');

-- Create shares table to track member share ownership
CREATE TABLE public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_shares INTEGER NOT NULL DEFAULT 0,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_dividend_amount NUMERIC(12,2),
  last_dividend_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create share_subscriptions table for applications
CREATE TABLE public.share_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_number TEXT NOT NULL UNIQUE,
  shares_requested INTEGER NOT NULL,
  price_per_share NUMERIC(12,2) NOT NULL DEFAULT 1000,
  total_cost NUMERIC(12,2) NOT NULL,
  current_shares_before INTEGER NOT NULL DEFAULT 0,
  shares_after INTEGER NOT NULL,
  payment_method payment_method NOT NULL,
  payment_reference TEXT,
  payment_proof_url TEXT,
  deduction_months INTEGER,
  monthly_deduction_amount NUMERIC(12,2),
  status subscription_status NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES auth.users(id),
  approved_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  declaration_1 BOOLEAN NOT NULL DEFAULT false,
  declaration_2 BOOLEAN NOT NULL DEFAULT false,
  declaration_3 BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create share_subscription_payments table
CREATE TABLE public.share_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.share_subscriptions(id) ON DELETE CASCADE,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  amount NUMERIC(12,2) NOT NULL,
  payment_type TEXT NOT NULL,
  reference_number TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  verified_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create share_transactions table
CREATE TABLE public.share_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.share_subscriptions(id),
  transaction_type share_transaction_type NOT NULL,
  shares_quantity INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reference_number TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shares
CREATE POLICY "Users can view own shares"
  ON public.shares FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all shares"
  ON public.shares FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage shares"
  ON public.shares FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for share_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.share_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON public.share_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft subscriptions"
  ON public.share_subscriptions FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admins can view all subscriptions"
  ON public.share_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions"
  ON public.share_subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for share_subscription_payments
CREATE POLICY "Users can view own payments"
  ON public.share_subscription_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.share_subscriptions
    WHERE share_subscriptions.id = subscription_id
    AND share_subscriptions.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all payments"
  ON public.share_subscription_payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage payments"
  ON public.share_subscription_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for share_transactions
CREATE POLICY "Users can view own transactions"
  ON public.share_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.share_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage transactions"
  ON public.share_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create function to generate application number
CREATE OR REPLACE FUNCTION generate_share_application_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  sequence_part TEXT;
  next_number INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_number FROM 'SHARE-[0-9]{4}-([0-9]{4})') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.share_subscriptions
  WHERE application_number LIKE 'SHARE-' || year_part || '-%';
  
  sequence_part := LPAD(next_number::TEXT, 4, '0');
  
  RETURN 'SHARE-' || year_part || '-' || sequence_part;
END;
$$;

-- Create trigger to auto-generate application number
CREATE OR REPLACE FUNCTION set_share_application_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.application_number IS NULL OR NEW.application_number = '' THEN
    NEW.application_number := generate_share_application_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_application_number_trigger
BEFORE INSERT ON public.share_subscriptions
FOR EACH ROW
EXECUTE FUNCTION set_share_application_number();

-- Create trigger for updated_at on shares
CREATE TRIGGER update_shares_updated_at
BEFORE UPDATE ON public.shares
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updated_at on share_subscriptions
CREATE TRIGGER update_share_subscriptions_updated_at
BEFORE UPDATE ON public.share_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_shares_user_id ON public.shares(user_id);
CREATE INDEX idx_share_subscriptions_user_id ON public.share_subscriptions(user_id);
CREATE INDEX idx_share_subscriptions_status ON public.share_subscriptions(status);
CREATE INDEX idx_share_subscriptions_application_number ON public.share_subscriptions(application_number);
CREATE INDEX idx_share_subscription_payments_subscription_id ON public.share_subscription_payments(subscription_id);
CREATE INDEX idx_share_transactions_user_id ON public.share_transactions(user_id);