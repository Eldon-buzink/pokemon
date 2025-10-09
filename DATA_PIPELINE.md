# Pokemon Card Movers - Data Pipeline

## Overview

This document describes the clean, streamlined data pipeline for Pokemon Card Movers.

## Architecture

```
┌─────────────────────────────────────────┐
│  DATA SOURCES                            │
├─────────────────────────────────────────┤
│                                          │
│  1. pokemon-tcg-data (GitHub)            │
│     ├─ English card catalog              │
│     ├─ Card images                       │
│     └─ Set metadata                      │
│                                          │
│  2. TCGdex API                           │
│     └─ Japanese card images              │
│                                          │
│  3. Apify eBay Scraper (initial)         │
│     ├─ Bulk pricing data load            │
│     └─ One-time: ~$7 for 11k cards       │
│                                          │
│  4. eBay Finding API (ongoing)           │
│     ├─ Daily pricing updates             │
│     └─ Free: 5000 calls/day              │
│                                          │
└─────────────────────────────────────────┘
```

## Data Flow

### 1. Card Catalog Import

**English Cards:**
```bash
npx tsx src/scripts/import-pokemon-tcg-data.ts
```
- Source: pokemon-tcg-data GitHub repository
- Frequency: Weekly (or when new sets release)
- Cost: Free, no API limits
- Output: `cards` and `card_assets` tables

**Japanese Cards:**
```bash
npx tsx src/scripts/import-japanese-from-adapters.ts
```
- Source: Adapter configs + English card mirroring
- Frequency: Weekly
- Cost: Free
- Output: Japanese entries in `cards` and `card_assets` tables

### 2. Image Enhancement

**Japanese Images:**
```bash
npx tsx src/scripts/update-japanese-images.ts
```
- Source: TCGdex API
- Frequency: Once (or when new Japanese sets added)
- Cost: Free, no API limits
- Output: Updates `card_assets.image_url_*` for Japanese cards

### 3. Pricing Data

**Initial Bulk Load (One-Time):**
```bash
npx tsx src/scripts/apify-ebay-bulk-import.ts
```
- Source: Apify eBay Scraper
- Frequency: One-time initial load
- Cost: ~$7 for 11k cards (within $5 free tier for ~8k cards)
- Strategy: Newest sets first (most volatile)
- Output: `graded_sales` and `prices` tables

**Ongoing Updates (Daily):**
```bash
npx tsx src/scripts/sync-ebay-prices.ts
```
- Source: eBay Finding API
- Frequency: Daily
- Cost: Free (5000 calls/day)
- Strategy: 
  - Daily: High-value cards (chase cards)
  - Weekly: Medium-value cards
  - Monthly: Common cards
- Output: `graded_sales` and `prices` tables

## Database Schema

### Core Tables

**`cards`** - Card catalog
```sql
card_id  text primary key
set_id   text not null
number   text not null
name     text not null
rarity   text
lang     text  -- 'en' or 'ja'
edition  text  -- 'Unlimited', '1st Edition', etc.
```

**`card_assets`** - Images and metadata
```sql
card_id           text primary key
set_name          text
release_date      date
rarity            text
image_url_small   text
image_url_large   text
last_catalog_sync timestamptz
```

**`graded_sales`** - Individual sales (event-level)
```sql
id          bigserial primary key
card_id     text references cards
grade       int  -- 0=raw, 8-10=PSA grades
sold_date   date
price       numeric
source      text  -- 'apify-ebay', 'ebay', 'ppt'
listing_id  text
```

**`prices`** - Aggregated pricing
```sql
id          bigserial primary key
card_id     text references cards
source      text  -- 'ebay', 'ppt', 'tcgplayer'
raw_cents   int
psa10_cents int
currency    text
ts          timestamptz
notes       text
```

## Current Status

### Card Catalog
- ✅ **11,578 total cards**
- ✅ **8,419 English cards** (from GitHub)
- ✅ **3,159 Japanese cards** (from adapters)
- ✅ **61 sets** (English + Japanese)
- ✅ **97.8% have images** (11,321/11,578)

### Pricing Data
- 🔄 **Apify bulk import running** (newest → oldest)
- 🔄 **~7,936 cards** will get pricing within free tier
- ⏳ **Tomorrow**: eBay API for remaining cards

## Scripts

### Active Scripts (Keep These)

| Script | Purpose | Frequency |
|--------|---------|-----------|
| `import-pokemon-tcg-data.ts` | Import English cards from GitHub | Weekly |
| `import-japanese-from-adapters.ts` | Import Japanese cards | Weekly |
| `update-japanese-images.ts` | Update Japanese card images | Once |
| `apify-ebay-bulk-import.ts` | Initial bulk pricing load | One-time |
| `sync-ebay-prices.ts` | Ongoing pricing updates | Daily |
| `test-apify-matching.ts` | Test matching logic | As needed |

### Obsolete Scripts (Removed)

- ❌ `ingest-modern-sets.ts` (replaced by import-pokemon-tcg-data.ts)
- ❌ `ingest-complete-sets.ts` (replaced)
- ❌ `ingest-all-sets.ts` (replaced)
- ❌ Various test/debug scripts

## Cost Analysis

### One-Time Setup
- Apify initial load: ~$7 (or ~$0 with free tier for 8k cards)
- **Total**: $0-7

### Ongoing (Monthly)
- GitHub API: $0 (unlimited)
- TCGdex API: $0 (unlimited)
- eBay Finding API: $0 (5000 calls/day)
- **Total**: $0/month

## Next Steps

1. ✅ Card catalog complete (11,578 cards)
2. ✅ Images complete (97.8% coverage)
3. 🔄 Apify pricing import running
4. ⏳ Update UI to show real prices
5. ⏳ Set up daily cron job for eBay updates

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# eBay (for ongoing updates)
EBAY_APP_ID=...

# Apify (for initial bulk load)
APIFY_API_TOKEN=apify_api_...
```

## Support

For questions or issues, check:
- `README.md` - Project overview
- `architecture.md` - System architecture
- `data-dictionary.md` - Data definitions

