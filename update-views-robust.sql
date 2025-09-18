-- Enhanced database views with robust eBay integration
-- Run this in Supabase SQL Editor

-- last PSA10 sale
DROP VIEW IF EXISTS v_last_psa10;
CREATE OR REPLACE VIEW v_last_psa10 AS
SELECT DISTINCT ON (card_id)
  card_id, sold_date, (price*100)::int as last_psa10_cents
FROM graded_sales
WHERE grade = 10
ORDER BY card_id, sold_date DESC;

-- last RAW sale
DROP VIEW IF EXISTS v_last_raw;
CREATE OR REPLACE VIEW v_last_raw AS
SELECT DISTINCT ON (card_id)
  card_id, sold_date, (price*100)::int as last_raw_cents
FROM graded_sales
WHERE (grade IS NULL OR grade=0)
ORDER BY card_id, sold_date DESC;

-- 30/90-day medians + sample sizes
DROP VIEW IF EXISTS v_psa_medians;
CREATE OR REPLACE VIEW v_psa_medians AS
SELECT
  gs.card_id,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY price) 
    FILTER (WHERE grade=0 AND sold_date >= current_date - 30) as raw_median_30d,
  count(*) FILTER (WHERE grade=0 AND sold_date >= current_date - 30) as raw_n_30d,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY price) 
    FILTER (WHERE grade=0 AND sold_date >= current_date - 90) as raw_median_90d,
  count(*) FILTER (WHERE grade=0 AND sold_date >= current_date - 90) as raw_n_90d,

  percentile_cont(0.5) WITHIN GROUP (ORDER BY price) 
    FILTER (WHERE grade=10 AND sold_date >= current_date - 30) as psa10_median_30d,
  count(*) FILTER (WHERE grade=10 AND sold_date >= current_date - 30) as psa10_n_30d,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY price) 
    FILTER (WHERE grade=10 AND sold_date >= current_date - 90) as psa10_median_90d,
  count(*) FILTER (WHERE grade=10 AND sold_date >= current_date - 90) as psa10_n_90d
FROM graded_sales gs
GROUP BY gs.card_id;

-- Enhanced v_cards_latest with full eBay integration
DROP VIEW IF EXISTS v_cards_latest;
CREATE OR REPLACE VIEW v_cards_latest AS
WITH latest AS (
  SELECT DISTINCT ON (card_id, source)
    card_id, source, raw_cents, psa10_cents, currency, ts
  FROM prices
  ORDER BY card_id, source, ts DESC
)
SELECT
  c.card_id,
  c.set_id,
  c.number,
  c.name,
  c.rarity,
  ca.image_url_small,
  ca.image_url_large,
  ca.set_name,

  -- TCG / Cardmarket (from PokémonTCG.io)
  tp.raw_cents as tcg_raw_cents,
  tp.currency as tcg_currency,
  cm.raw_cents as cm_raw_cents,
  cm.currency as cm_currency,

  -- PPT summary (from prices table)
  ppt.raw_cents as ppt_raw_cents,
  ppt.psa10_cents as ppt_psa10_cents,

  -- eBay last-sold (from graded_sales)
  lr.last_raw_cents as ppt_raw_ebay_cents,
  lp.last_psa10_cents as ppt_psa10_ebay_cents,

  -- Rolling medians (from graded_sales)
  (vpm.raw_median_30d * 100)::int as raw_median_30d_cents,
  vpm.raw_n_30d,
  (vpm.raw_median_90d * 100)::int as raw_median_90d_cents,
  vpm.raw_n_90d,

  (vpm.psa10_median_30d * 100)::int as psa10_median_30d_cents,
  vpm.psa10_n_30d,
  (vpm.psa10_median_90d * 100)::int as psa10_median_90d_cents,
  vpm.psa10_n_90d

FROM cards c
LEFT JOIN card_assets ca ON ca.card_id = c.card_id
LEFT JOIN latest tp ON tp.card_id=c.card_id AND tp.source='tcgplayer'
LEFT JOIN latest cm ON cm.card_id=c.card_id AND cm.source='cardmarket'
LEFT JOIN latest ppt ON ppt.card_id=c.card_id AND ppt.source='ppt'
LEFT JOIN v_last_raw lr ON lr.card_id=c.card_id
LEFT JOIN v_last_psa10 lp ON lp.card_id=c.card_id
LEFT JOIN v_psa_medians vpm ON vpm.card_id=c.card_id;
