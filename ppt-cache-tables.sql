-- Cache a successful PPT payload per (set_id, number, kind) for 24h
create table if not exists ppt_cache (
  id bigserial primary key,
  set_id text not null,
  number text not null,
  kind text not null, -- 'sales' | 'summary'
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (set_id, number, kind)
);

-- Throttle ledger: when we last tried and when we may try next
create table if not exists ppt_throttle (
  id bigserial primary key,
  set_id text not null,
  number text not null,
  last_attempt timestamptz,
  next_earliest timestamptz,
  last_status text,   -- 'ok' | '429' | 'err'
  attempts int default 0,
  unique (set_id, number)
);

-- Public read okay; writes only from server
alter table ppt_cache enable row level security;
alter table ppt_throttle enable row level security;
create policy "read cache" on ppt_cache for select using (true);
create policy "read throttle" on ppt_throttle for select using (true);
