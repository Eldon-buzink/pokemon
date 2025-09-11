# Pokémon Card Analysis Tool - Day 2 Planning

## Current Issues Identified

### 1. Data Quality & Accuracy Issues
- **Low sales volume** leading to misleading price data
- **Incorrect raw prices** from data sources
- **Inaccurate graded prices** affecting profit calculations
- **Insufficient historical data** for reliable trend analysis

### 2. UI/UX Limitations
- **Poor trend identification** - hard to spot cards "shooting up in value"
- **Missing PSA 10 probability** - competitor shows "chance of getting a 10"
- **Limited time period analysis** - need better 5/30/90 day comparisons
- **Weak visual indicators** for value increases

### 3. New Set Handling
- **No data strategy** for newly released sets
- **Raw price increases** not captured for new cards
- **Missing early opportunity detection**

## Recommended Next Steps (Priority Order)

### Phase 1: Data Quality & Source Improvements (Week 1)

#### 1.1 Enhanced Data Validation
- [ ] **Implement data quality scoring** for each price point
- [ ] **Add minimum sales volume thresholds** (e.g., require 5+ sales for confidence)
- [ ] **Cross-validate prices** between PPT API and eBay data
- [ ] **Flag suspicious price movements** (e.g., >50% daily changes)

#### 1.2 Improved PSA 10 Data
- [ ] **Integrate eBay Sold Listings API** for real PSA 10 sales data
- [ ] **Calculate PSA 10 probability** based on historical grading data
- [ ] **Add PSA grade distribution** (PSA 10: X%, PSA 9: Y%, etc.)
- [ ] **Implement "Expected PSA Grade Distribution"** chart

#### 1.3 New Set Strategy
- [ ] **Create "New Set Detection"** system
- [ ] **Implement early price tracking** for cards with <30 days of data
- [ ] **Add "Trending Up" indicators** for new cards
- [ ] **Special handling for cards with limited history**

### Phase 2: Enhanced UI/UX for Value Identification (Week 2)

#### 2.1 Visual Trend Indicators
- [ ] **Add "Rocket" icons** for cards with >20% price increase
- [ ] **Color-coded trend arrows** (green up, red down, yellow stable)
- [ ] **"Hot" badges** for cards with significant volume spikes
- [ ] **Trending cards section** at top of analysis page

#### 2.2 PSA 10 Probability Display
- [ ] **Add "PSA 10 Chance" column** to main table
- [ ] **Implement probability calculation** based on:
  - Historical grading data
  - Card condition factors
  - Set-specific grading patterns
- [ ] **Visual probability bars** (like competitor screenshots)

#### 2.3 Investment Analysis Cards
- [ ] **"Investment Cost" card** showing:
  - Raw card price
  - PSA grading fees ($18.99)
  - Total per card cost
  - eBay selling fees (12.9%)
- [ ] **"Batch Analysis" card** showing:
  - Sample size (e.g., 10 cards)
  - Total batch investment
  - Expected return based on PSA 10 probability

### Phase 3: Advanced Analytics & Filtering (Week 3)

#### 3.1 Market Activity Dashboard
- [ ] **Daily/Weekly/30-day sales** metrics
- [ ] **PSA grade sales breakdown** (like competitor)
- [ ] **Average prices per grade** (PSA 10: $X, PSA 9: $Y, etc.)
- [ ] **Sales velocity indicators** (cards/day, cards/week)

#### 3.2 Enhanced Filtering
- [ ] **"Trending Up" filter** for cards with recent price increases
- [ ] **"High PSA 10 Probability"** filter (>60% chance)
- [ ] **"New Set" filter** for recently released cards
- [ ] **"Volume Spike" filter** for cards with increased sales activity

#### 3.3 Advanced Sorting Options
- [ ] **Sort by PSA 10 probability** (highest chance first)
- [ ] **Sort by recent momentum** (5-day price change)
- [ ] **Sort by volume increase** (sales activity spike)
- [ ] **Sort by profit potential** (PSA 10 price - raw price - fees)

### Phase 4: Real-time Monitoring & Alerts (Week 4)

#### 4.1 Price Movement Alerts
- [ ] **Real-time price monitoring** for tracked cards
- [ ] **Email alerts** for significant price movements
- [ ] **"Hot List"** of cards with recent spikes
- [ ] **Weekly summary** of top movers

#### 4.2 Market Intelligence
- [ ] **Set release tracking** for new Pokémon sets
- [ ] **Early opportunity detection** for new cards
- [ ] **Market trend analysis** across different timeframes
- [ ] **Competitive pricing insights**

## Technical Implementation Notes

### Data Sources Priority
1. **Primary**: Pokemon Price Tracker API (existing)
2. **Secondary**: eBay Sold Listings API (for PSA 10 data)
3. **Tertiary**: PSA Population Reports (for grading probabilities)

### UI Components to Build
- [ ] `PSAProbabilityChart` - Shows grade distribution
- [ ] `InvestmentAnalysisCard` - Cost breakdown
- [ ] `MarketActivityCard` - Sales metrics
- [ ] `TrendIndicator` - Visual trend arrows
- [ ] `NewSetBadge` - For recently released cards

### Database Schema Updates
- [ ] Add `psa_grade_probabilities` table
- [ ] Add `market_activity` table for sales metrics
- [ ] Add `trend_indicators` table for price movements
- [ ] Add `new_set_tracking` table

## Success Metrics

### Data Quality
- [ ] 95%+ of displayed prices have >5 sales backing
- [ ] PSA 10 probabilities calculated for 100% of cards
- [ ] Price validation catches 99%+ of suspicious movements

### User Experience
- [ ] Users can identify trending cards within 5 seconds
- [ ] PSA 10 probability visible for all cards
- [ ] Investment analysis clear and actionable

### Business Value
- [ ] Identify 10+ profitable opportunities per week
- [ ] Early detection of new set opportunities
- [ ] Accurate profit/loss calculations

## Immediate Next Steps (Today)

1. **Fix data quality issues** - implement minimum sales thresholds
2. **Add PSA 10 probability calculation** - start with basic algorithm
3. **Create trend indicators** - visual arrows for price movements
4. **Implement investment analysis cards** - cost breakdown display
5. **Add "Trending Up" filter** - quick access to rising cards

## Notes

- **Currency**: All prices in USD (not EUR as mentioned in original planning)
- **Naming**: Use "Analysis" instead of "Movers" (already updated)
- **Focus**: Prioritize cards that are "shooting up in value" as primary goal
- **Competitor Analysis**: Reference pokemonpricetracker.com/psa-analysis features
