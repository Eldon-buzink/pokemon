-- Drop existing views first
DROP VIEW IF EXISTS v_cards_latest;
DROP VIEW IF EXISTS v_psa_medians;
DROP VIEW IF EXISTS v_last_raw;
DROP VIEW IF EXISTS v_last_psa10;
DROP VIEW IF EXISTS v_daily_medians;

-- Last sold RAW & PSA10 from graded_sales
CREATE OR REPLACE VIEW v_last_raw AS
SELECT DISTINCT ON (card_id)
  card_id, sold_date, (price*100)::int as last_raw_cents
FROM graded_sales
WHERE (grade IS NULL OR grade=0)
ORDER BY card_id, sold_date DESC;

CREATE OR REPLACE VIEW v_last_psa10 AS
SELECT DISTINCT ON (card_id)
  card_id, sold_date, (price*100)::int as last_psa10_cents
FROM graded_sales
WHERE grade = 10
ORDER BY card_id, sold_date DESC;

-- 30d / 90d medians + counts for RAW and PSA10
CREATE OR REPLACE VIEW v_psa_medians AS
SELECT
  gs.card_id,

  -- RAW medians & sample sizes
  percentile_cont(0.5) WITHIN GROUP (ORDER BY price) 
    FILTER (WHERE (grade IS NULL OR grade=0) AND sold_date >= current_date - 30) as raw_median_30d,
  count(*) FILTER (WHERE (grade IS NULL OR grade=0) AND sold_date >= current_date - 30) as raw_n_30d,

  percentile_cont(0.5) WITHIN GROUP (ORDER BY price) 
    FILTER (WHERE (grade IS NULL OR grade=0) AND sold_date >= current_date - 90) as raw_median_90d,
  count(*) FILTER (WHERE (grade IS NULL OR grade=0) AND sold_date >= current_date - 90) as raw_n_90d,

  -- PSA10 medians & sample sizes
  percentile_cont(0.5) WITHIN GROUP (ORDER BY price) 
    FILTER (WHERE grade = 10 AND sold_date >= current_date - 30) as psa10_median_30d,
  count(*) FILTER (WHERE grade = 10 AND sold_date >= current_date - 30) as psa10_n_30d,

  percentile_cont(0.5) WITHIN GROUP (ORDER BY price) 
    FILTER (WHERE grade = 10 AND sold_date >= current_date - 90) as psa10_median_90d,
  count(*) FILTER (WHERE grade = 10 AND sold_date >= current_date - 90) as psa10_n_90d

FROM graded_sales gs
GROUP BY gs.card_id;

-- Per-day medians for trendlines (RAW & PSA10)
CREATE OR REPLACE VIEW v_daily_medians AS
SELECT
  gs.card_id,
  sold_date as date,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY price)
    FILTER (WHERE (grade IS NULL OR grade=0)) as raw_median,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY price)
    FILTER (WHERE grade=10) as psa10_median,
  count(*) FILTER (WHERE (grade IS NULL OR grade=0)) as raw_n,
  count(*) FILTER (WHERE grade=10) as psa10_n
FROM graded_sales gs
GROUP BY gs.card_id, gs.sold_date;

-- Enhanced v_cards_latest with eBay data
CREATE OR REPLACE VIEW v_cards_latest AS
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
  
  -- PPT summary (if you upsert it into prices with source='ppt')
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
LEFT JOIN v_latest_prices tp ON tp.card_id=c.card_id AND tp.source='tcgplayer'
LEFT JOIN v_latest_prices cm ON cm.card_id=c.card_id AND cm.source='cardmarket'
LEFT JOIN v_latest_prices ppt ON ppt.card_id=c.card_id AND ppt.source='ppt'
LEFT JOIN v_last_raw lr ON lr.card_id=c.card_id
LEFT JOIN v_last_psa10 lp ON lp.card_id=c.card_id
LEFT JOIN v_psa_medians vpm ON vpm.card_id=c.card_id;
