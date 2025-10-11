-- Function to recalculate account balance from transactions
CREATE OR REPLACE FUNCTION recalculate_account_balance(p_user_id uuid, p_account_type account_type)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id uuid;
  v_total_balance numeric := 0;
BEGIN
  -- Get or create the account
  SELECT id INTO v_account_id
  FROM accounts
  WHERE user_id = p_user_id AND account_type = p_account_type;
  
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (user_id, account_type, balance, status)
    VALUES (p_user_id, p_account_type, 0, 'active')
    RETURNING id INTO v_account_id;
  END IF;
  
  -- Calculate total from transactions
  SELECT COALESCE(
    SUM(CASE 
      WHEN type IN ('deposit', 'loan_disbursement') THEN amount
      WHEN type IN ('withdrawal', 'repayment') THEN -amount
      ELSE 0
    END), 0)
  INTO v_total_balance
  FROM transactions
  WHERE user_id = p_user_id;
  
  -- Update account balance
  UPDATE accounts
  SET balance = v_total_balance
  WHERE id = v_account_id;
END;
$$;

-- Function to update account balance on transaction insert/update/delete
CREATE OR REPLACE FUNCTION update_account_balance_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id uuid;
  v_amount_change numeric := 0;
BEGIN
  -- Determine amount change based on operation and transaction type
  IF TG_OP = 'INSERT' THEN
    IF NEW.type IN ('deposit', 'loan_disbursement') THEN
      v_amount_change := NEW.amount;
    ELSIF NEW.type IN ('withdrawal', 'repayment') THEN
      v_amount_change := -NEW.amount;
    END IF;
    
    -- Get or create savings account
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
$$;

-- Create trigger for automatic balance updates
DROP TRIGGER IF EXISTS transaction_balance_update ON transactions;
CREATE TRIGGER transaction_balance_update
  AFTER INSERT OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_transaction();

-- Recalculate balances for all existing users with transactions
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id FROM transactions
  LOOP
    PERFORM recalculate_account_balance(user_record.user_id, 'savings');
  END LOOP;
END $$;