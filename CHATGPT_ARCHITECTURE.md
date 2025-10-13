# ChatGPT Price Data Architecture Plan

## Summary
ChatGPT provided a comprehensive, sustainable architecture for price data that solves all our current issues.

## Key Problems Solved

1. **API Reliability**: Multi-source with fallbacks and circuit breakers
2. **Japanese Coverage**: TCGdex + Cardmarket approach
3. **View Update Issues**: New append-only snapshot model
4. **Cost**: Prefer free APIs, avoid expensive scraping
5. **Sustainability**: Clear update cadence and priorities

## New Database Schema

### 1. `source_mappings` table
```sql
create table source_mappings (
  card_id text primary key references cards(id),
  tcgplayer_product_id text null,
  cardmarket_product_id text null,
  tcgdex_id text null,
  ebay_query text null,
  mercari_query text null,
  yahoo_query text null,
  updated_at timestamptz default now()
);
```

### 2. `price_snapshots` table (append-only)
```sql
create table price_snapshots (
  id bigserial primary key,
  card_id text not null references cards(id),
  source text not null check (source in ('tcgplayer','cardmarket','tcgdex','pricecharting','ebay','mercari','yahoo')),
  price_type text not null check (price_type in ('market','avg_sold','low','median','list','psa10','psa9','raw')),
  currency text not null,
  amount numeric not null,
  sample_size int null,
  observed_at timestamptz not null,
  collected_at timestamptz not null default now(),
  extra jsonb not null default '{}'::jsonb,
  unique(card_id, source, price_type, observed_at)
);
```

### 3. `prices_latest` table (materialized)
```sql
create table prices_latest (
  card_id text primary key,
  market_value numeric not null,
  currency text not null,
  source text not null,
  price_type text not null,
  observed_at timestamptz not null,
  compiled_at timestamptz not null default now()
);
```

### 4. `source_status` table (health tracking)
```sql
create table source_status (
  source text primary key,
  status text not null check (status in ('ok','degraded','down','rate_limited')),
  last_ok timestamptz,
  last_error timestamptz,
  error_message text,
  rolling_error_count int default 0
);
```

## Data Sources Priority

### English Sets
1. **TCGplayer API** (primary) - Official, stable
2. **TCGdex Markets** (fallback) - Free, embeds TCGplayer/Cardmarket
3. **PriceCharting API** (sold context) - eBay-derived

### Japanese Sets
1. **Cardmarket API** (if approved) - Has Japanese support
2. **TCGdex Markets** (current best option) - Free
3. **PriceCharting API** (fallback) - Some JP coverage

## Source Priority Logic

Priority (higher wins):
1. Sold data (eBay Insights / PriceCharting): `avg_sold`/`median_sold` - **Score: 100**
2. TCGplayer market price - **Score: 90**
3. TCGdex embedded prices - **Score: 60**
4. List/low prices - **Score: 40**

**Freshness decay**: -1 point per day after 7 days

## Update Cadence

- **Hot sets** (last 3 releases): Daily
- **Active sets** (last 12 months): Every 3 days
- **Older sets**: Weekly
- **JP-only sets**: Same cadence using available sources

## Implementation Steps

1. ✅ Get ChatGPT's detailed implementation
2. ⏳ Create migration SQL for new tables
3. ⏳ Get API credentials:
   - TCGplayer API (free tier?)
   - PriceCharting API
   - Cardmarket API (if possible)
4. ⏳ Implement resilientFetch wrapper
5. ⏳ Build three ingest scripts (TCGplayer, TCGdex, PriceCharting)
6. ⏳ Backfill source_mappings for pilot sets
7. ⏳ Set up cron jobs (Supabase or Vercel)
8. ⏳ Update frontend to use prices_latest

## Pilot Sets

**English:**
- sv01 (Scarlet & Violet Base) - 264 cards
- sv10 (Prismatic Evolutions) - 230 cards

**Japanese:**
- sv01-jp (Scarlet & Violet Base JP) - 264 cards
- sv10-jp (Prismatic Evolutions JP) - 230 cards

## Expected Outcomes

- **Coverage**: Should reach 80%+ for pilot sets
- **Cost**: Minimal (mostly free APIs)
- **Reliability**: Multi-source fallbacks handle API failures
- **Sustainability**: Clear update process, no more one-off scripts

## Questions for ChatGPT

See CHATGPT_ARCHITECTURE.md for the response we're waiting on:
- Drop-in SQL migrations
- Three ingest scripts
- Source_mappings backfill
- API credential requirements

