-- Add new columns to price_history table for eBay integration
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS psa9_usd NUMERIC;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS raw_count INTEGER;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS psa10_count INTEGER;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS psa9_count INTEGER;
