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
-- LATEST PRICE VIEWS (ChatGPT Improvement #1)
-- ============================================================================

-- Latest price per card per source
create or replace view v_latest_prices as
select distinct on (card_id, source)
  card_id, source, raw_cents, psa10_cents, currency, ts, notes
from prices
order by card_id, source, ts desc;

-- Join cards + latest prices flattened for fast UI
create or replace view v_cards_latest as
select
  c.id as card_id, c.set_id, c.number, c.name, c.rarity,
  tp.raw_cents   as tcg_raw_cents, tp.currency as tcg_currency,
  cm.raw_cents   as cm_raw_cents,  cm.currency as cm_currency,
  ppt.raw_cents  as ppt_raw_cents, ppt.psa10_cents as ppt_psa10_cents
from cards c
left join v_latest_prices tp  on tp.card_id=c.id and tp.source='tcgplayer'
left join v_latest_prices cm  on cm.card_id=c.id and cm.source='cardmarket'
left join v_latest_prices ppt on ppt.card_id=c.id and ppt.source='ppt';

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
  ('68af37225bce97006df9f260','ptgio','cel25',   1,  100),
  ('68af37225bce97006df9f260','ptgio','cel25c', 101,  999),
  ('cel25','ptgio','cel25',   null,  null),  -- Direct mapping for legacy
  ('cel25c','ptgio','cel25c', null,  null)   -- Direct mapping for legacy
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
