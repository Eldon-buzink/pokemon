# Pokémon Card Analysis Tool - Day 2 Planning (Updated)

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

### Phase 1: Core Metrics & Data Quality (Week 1)

#### 1.1 Enhanced Data Validation
- [ ] **Implement data quality scoring** for each price point
- [ ] **Add minimum sales volume thresholds** (e.g., require 5+ sales for confidence)
- [ ] **Cross-validate prices** between PPT API and eBay data
- [ ] **Flag suspicious price movements** (e.g., >50% daily changes)

#### 1.2 Core Metrics Engine (Simplified)
- [ ] **Basic statistical functions**: median, percentChange, volatility
- [ ] **Sales volume analysis**: liquidity scoring based on sales count
- [ ] **Trend momentum**: 5d/30d/90d price change calculations
- [ ] **Outlier detection**: Remove extreme price points (>3σ from median)

#### 1.3 PSA 10 Probability System
- [ ] **Implement "gem rate estimator"** for PSA 10 probability
- [ ] **Add confidence scoring** based on data quality
- [ ] **Create PSA grade distribution** (PSA 10: X%, PSA 9: Y%, etc.)
- [ ] **Display "Expected PSA Grade Distribution"** chart

### Phase 2: Visual Indicators & Trending Detection (Week 2)

#### 2.1 Trend Indicators (High Priority)
- [ ] **Add "HOT" badges** for cards with >20% price increase in 5 days
- [ ] **Color-coded trend arrows** (green up, red down, yellow stable)
- [ ] **"GRADE EV" badges** for profitable grading opportunities
- [ ] **"EARLY" badges** for new sets with limited data

#### 2.2 Investment Analysis Cards (From Competitor Screenshots)
- [ ] **"Investment Cost" card** showing:
  - Raw card price (USD)
  - PSA grading fees ($18.99)
  - Total per card cost
  - eBay selling fees (12.9%)
- [ ] **"Batch Analysis" card** showing:
  - Sample size (e.g., 10 cards)
  - Total batch investment
  - Expected return based on PSA 10 probability

#### 2.3 Market Activity Dashboard
- [ ] **Daily/Weekly/30-day sales** metrics
- [ ] **PSA grade sales breakdown** (like competitor)
- [ ] **Average prices per grade** (PSA 10: $X, PSA 9: $Y, etc.)
- [ ] **Sales velocity indicators** (cards/day, cards/week)

### Phase 3: Enhanced Filtering & Sorting (Week 3)

#### 3.1 Advanced Filtering
- [ ] **"Trending Up" filter** for cards with recent price increases
- [ ] **"High PSA 10 Probability"** filter (>60% chance)
- [ ] **"New Set" filter** for recently released cards
- [ ] **"Volume Spike" filter** for cards with increased sales activity
- [ ] **"GRADE EV" filter** for profitable grading opportunities

#### 3.2 Enhanced Sorting Options
- [ ] **Sort by PSA 10 probability** (highest chance first)
- [ ] **Sort by recent momentum** (5-day price change)
- [ ] **Sort by volume increase** (sales activity spike)
- [ ] **Sort by profit potential** (PSA 10 price - raw price - fees)

### Phase 4: New Set Handling (Week 4)

#### 4.1 Early Market Detection
- [ ] **Create "New Set Detection"** system
- [ ] **Implement early price tracking** for cards with <30 days of data
- [ ] **Add "EARLY" indicators** for new cards
- [ ] **Special handling for cards with limited history**

#### 4.2 Early Market Logic
- [ ] **Calculate days since release** for each set
- [ ] **Early confidence scoring** based on available data
- [ ] **Conservative estimates** for cards with limited history
- [ ] **"Grading data building"** indicators

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
- [ ] `Badge` - HOT, GRADE EV, EARLY badges
- [ ] `Sparkline` - Mini price charts

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

1. **Add PSA 10 probability calculation** - Start with basic algorithm
2. **Create trend indicators** - Visual arrows and badges
3. **Implement investment analysis cards** - Cost breakdown display
4. **Add "Trending Up" filter** - Quick access to rising cards
5. **Fix data quality issues** - Implement minimum sales thresholds

## ChatGPT's Technical Approach (For Reference)

The original ChatGPT plan was very comprehensive but complex:
- **Core metrics engine** with winsorization, MAD, momentum calculations
- **Sales abstraction layer** for multiple data sources
- **Gem rate estimator** for PSA 10 probabilities
- **Batch API endpoints** with caching
- **Sparkline components** and detailed filtering
- **Early market detection** with confidence scoring
- **Alert system** for local monitoring

## My Recommendation: Hybrid Approach

**Start Simple, Scale Up:**
1. **Week 1**: Implement basic PSA 10 probability + trend indicators
2. **Week 2**: Add investment analysis cards + enhanced filtering
3. **Week 3**: Implement early market detection + advanced metrics
4. **Week 4**: Add sophisticated statistical analysis (ChatGPT's approach)

This gives you immediate value while building toward the more complex system.

## Notes

- **Currency**: All prices in USD (not EUR as in ChatGPT's plan)
- **Naming**: Use "Analysis" instead of "Movers" (already updated)
- **Focus**: Prioritize cards that are "shooting up in value" as primary goal
- **Competitor Analysis**: Reference pokemonpricetracker.com/psa-analysis features
- **Technical Debt**: Start with simple implementations, refactor to ChatGPT's approach later
