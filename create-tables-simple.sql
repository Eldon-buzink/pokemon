-- Simple SQL script to create history tables
-- Run this in your Supabase SQL Editor

-- Create price history table
CREATE TABLE IF NOT EXISTS price_history (
  set_id text NOT NULL,
  number text NOT NULL,
  date date NOT NULL,
  raw_usd numeric,
  psa10_usd numeric,
  PRIMARY KEY (set_id, number, date)
);

-- Create population history table
CREATE TABLE IF NOT EXISTS pop_history (
  set_id text NOT NULL,
  number text NOT NULL,
  date date NOT NULL,
  psa10 int,
  psa9 int,
  psa8 int,
  total int,
  PRIMARY KEY (set_id, number, date)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_price_history_set_date ON price_history(set_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_pop_history_set_date ON pop_history(set_id, date DESC);

-- Add comments for documentation
COMMENT ON TABLE price_history IS 'Historical price data for cards across different conditions';
COMMENT ON TABLE pop_history IS 'Historical PSA population data for graded cards';

COMMENT ON COLUMN price_history.raw_usd IS 'Raw/ungraded card price in USD';
COMMENT ON COLUMN price_history.psa10_usd IS 'PSA 10 graded card price in USD';

COMMENT ON COLUMN pop_history.psa10 IS 'Number of PSA 10 graded cards';
COMMENT ON COLUMN pop_history.psa9 IS 'Number of PSA 9 graded cards';
COMMENT ON COLUMN pop_history.psa8 IS 'Number of PSA 8 graded cards';
COMMENT ON COLUMN pop_history.total IS 'Total number of graded cards';
