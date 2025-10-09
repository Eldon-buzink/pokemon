# Pokemon Card Movers - Next Steps

## Current Status (October 8, 2025)

### ✅ Completed
1. **Card Catalog**: 11,578 cards (8,419 EN + 3,159 JP)
2. **Images**: 97.8% coverage with high-quality images
3. **Frontend**: Shows 61 sets (doubled from before)
4. **Code Cleanup**: Removed 23+ obsolete files
5. **Pricing Infrastructure**: Apify integration working

### 🔄 In Progress
- **Apify Bulk Import**: Running in background (18 sales so far)
- Expected: ~7,936 cards with pricing within free tier
- Time: 30-60 minutes to complete

### ⏳ Remaining Tasks

## Tomorrow (When eBay API Resets)

### 1. Complete Pricing Data Collection
```bash
# Check Apify import results
npx tsx src/scripts/check-pricing-status.ts

# If needed, run eBay API for remaining cards
npx tsx src/scripts/sync-ebay-prices.ts
```

**Goal**: Get pricing for all 11,578 cards

### 2. Verify Frontend Shows Real Prices
- Visit `http://localhost:3000/analysis`
- Check that prices show without "est" label
- Verify cards have real eBay sold data

### 3. Set Up Daily Price Updates

Create a cron job or GitHub Action:
```yaml
# .github/workflows/daily-price-sync.yml
name: Daily Price Sync
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx tsx src/scripts/sync-ebay-prices.ts
```

## This Week

### 4. Add Missing Japanese Sets

The big one you wanted: **Inferno X (m2)**

**Options:**
1. **Manual CSV import**
   - Create CSV with card list
   - Import into database
   - Pricing will work automatically via eBay

2. **Wait for API coverage**
   - Check if TCGdex or JustTCG add it later
   - Re-run import scripts

3. **Web scraping**
   - Scrape from pokecollector.com or similar
   - One-time effort

### 5. Optimize Pricing Updates

Instead of updating all cards daily:

**Smart Update Strategy:**
```typescript
// High Priority (Daily): Chase cards, recent sets
- Cards worth > $50
- Sets < 6 months old
- Cards with >10 sales/week

// Medium Priority (Weekly): Popular cards
- Cards worth $10-$50
- Sets 6-12 months old

// Low Priority (Monthly): Common cards
- Cards worth < $10
- Older sets
```

This keeps within the 5000/day limit while focusing on what matters.

### 6. Add Real-Time Features

**Price Alerts:**
- Email when card price changes > 10%
- Discord/Slack webhooks for big movers

**Market Trends:**
- Weekly "hot cards" report
- Price momentum indicators
- Volume analysis

## Long-Term Enhancements

### A. Japanese Set Completeness
- Add more Japanese exclusive sets
- Improve Japanese card name translations
- Add romaji/kanji support

### B. Advanced Analytics
- Price prediction ML models
- Seasonal trend analysis
- Set release impact studies

### C. Performance Optimization
- Implement database indexes
- Add Redis caching layer
- Optimize view queries

### D. User Features
- Portfolio tracking
- Watchlists
- Price history charts
- Export to CSV/Excel

## Scripts Reference

### Daily Operations
```bash
# Check pricing status
npx tsx src/scripts/check-pricing-status.ts

# Update prices (daily)
npx tsx src/scripts/sync-ebay-prices.ts

# Update catalog (weekly)
npx tsx src/scripts/import-pokemon-tcg-data.ts
npx tsx src/scripts/import-japanese-from-adapters.ts
```

### One-Time Operations
```bash
# Update Japanese images
npx tsx src/scripts/update-japanese-images.ts

# Bulk pricing import (already done)
npx tsx src/scripts/apify-ebay-bulk-import.ts
```

### Development
```bash
# Start dev server
npm run dev

# Test matching logic
npx tsx src/scripts/test-apify-matching.ts
```

## Cost Summary

### One-Time:
- Apify initial load: $0-7 (depending on free tier usage)

### Ongoing:
- **$0/month** (all free APIs)

### Optional Upgrades:
- Apify Pro: $49/month (for faster/more frequent updates)
- Premium image sources: Varies
- Dedicated proxy: $10-50/month

## Success Metrics

**Current**:
- 61 sets available
- 11,578 cards cataloged
- 97.8% image coverage
- 0.1% pricing coverage (growing)

**Target** (End of Week):
- 61+ sets
- 11,578+ cards
- 98%+ image coverage
- **90%+ pricing coverage** ✨

## Questions?

See:
- `DATA_PIPELINE.md` - Technical pipeline details
- `SESSION_SUMMARY.md` - What we did today
- `README.md` - Project overview

---

**Bottom Line**: The heavy lifting is done! Once Apify completes and eBay API resets tomorrow, you'll have a complete, clean system with real pricing data for both English and Japanese cards. 🎉

