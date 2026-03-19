
-- Step 1: Update special_contributions total_contributed with amounts from wrongly-routed transactions
UPDATE special_contributions sc
SET total_contributed = COALESCE(sc.total_contributed, 0) + sub.total_amount
FROM (
  SELECT t.user_id, SUM(t.amount) as total_amount
  FROM transactions t
  WHERE LOWER(t.description) LIKE '%special contribution%'
  GROUP BY t.user_id
) sub
WHERE sc.user_id = sub.user_id
AND sc.application_status IN ('active', 'approved');

-- Step 2: Create deduction records for audit trail
INSERT INTO special_contribution_deductions (contribution_id, user_id, amount, deduction_month, deduction_year, reference_number)
SELECT sc.id, t.user_id, t.amount, EXTRACT(MONTH FROM t.created_at)::int, EXTRACT(YEAR FROM t.created_at)::int, t.reference_number
FROM transactions t
JOIN special_contributions sc ON sc.user_id = t.user_id AND sc.application_status IN ('active', 'approved')
WHERE LOWER(t.description) LIKE '%special contribution%';

-- Step 3: Delete wrongly-routed transactions (the DELETE trigger will automatically reverse the savings balance)
DELETE FROM transactions WHERE LOWER(description) LIKE '%special contribution%';
