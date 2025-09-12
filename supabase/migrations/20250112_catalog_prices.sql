create table if not exists public.sets (
  id text primary key,                -- e.g., 'swsh35'
  name text not null,
  series text,
  release_date date,
  total int,
  images jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cards (
  id text primary key,                -- e.g., 'swsh35-2'
  set_id text not null references public.sets(id) on delete cascade,
  number text not null,
  name text not null,
  rarity text,
  images jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (set_id, number)
);

create table if not exists public.source_set_map (
  id bigserial primary key,
  canonical_set_id text not null references public.sets(id) on delete cascade,
  source text not null,                        -- 'tcgplayer' | 'pricecharting' | 'ppt'
  source_set_name text not null,               -- e.g., 'Celebrations: Classic Collection'
  number_range text null                       -- e.g., '101-125'
);

create table if not exists public.prices (
  id bigserial primary key,
  card_id text not null references public.cards(id) on delete cascade,
  source text not null,                         -- 'tcgplayer' | 'pricecharting' | 'ppt'
  raw_cents int null,
  psa10_cents int null,
  currency text not null default 'USD',
  ts timestamptz not null default now(),
  notes text
);

create index if not exists idx_cards_set on public.cards(set_id);
create index if not exists idx_prices_card_source on public.prices(card_id, source);
