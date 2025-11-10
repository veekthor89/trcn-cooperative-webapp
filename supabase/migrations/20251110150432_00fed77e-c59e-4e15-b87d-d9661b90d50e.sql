-- Add cooperative_id field to profiles table
ALTER TABLE public.profiles
ADD COLUMN cooperative_id text;

COMMENT ON COLUMN public.profiles.cooperative_id IS 'User cooperative identification number';