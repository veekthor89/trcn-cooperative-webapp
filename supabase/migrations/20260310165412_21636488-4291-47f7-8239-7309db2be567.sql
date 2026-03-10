
-- Step 1: Flag March 2026 deposit transactions (the actual date, not 2025)
UPDATE public.transactions 
SET included_in_opening_balance = true 
WHERE type = 'deposit' 
AND created_at >= '2026-03-01T00:00:00Z' 
AND created_at < '2026-04-01T00:00:00Z'
AND description ILIKE '%March%';
