-- Update price per share default from 1000 to 25
ALTER TABLE public.share_subscriptions
ALTER COLUMN price_per_share SET DEFAULT 25;

COMMENT ON COLUMN public.share_subscriptions.price_per_share IS 'Price per share in the cooperative (default: 25)';