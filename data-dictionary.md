# Data Dictionary & Source Map

## Overview
This document maps all data points to their sources and update frequencies for the Pokémon card movers application.

## Data Sources

### 1. Pokemon TCG API (pokemontcg.io)
**Purpose**: Static catalog data and high-resolution images
**Update Frequency**: One-time/new-set syncs only
**Quota**: No daily limits (free tier available)

#### Data Points:
- `card_id` (string): Unique card identifier
- `name` (string): Card name
- `set_id` (string): Set identifier
- `set_name` (string): Set name
- `number` (string): Card number within set
- `rarity` (string): Card rarity
- `release_date` (date): Set release date
- `image_url_small` (string): Small image URL (64x64)
- `image_url_large` (string): Large image URL (420px max width)
- `tcgplayer_url` (string): TCGPlayer marketplace link

### 2. Pokemon Price Tracker API (PPT)
**Purpose**: Daily market data for price movements
**Update Frequency**: Daily (within 20k request quota)
**Quota**: 20,000 requests/day

#### Data Points:
- `raw_prices` (array): Daily median raw card prices
  - `card_id` (string)
  - `date` (date)
  - `median_price` (numeric)
  - `n_sales` (integer)
- `graded_sales` (array): Individual graded card sales
  - `card_id` (string)
  - `grade` (integer): PSA grade (8-10)
  - `sold_date` (date)
  - `price` (numeric)
  - `listing_id` (string)
- `psa_population` (array): PSA population data
  - `card_id` (string)
  - `grade` (integer)
  - `pop_count` (integer)
  - `snapshot_date` (date)

### 3. Future Data Sources (Modular Adapters)

#### Cardmarket API
**Purpose**: EU market data, EUR pricing
**Status**: Future expansion
**Data Points**: Raw prices, graded sales (EUR)

#### eBay API
**Purpose**: Additional sales data, broader market coverage
**Status**: Future expansion
**Data Points**: Sold listings, graded sales

#### PSA API
**Purpose**: Direct population data, grading statistics
**Status**: Future expansion
**Data Points**: Population counts, grading success rates

## Computed Data Points

### Daily Aggregates (facts_daily)
**Source**: Computed from raw data
**Update Frequency**: Daily
**Computation**: Server-side aggregation

- `raw_median` (numeric): Median raw price for the day
- `raw_n` (integer): Number of raw sales
- `psa9_median` (numeric): Median PSA 9 price
- `psa9_n` (integer): Number of PSA 9 sales
- `psa10_median` (numeric): Median PSA 10 price
- `psa10_n` (integer): Number of PSA 10 sales
- `pop9` (integer): PSA 9 population count
- `pop10` (integer): PSA 10 population count

### 5-Day Deltas (facts_5d)
**Source**: Computed from daily aggregates
**Update Frequency**: Daily
**Computation**: Server-side calculation

- `raw_delta_5d` (numeric): 5-day price change percentage
- `psa9_delta_5d` (numeric): 5-day PSA 9 price change
- `psa10_delta_5d` (numeric): 5-day PSA 10 price change
- `volume_score` (numeric): Normalized volume score
- `pop10_delta_5d` (integer): 5-day population change
- `spread_after_fees` (numeric): Profit after grading fees
- `psa10_prob_lifetime` (numeric): Lifetime PSA 10 probability
- `psa10_prob_rolling` (numeric): 90-day rolling PSA 10 probability
- `psa10_prob_adj` (numeric): Population-adjusted PSA 10 probability
- `confidence` (string): High/Speculative/Noisy rating

## Data Flow

### 1. Initial Setup (One-time)
```
Pokemon TCG API → Catalog Sync → cards + card_assets tables
Pokemon TCG API → Image Download → Supabase Storage
```

### 2. Daily Updates
```
PPT API → Raw Data → raw_prices + graded_sales tables
PPT API → Population Data → psa_pop table
Database → Aggregation → facts_daily table
Database → Delta Calculation → facts_5d table
```

### 3. Real-time Serving
```
Database → Server Queries → UI Components
Supabase Storage → next/image → Card Images
```

## Quota Management

### Pokemon TCG API
- **Free Tier**: 100 requests/hour
- **Usage**: One-time catalog sync, new set releases
- **Strategy**: Batch requests, cache results

### Pokemon Price Tracker API
- **Quota**: 20,000 requests/day
- **Usage**: Daily price updates only
- **Strategy**: Prioritize high-volume cards, batch requests

### Future APIs
- **Cardmarket**: Rate-limited, EU-focused
- **eBay**: Commercial API, higher costs
- **PSA**: Direct integration, population data

## Data Quality & Validation

### Outlier Detection
- IQR method: Remove prices outside Q1-1.5*IQR to Q3+1.5*IQR
- Minimum sales filter: Raw ≥ 5 sales, Graded ≥ 3 sales
- Price validation: Remove negative or zero prices

### Confidence Scoring
- **High**: ≥8 graded sales in 5 days AND IQR width ≤ 25% of median
- **Speculative**: 3-7 graded sales in 5 days
- **Noisy**: <3 graded sales OR high price variance

### Data Freshness
- **Target**: ≤24 hour data freshness
- **Monitoring**: Health checks for last snapshot timestamps
- **Alerting**: Failed ingestion notifications
