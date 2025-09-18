-- Pokemon Card Movers Database Setup
-- Run this in your Supabase SQL Editor

-- 1. Main schema (from schema.sql)
-- Canonical catalog (dynamic id & join key)
create table if not exists cards (
  card_id text primary key,
  set_id text not null,
  number text not null,
  name text not null,
  rarity text,
  lang text default 'EN',
  edition text default 'Unlimited'
);

-- Static, slow‑changing display fields & images (seeded once)
create table if not exists card_assets (
  card_id text primary key references cards(card_id) on delete cascade,
  tcgio_id text unique,
  set_name text not null,
  release_date date,
  rarity text,
  image_url_small text,
  image_url_large text,
  last_catalog_sync timestamptz default now()
);

-- Raw price snapshots (per day per source)
create table if not exists raw_prices (
  id bigserial primary key,
  card_id text references cards(card_id),
  source text not null, -- 'ppt','mkm','tcg'
  snapshot_date date not null,
  median_price numeric not null,
  n_sales int default 0
);
create index on raw_prices(card_id, snapshot_date);

-- Graded solds (granular), used to compute daily medians
create table if not exists graded_sales (
  id bigserial primary key,
  card_id text references cards(card_id),
  grade int not null, -- 8..10 etc
  sold_date date not null,
  price numeric not null,
  source text not null, -- 'ppt','ebay'
  listing_id text
);
create index on graded_sales(card_id, grade, sold_date);

-- PSA population snapshots
create table if not exists psa_pop (
  id bigserial primary key,
  card_id text references cards(card_id),
  grade int not null,
  snapshot_date date not null,
  pop_count int not null
);
create index on psa_pop(card_id, grade, snapshot_date);

-- Daily facts (computed)
create table if not exists facts_daily (
  id bigserial primary key,
  card_id text references cards(card_id),
  date date not null,
  raw_median numeric,
  raw_n int,
  psa9_median numeric,
  psa9_n int,
  psa10_median numeric,
  psa10_n int,
  pop9 int,
  pop10 int
);
create unique index on facts_daily(card_id, date);

-- 5‑day aggregates
create table if not exists facts_5d (
  card_id text references cards(card_id) primary key,
  asof date not null,
  raw_delta_5d numeric,
  psa9_delta_5d numeric,
  psa10_delta_5d numeric,
  volume_score numeric,
  pop10_delta_5d int,
  spread_after_fees numeric,
  psa10_prob_lifetime numeric,
  psa10_prob_rolling numeric,
  psa10_prob_adj numeric,
  confidence text, -- High|Speculative|Noisy
  profit_loss_rank int
);
create index on facts_5d(profit_loss_rank, asof);
create index on facts_5d(spread_after_fees, asof);

-- 2. Schema updates (from schema-updates.sql)
-- Email subscriptions table for weekly market updates
create table if not exists email_subscriptions (
  id bigserial primary key,
  email text not null unique,
  filters jsonb not null default '{}', -- Store user's filter preferences
  is_active boolean default true,
  created_at timestamptz default now(),
  last_sent timestamptz,
  unsubscribe_token text unique not null default gen_random_uuid()::text
);

-- Historical aggregates table for longer time periods (7, 30, 90 days)
create table if not exists facts_historical (
  id bigserial primary key,
  card_id text references cards(card_id),
  asof date not null,
  period_days int not null, -- 7, 30, 90
  raw_delta numeric,
  psa9_delta numeric,
  psa10_delta numeric,
  volume_score numeric,
  pop10_delta int,
  spread_after_fees numeric,
  psa10_prob_lifetime numeric,
  psa10_prob_rolling numeric,
  psa10_prob_adj numeric,
  confidence text,
  profit_loss_rank int, -- Rank by profit/loss for sorting
  unique(card_id, asof, period_days)
);

-- Indexes for better performance
create index on facts_historical(card_id, period_days, asof);
create index on facts_historical(profit_loss_rank, period_days, asof);
create index on facts_historical(spread_after_fees, period_days, asof);

-- Weekly market update logs
create table if not exists market_update_logs (
  id bigserial primary key,
  sent_date date not null,
  total_subscribers int not null,
  successful_sends int not null,
  failed_sends int not null,
  top_movers jsonb not null, -- Store the top 5 movers data
  created_at timestamptz default now()
);

-- 3. Enable Row Level Security (RLS)
alter table cards enable row level security;
alter table card_assets enable row level security;
alter table raw_prices enable row level security;
alter table graded_sales enable row level security;
alter table psa_pop enable row level security;
alter table facts_daily enable row level security;
alter table facts_5d enable row level security;
alter table facts_historical enable row level security;
alter table email_subscriptions enable row level security;
alter table market_update_logs enable row level security;

-- 4. Create policies (allow public read access for now)
create policy "Allow public read access" on cards for select using (true);
create policy "Allow public read access" on card_assets for select using (true);
create policy "Allow public read access" on raw_prices for select using (true);
create policy "Allow public read access" on graded_sales for select using (true);
create policy "Allow public read access" on psa_pop for select using (true);
create policy "Allow public read access" on facts_daily for select using (true);
create policy "Allow public read access" on facts_5d for select using (true);
create policy "Allow public read access" on facts_historical for select using (true);

-- Allow email subscriptions
create policy "Allow email subscriptions" on email_subscriptions for all using (true);

-- 5. Create a function to test the setup
create or replace function test_setup()
returns text as $$
begin
  return 'Pokemon Card Movers database setup completed successfully!';
end;
$$ language plpgsql;

-- Test the setup
select test_setup();

-- ============================================================================
-- GRADED SALES TABLE (eBay Integration)
-- ============================================================================
create table if not exists graded_sales (
  id uuid primary key default uuid_generate_v4(),
  card_id text not null references cards(card_id),
  grade int not null, -- 0 for ungraded, 1-10 for graded
  sold_date date not null,
  price numeric(10,2) not null, -- stored as USD
  source text not null, -- e.g., 'ppt-ebay'
  listing_id text,
  created_at timestamptz default now()
);

create index if not exists graded_sales_card_id_idx on graded_sales(card_id);
create index if not exists graded_sales_sold_date_idx on graded_sales(sold_date);
create index if not exists graded_sales_grade_idx on graded_sales(grade);

-- ============================================================================
-- FACTS DAILY TABLE (for aggregated daily facts)
-- ============================================================================
create table if not exists facts_daily (
  card_id text not null references cards(card_id),
  date date not null,
  raw_median numeric(10,2),
  raw_n int,
  psa10_median numeric(10,2),
  psa10_n int,
  primary key (card_id, date)
);

create index if not exists facts_daily_date_idx on facts_daily(date);

-- ============================================================================
-- LATEST PRICE VIEWS (ChatGPT Improvement #1)
-- ============================================================================

-- Latest price per card per source
create or replace view v_latest_prices as
select distinct on (card_id, source)
  card_id, source, raw_cents, psa10_cents, currency, ts, notes
from prices
order by card_id, source, ts desc;

-- Last sold RAW & PSA10 from graded_sales
create or replace view v_last_raw as
select distinct on (card_id)
  card_id, sold_date, (price*100)::int as last_raw_cents
from graded_sales
where (grade is null or grade=0)
order by card_id, sold_date desc;

create or replace view v_last_psa10 as
select distinct on (card_id)
  card_id, sold_date, (price*100)::int as last_psa10_cents
from graded_sales
where grade = 10
order by card_id, sold_date desc;

-- 30d / 90d medians + counts for RAW and PSA10
create or replace view v_psa_medians as
select
  gs.card_id,

  -- RAW medians & sample sizes
  percentile_cont(0.5) within group (order by price) 
    filter (where (grade is null or grade=0) and sold_date >= current_date - 30) as raw_median_30d,
  count(*) filter (where (grade is null or grade=0) and sold_date >= current_date - 30) as raw_n_30d,

  percentile_cont(0.5) within group (order by price) 
    filter (where (grade is null or grade=0) and sold_date >= current_date - 90) as raw_median_90d,
  count(*) filter (where (grade is null or grade=0) and sold_date >= current_date - 90) as raw_n_90d,

  -- PSA10 medians & sample sizes
  percentile_cont(0.5) within group (order by price) 
    filter (where grade = 10 and sold_date >= current_date - 30) as psa10_median_30d,
  count(*) filter (where grade = 10 and sold_date >= current_date - 30) as psa10_n_30d,

  percentile_cont(0.5) within group (order by price) 
    filter (where grade = 10 and sold_date >= current_date - 90) as psa10_median_90d,
  count(*) filter (where grade = 10 and sold_date >= current_date - 90) as psa10_n_90d

from graded_sales gs
group by gs.card_id;

-- Per-day medians for trendlines (RAW & PSA10)
create or replace view v_daily_medians as
select
  gs.card_id,
  sold_date as date,
  percentile_cont(0.5) within group (order by price)
    filter (where (grade is null or grade=0)) as raw_median,
  percentile_cont(0.5) within group (order by price)
    filter (where grade=10) as psa10_median,
  count(*) filter (where (grade is null or grade=0)) as raw_n,
  count(*) filter (where grade=10) as psa10_n
from graded_sales gs
group by gs.card_id, gs.sold_date;

-- Enhanced v_cards_latest with eBay data
create or replace view v_cards_latest as
select
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

from cards c
left join card_assets ca on ca.card_id = c.card_id
left join v_latest_prices tp on tp.card_id=c.card_id and tp.source='tcgplayer'
left join v_latest_prices cm on cm.card_id=c.card_id and cm.source='cardmarket'
left join v_latest_prices ppt on ppt.card_id=c.card_id and ppt.source='ppt'
left join v_last_raw lr on lr.card_id=c.card_id
left join v_last_psa10 lp on lp.card_id=c.card_id
left join v_psa_medians vpm on vpm.card_id=c.card_id;

create index if not exists v_cards_latest_set_id_idx on cards(set_id);

-- ============================================================================
-- SOURCE SET MAPPING TABLE (ChatGPT Durable Fix)
-- ============================================================================

-- Flexible mapping between internal set IDs and external source set IDs
create table if not exists public.source_set_map (
  id bigserial primary key,
  internal_set_id text not null,           -- your cards.set_id (e.g., 68af…)
  source text not null,                    -- 'ptgio' | 'ppt' etc.
  external_set_id text not null,           -- e.g., 'cel25' or 'cel25c'
  number_min int null,                     -- optional: only apply for this range
  number_max int null,
  created_at timestamptz default now()
);

create index if not exists ssm_internal_idx on public.source_set_map(internal_set_id);
create index if not exists ssm_source_idx on public.source_set_map(source);

-- Seed Celebrations mapping
insert into public.source_set_map (internal_set_id, source, external_set_id, number_min, number_max)
values
  -- PTCG.io mappings
  ('68af37225bce97006df9f260','ptgio','cel25',   1,  100),
  ('68af37225bce97006df9f260','ptgio','cel25c', 101,  999),
  ('cel25','ptgio','cel25',   null,  null),  -- Direct mapping for legacy
  ('cel25c','ptgio','cel25c', null,  null),   -- Direct mapping for legacy
  -- PPT mappings (based on debug results - only Classic Collection available)
  ('cel25c','ppt','celebrations-classic-collection', null,  null)  -- Classic Collection only
on conflict do nothing;

-- ============================================================================
-- DATA INTEGRITY FUNCTIONS (ChatGPT Improvement #7)
-- ============================================================================

-- Upsert price only if newer than existing
create or replace function upsert_price_if_newer(
  p_card_id text, p_source text, p_raw_cents int, p_psa10_cents int,
  p_currency text, p_ts timestamptz, p_notes text)
returns void language plpgsql as $$
begin
  insert into prices(card_id, source, raw_cents, psa10_cents, currency, ts, notes)
  values (p_card_id, p_source, p_raw_cents, p_psa10_cents, p_currency, p_ts, p_notes)
  on conflict (card_id, source, ts) do nothing;
end $$;

-- Recompute facts_daily for a given day from graded_sales (and write raw median from grade=0)
create or replace function refresh_daily_facts(p_day date)
returns void language plpgsql as $$
begin
  -- raw (ungraded) median + count
  insert into facts_daily(card_id, date, raw_median, raw_n)
  select card_id, p_day,
         percentile_cont(0.5) within group (order by price) as raw_median,
         count(*)::int
  from graded_sales
  where (grade is null or grade=0) and sold_date = p_day
  group by card_id
  on conflict (card_id, date) do update
  set raw_median = excluded.raw_median, raw_n = excluded.raw_n;

  -- PSA10 median + count
  insert into facts_daily(card_id, date, psa10_median, psa10_n)
  select card_id, p_day,
         percentile_cont(0.5) within group (order by price) as psa10_median,
         count(*)::int
  from graded_sales
  where grade = 10 and sold_date = p_day
  group by card_id
  on conflict (card_id, date) do update
  set psa10_median = excluded.psa10_median, psa10_n = excluded.psa10_n;
end; $$;

-- Quick helper to refresh the last 30 days
create or replace function refresh_last_30d()
returns void language plpgsql as $$
declare d date;
begin
  for d in select current_date - offs as dd from generate_series(0,29) as offs
  loop
    perform refresh_daily_facts(d);
  end loop;
end; $$;

-- Helper to get last sold PSA10 per card
create or replace function get_last_sold_psa10(p_set text)
returns table(card_id text, price_cents int, sold_date date) language sql as $$
  select c.card_id, (gs.price*100)::int as price_cents, gs.sold_date
  from cards c
  join lateral (
    select price, sold_date
    from graded_sales
    where graded_sales.card_id = c.card_id and grade = 10
    order by sold_date desc
    limit 1
  ) gs on true
  where c.set_id = p_set;
$$;
