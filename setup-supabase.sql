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
