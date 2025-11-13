-- Make purpose_category and purpose_description nullable since we're removing them from the form
ALTER TABLE public.special_contributions 
ALTER COLUMN purpose_category DROP NOT NULL,
ALTER COLUMN purpose_category DROP DEFAULT;