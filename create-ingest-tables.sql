-- PPT Cache table for rate limiting and performance
CREATE TABLE IF NOT EXISTS ppt_cache (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_seconds INTEGER NOT NULL DEFAULT 86400
);

-- Ingest state tracking
CREATE TABLE IF NOT EXISTS ingest_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_set_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manual overrides table for fixing data issues
CREATE TABLE IF NOT EXISTS manual_overrides (
  card_id TEXT PRIMARY KEY,
  field_name TEXT NOT NULL,
  field_value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'admin'
);

-- Image mirror table for CDN caching
CREATE TABLE IF NOT EXISTS image_mirror (
  card_id TEXT PRIMARY KEY,
  original_url TEXT NOT NULL,
  cdn_url TEXT NOT NULL,
  sha1 TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ppt_cache_fetched_at ON ppt_cache(fetched_at);
CREATE INDEX IF NOT EXISTS idx_manual_overrides_field ON manual_overrides(field_name);
CREATE INDEX IF NOT EXISTS idx_image_mirror_status ON image_mirror(status);

-- Insert initial state
INSERT INTO ingest_state (id, last_set_id, updated_at) 
VALUES (1, NULL, NOW())
ON CONFLICT (id) DO NOTHING;
