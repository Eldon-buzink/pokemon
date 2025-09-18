-- PPT Cache and Throttle Tables
-- Copy and paste this entire block into your Supabase SQL Editor and run it

-- Cache a successful PPT payload per (set_id, number, kind) for 24h
CREATE TABLE IF NOT EXISTS ppt_cache (
  id bigserial PRIMARY KEY,
  set_id text NOT NULL,
  number text NOT NULL,
  kind text NOT NULL, -- 'sales' | 'summary'
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, number, kind)
);

-- Throttle ledger: when we last tried and when we may try next
CREATE TABLE IF NOT EXISTS ppt_throttle (
  id bigserial PRIMARY KEY,
  set_id text NOT NULL,
  number text NOT NULL,
  last_attempt timestamptz,
  next_earliest timestamptz,
  last_status text,   -- 'ok' | '429' | 'err'
  attempts int DEFAULT 0,
  UNIQUE (set_id, number)
);

-- Enable Row Level Security
ALTER TABLE ppt_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppt_throttle ENABLE ROW LEVEL SECURITY;

-- Create read policies (allow public read access)
CREATE POLICY IF NOT EXISTS "read cache" ON ppt_cache FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "read throttle" ON ppt_throttle FOR SELECT USING (true);

-- Verify tables were created
SELECT 'ppt_cache' as table_name, COUNT(*) as row_count FROM ppt_cache
UNION ALL
SELECT 'ppt_throttle' as table_name, COUNT(*) as row_count FROM ppt_throttle;
