
-- Fix recalculate to include ALL transactions (flagged ones are part of the historical balance)
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
  
  -- Include ALL transactions (flagged ones represent opening balance history)
  SELECT COALESCE(
    SUM(CASE 
      WHEN type IN ('deposit', 'loan_disbursement') THEN amount
      WHEN type IN ('withdrawal', 'repayment') THEN -amount
      ELSE 0
    END), 0)
  INTO v_total_balance
  FROM transactions
  WHERE user_id = p_user_id;
  
  UPDATE accounts
  SET balance = v_total_balance
  WHERE id = v_account_id;
END;
$function$;
