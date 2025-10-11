-- Make profile-photos bucket private to prevent unauthorized access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'profile-photos';

-- The existing RLS policies on storage.objects already provide proper access control:
-- Users can only access their own photos via the folder structure
-- This change ensures photos are only accessible via signed URLs