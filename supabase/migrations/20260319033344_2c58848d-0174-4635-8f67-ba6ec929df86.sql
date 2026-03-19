
-- Re-insert special contribution transactions for dashboard visibility
-- Using included_in_opening_balance = true so savings trigger is skipped
INSERT INTO transactions (user_id, type, amount, description, reference_number, included_in_opening_balance)
SELECT 
  scd.user_id,
  'deposit',
  scd.amount,
  'Special Contribution - ' || scd.deduction_month || '/' || scd.deduction_year,
  scd.reference_number,
  true  -- prevents savings balance trigger
FROM special_contribution_deductions scd
WHERE scd.reference_number LIKE 'TXN-%';
