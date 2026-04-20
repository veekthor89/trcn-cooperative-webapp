-- Lock down realtime.messages (used by Broadcast/Presence channels).
-- The app currently relies only on postgres_changes (already protected by RLS on
-- the underlying tables: notifications, loan_guarantor_approvals, etc.), so we
-- explicitly deny any direct Broadcast/Presence subscriptions to prevent
-- unauthorized topic snooping.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all realtime broadcast access" ON realtime.messages;
DROP POLICY IF EXISTS "Deny realtime broadcast reads" ON realtime.messages;
DROP POLICY IF EXISTS "Deny realtime broadcast writes" ON realtime.messages;

-- No policies = deny all. Postgres_changes are unaffected because they are
-- governed by RLS on the source tables in the public schema.
CREATE POLICY "Deny realtime broadcast reads"
ON realtime.messages
FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "Deny realtime broadcast writes"
ON realtime.messages
FOR INSERT
TO authenticated, anon
WITH CHECK (false);