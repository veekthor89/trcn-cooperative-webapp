-- Restrict profile photo reads to authenticated users only.
-- The bucket is private; the app generates signed URLs via the authenticated client.
-- This blocks unauthenticated enumeration while preserving owner and admin/EXCO access flows.

DROP POLICY IF EXISTS "Users can view all profile photos" ON storage.objects;

CREATE POLICY "Authenticated users can view profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');