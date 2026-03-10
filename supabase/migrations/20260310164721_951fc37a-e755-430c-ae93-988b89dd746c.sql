
-- Step 1: Add included_in_opening_balance column to transactions
ALTER TABLE public.transactions 
ADD COLUMN included_in_opening_balance boolean NOT NULL DEFAULT false;

-- Step 2: Mark all March 2025 deposit transactions as included in opening balance
UPDATE public.transactions 
SET included_in_opening_balance = true 
WHERE type = 'deposit' 
AND created_at >= '2025-03-01T00:00:00Z' 
AND created_at < '2025-04-01T00:00:00Z';

-- Step 3: Update the balance trigger to exclude flagged transactions
CREATE OR REPLACE FUNCTION public.update_account_balance_on_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id uuid;
  v_amount_change numeric := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Skip balance update for transactions already included in opening balance
    IF NEW.included_in_opening_balance = true THEN
      RETURN NEW;
    END IF;

    IF NEW.type IN ('deposit', 'loan_disbursement') THEN
      v_amount_change := NEW.amount;
    ELSIF NEW.type IN ('withdrawal', 'repayment') THEN
      v_amount_change := -NEW.amount;
    END IF;
    
    SELECT id INTO v_account_id
    FROM accounts
    WHERE user_id = NEW.user_id AND account_type = 'savings';
    
    IF v_account_id IS NULL THEN
      INSERT INTO accounts (user_id, account_type, balance, status)
      VALUES (NEW.user_id, 'savings', v_amount_change, 'active')
      RETURNING id INTO v_account_id;
    ELSE
      UPDATE accounts
      SET balance = balance + v_amount_change
      WHERE id = v_account_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Skip balance update for transactions already included in opening balance
    IF OLD.included_in_opening_balance = true THEN
      RETURN OLD;
    END IF;

    IF OLD.type IN ('deposit', 'loan_disbursement') THEN
      v_amount_change := -OLD.amount;
    ELSIF OLD.type IN ('withdrawal', 'repayment') THEN
      v_amount_change := OLD.amount;
    END IF;
    
    UPDATE accounts
    SET balance = balance + v_amount_change
    WHERE user_id = OLD.user_id AND account_type = 'savings';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Step 4: Update recalculate function to exclude flagged transactions
CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_user_id uuid, p_account_type account_type)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id uuid;
  v_total_balance numeric := 0;
BEGIN
  SELECT id INTO v_account_id
  FROM accounts
  WHERE user_id = p_user_id AND account_type = p_account_type;
  
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (user_id, account_type, balance, status)
    VALUES (p_user_id, p_account_type, 0, 'active')
    RETURNING id INTO v_account_id;
  END IF;
  
  SELECT COALESCE(
    SUM(CASE 
      WHEN type IN ('deposit', 'loan_disbursement') THEN amount
      WHEN type IN ('withdrawal', 'repayment') THEN -amount
      ELSE 0
    END), 0)
  INTO v_total_balance
  FROM transactions
  WHERE user_id = p_user_id
  AND included_in_opening_balance = false;
  
  UPDATE accounts
  SET balance = v_total_balance
  WHERE id = v_account_id;
END;
$function$;

-- Step 5: Recalculate all savings account balances to fix the double-counting
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM accounts WHERE account_type = 'savings'
  LOOP
    PERFORM recalculate_account_balance(r.user_id, 'savings');
  END LOOP;
END $$;
