-- Fix search_path for share subscription functions - properly drop and recreate
DROP TRIGGER IF EXISTS set_application_number_trigger ON public.share_subscriptions;
DROP FUNCTION IF EXISTS set_share_application_number();
DROP FUNCTION IF EXISTS generate_share_application_number();

-- Recreate with proper search_path
CREATE OR REPLACE FUNCTION generate_share_application_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION set_share_application_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.application_number IS NULL OR NEW.application_number = '' THEN
    NEW.application_number := generate_share_application_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER set_application_number_trigger
BEFORE INSERT ON public.share_subscriptions
FOR EACH ROW
EXECUTE FUNCTION set_share_application_number();