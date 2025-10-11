-- Add new columns to profiles table for comprehensive member information
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS alternative_phone text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state_of_residence text,
ADD COLUMN IF NOT EXISTS designation text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS school_name text,
ADD COLUMN IF NOT EXISTS state_of_deployment text,
ADD COLUMN IF NOT EXISTS lga text,
ADD COLUMN IF NOT EXISTS staff_id text,
ADD COLUMN IF NOT EXISTS years_of_service integer,
ADD COLUMN IF NOT EXISTS next_of_kin_name text,
ADD COLUMN IF NOT EXISTS next_of_kin_relationship text,
ADD COLUMN IF NOT EXISTS next_of_kin_phone text,
ADD COLUMN IF NOT EXISTS next_of_kin_email text,
ADD COLUMN IF NOT EXISTS next_of_kin_address text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS account_name text,
ADD COLUMN IF NOT EXISTS bvn text,
ADD COLUMN IF NOT EXISTS profile_photo_url text,
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_notifications boolean DEFAULT true;

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for profile photos bucket
CREATE POLICY "Users can view all profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);