-- Fix card_assets table schema to support image validation and priority
-- Based on ChatGPT's recommendations

-- Add new columns to card_assets
ALTER TABLE card_assets
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS priority int2 DEFAULT 5,
  ADD COLUMN IF NOT EXISTS validated_same_set boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS kind text DEFAULT 'image';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_assets_card_priority ON card_assets(card_id, priority);
CREATE INDEX IF NOT EXISTS idx_card_assets_source ON card_assets(source);
CREATE INDEX IF NOT EXISTS idx_card_assets_validated ON card_assets(validated_same_set);

-- Add unique constraint to prevent duplicate sources per card
ALTER TABLE card_assets
  ADD CONSTRAINT uq_card_assets_card_source UNIQUE (card_id, source);

-- Backfill source column based on image URL patterns
UPDATE card_assets 
SET source = CASE
  WHEN image_url_small LIKE '%tcgdex.net%' THEN 'tcgdex'
  WHEN image_url_small LIKE '%pokemontcg.io%' THEN 'pokemontcgapi'
  WHEN image_url_small LIKE '%raw.githubusercontent.com%' THEN 'pokemon-tcg-data'
  WHEN image_url_small LIKE '%pokeapi.co%' THEN 'pokeapi-sprites'
  WHEN image_url_small LIKE '%tcgplayer%' THEN 'tcgplayer'
  ELSE 'unknown'
END
WHERE source IS NULL;

-- Set priority based on source quality
UPDATE card_assets 
SET priority = CASE
  WHEN source = 'tcgdex' THEN 1  -- Best for Japanese
  WHEN source = 'pokemon-tcg-data' THEN 2  -- Good for English
  WHEN source = 'pokemontcgapi' THEN 3  -- Sometimes wrong
  WHEN source = 'tcgplayer' THEN 4  -- Backup
  WHEN source = 'pokeapi-sprites' THEN 9  -- Placeholder sprites
  ELSE 5  -- Unknown
END
WHERE priority = 5;

-- Validate images that belong to the same set
UPDATE card_assets 
SET validated_same_set = TRUE
FROM cards c
WHERE card_assets.card_id = c.card_id
  AND (
    -- Direct set_id match (if we store set_id on assets)
    (card_assets.set_name IS NOT NULL AND card_assets.set_name = c.set_id)
    OR
    -- URL pattern validation
    (card_assets.image_url_small LIKE '%/' || c.set_id || '/%')
    OR
    (card_assets.image_url_small LIKE '%/' || c.set_id || '_%')
    OR
    -- Special cases for known mappings
    (card_assets.image_url_small LIKE '%/sv35/%' AND c.set_id IN ('sv35', 'sv35-jp'))
    OR
    (card_assets.image_url_small LIKE '%/sv12/%' AND c.set_id IN ('sv12', 'sv12-jp'))
  );

-- Set kind to 'image' for all existing records
UPDATE card_assets SET kind = 'image' WHERE kind IS NULL;
