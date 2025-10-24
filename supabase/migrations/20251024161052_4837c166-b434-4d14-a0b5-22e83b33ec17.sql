-- Make profile-photos bucket public so profile images can be displayed
UPDATE storage.buckets
SET public = true
WHERE id = 'profile-photos';