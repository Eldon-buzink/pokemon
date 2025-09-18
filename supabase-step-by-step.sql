-- Step 1: Create ppt_cache table
CREATE TABLE IF NOT EXISTS ppt_cache (
  id bigserial PRIMARY KEY,
  set_id text NOT NULL,
  number text NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, number, kind)
);

-- Step 2: Create ppt_throttle table  
CREATE TABLE IF NOT EXISTS ppt_throttle (
  id bigserial PRIMARY KEY,
  set_id text NOT NULL,
  number text NOT NULL,
  last_attempt timestamptz,
  next_earliest timestamptz,
  last_status text,
  attempts int DEFAULT 0,
  UNIQUE (set_id, number)
);

-- Step 3: Enable RLS (run separately if needed)
ALTER TABLE ppt_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppt_throttle ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies (run separately if needed)
DROP POLICY IF EXISTS "read cache" ON ppt_cache;
CREATE POLICY "read cache" ON ppt_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "read throttle" ON ppt_throttle;  
CREATE POLICY "read throttle" ON ppt_throttle FOR SELECT USING (true);

-- Step 5: Verify
SELECT 'ppt_cache' as table_name, COUNT(*) as row_count FROM ppt_cache
UNION ALL
SELECT 'ppt_throttle' as table_name, COUNT(*) as row_count FROM ppt_throttle;
