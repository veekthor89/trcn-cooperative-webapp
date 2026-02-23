
-- Create deposit_requests table
CREATE TABLE public.deposit_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  deposit_type text NOT NULL,
  amount numeric NOT NULL,
  loan_id uuid REFERENCES public.loans(id),
  payment_type text, -- 'full' or 'partial' for loan repayments
  receipt_url text NOT NULL,
  reference_number text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

-- Users can create own deposit requests
CREATE POLICY "Users can create own deposit requests"
ON public.deposit_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view own deposit requests
CREATE POLICY "Users can view own deposit requests"
ON public.deposit_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all deposit requests
CREATE POLICY "Admins can view all deposit requests"
ON public.deposit_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update deposit requests
CREATE POLICY "Admins can manage deposit requests"
ON public.deposit_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- EXCO can view all deposit requests
CREATE POLICY "EXCO can view deposit requests"
ON public.deposit_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'president') OR
  public.has_role(auth.uid(), 'general_secretary') OR
  public.has_role(auth.uid(), 'financial_secretary') OR
  public.has_role(auth.uid(), 'assistant_financial_secretary') OR
  public.has_role(auth.uid(), 'treasurer') OR
  public.has_role(auth.uid(), 'assistant_treasurer')
);

-- Trigger for updated_at
CREATE TRIGGER update_deposit_requests_updated_at
BEFORE UPDATE ON public.deposit_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create deposit-receipts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-receipts', 'deposit-receipts', false);

-- Storage policies for deposit receipts
CREATE POLICY "Users can upload own receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deposit-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'deposit-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'deposit-receipts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "EXCO can view all receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposit-receipts' AND (
    public.has_role(auth.uid(), 'president') OR
    public.has_role(auth.uid(), 'financial_secretary') OR
    public.has_role(auth.uid(), 'treasurer')
  )
);
