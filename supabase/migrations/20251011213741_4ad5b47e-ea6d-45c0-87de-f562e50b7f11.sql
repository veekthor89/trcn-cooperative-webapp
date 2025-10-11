-- Remove school_name and lga columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS school_name,
DROP COLUMN IF EXISTS lga;