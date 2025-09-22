-- Create price history table
create table if not exists price_history (
  set_id text not null,
  number text not null,
  date date not null,
  raw_usd numeric,
  psa10_usd numeric,
  primary key (set_id, number, date)
);

-- Create population history table
create table if not exists pop_history (
  set_id text not null,
  number text not null,
  date date not null,
  psa10 int,
  psa9 int,
  psa8 int,
  total int,
  primary key (set_id, number, date)
);

-- Add indexes for better query performance
create index if not exists idx_price_history_set_date on price_history(set_id, date desc);
create index if not exists idx_pop_history_set_date on pop_history(set_id, date desc);

-- Add comments for documentation
comment on table price_history is 'Historical price data for cards across different conditions';
comment on table pop_history is 'Historical PSA population data for graded cards';

comment on column price_history.raw_usd is 'Raw/ungraded card price in USD';
comment on column price_history.psa10_usd is 'PSA 10 graded card price in USD';

comment on column pop_history.psa10 is 'Number of PSA 10 graded cards';
comment on column pop_history.psa9 is 'Number of PSA 9 graded cards';
comment on column pop_history.psa8 is 'Number of PSA 8 graded cards';
comment on column pop_history.total is 'Total number of graded cards';
