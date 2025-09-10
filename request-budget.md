# Request Budget Plan

## Overview
This document outlines how to manage API quotas efficiently to avoid burning through the 20k/day PPT limit while maintaining data freshness.

## Daily Quota Allocation

### Pokemon Price Tracker API (20,000 requests/day)

#### Priority 1: High-Volume Cards (8,000 requests)
- **Target**: Top 1,000 most traded cards
- **Frequency**: Daily updates
- **Request Pattern**: 8 requests per card (raw + PSA 8,9,10 + population)
- **Rationale**: These cards drive most of the movers and have reliable data

#### Priority 2: Recent Movers (6,000 requests)
- **Target**: Cards with significant 5-day deltas
- **Frequency**: Daily updates
- **Request Pattern**: 6 requests per card (raw + PSA 9,10 + population)
- **Rationale**: Focus on cards already showing movement

#### Priority 3: New Set Cards (4,000 requests)
- **Target**: Cards from sets released in last 90 days
- **Frequency**: Daily updates
- **Request Pattern**: 4 requests per card (raw + PSA 10 + population)
- **Rationale**: New sets often have volatile pricing

#### Priority 4: Batch Updates (2,000 requests)
- **Target**: Remaining cards in rotation
- **Frequency**: Every 3 days
- **Request Pattern**: Bulk endpoint calls
- **Rationale**: Maintain baseline coverage without daily quota burn

## Request Optimization Strategies

### 1. Batch Processing
```typescript
// Instead of individual card requests
for (const cardId of cardIds) {
  await pptClient.getRawPrices(cardId, 7)
}

// Use batch endpoints when available
await pptClient.getBatchPrices(cardIds, 7)
```

### 2. Smart Caching
- **Cache Duration**: 24 hours for price data
- **Cache Invalidation**: Only update if new data available
- **Cache Keys**: `card_id:date:grade` format

### 3. Incremental Updates
- **Delta Sync**: Only fetch data for cards with new sales
- **Change Detection**: Compare last update timestamps
- **Skip Unchanged**: Don't re-fetch identical data

### 4. Request Prioritization
```typescript
interface RequestPriority {
  cardId: string
  priority: 1 | 2 | 3 | 4
  lastUpdate: Date
  volume: number
  delta5d: number
}
```

## Quota Monitoring

### Real-time Tracking
```typescript
class QuotaManager {
  private dailyUsage: number = 0
  private lastReset: Date = new Date()
  
  canMakeRequest(): boolean {
    return this.dailyUsage < 20000
  }
  
  recordRequest(): void {
    this.dailyUsage++
  }
  
  getRemainingQuota(): number {
    return 20000 - this.dailyUsage
  }
}
```

### Usage Alerts
- **Warning**: 80% quota used (16,000 requests)
- **Critical**: 95% quota used (19,000 requests)
- **Emergency**: 99% quota used (19,800 requests)

## Fallback Strategies

### 1. Quota Exhaustion
- **Immediate**: Switch to cached data only
- **Notification**: Alert administrators
- **Recovery**: Wait for next day reset

### 2. API Rate Limiting
- **Exponential Backoff**: 1s, 2s, 4s, 8s delays
- **Circuit Breaker**: Stop requests for 5 minutes
- **Retry Logic**: Max 3 attempts per request

### 3. Data Source Failover
- **Primary**: PPT API
- **Secondary**: Cached data
- **Tertiary**: Static fallback values

## Cost Optimization

### Pokemon TCG API (Free Tier)
- **Limit**: 100 requests/hour
- **Usage**: Catalog sync only
- **Strategy**: Batch during off-peak hours

### Future Paid APIs
- **Cardmarket**: €0.01 per request
- **eBay**: $0.50 per 1,000 requests
- **PSA**: TBD pricing

## Monitoring Dashboard

### Key Metrics
- **Daily Usage**: Current vs. allocated quota
- **Success Rate**: Successful vs. failed requests
- **Data Freshness**: Hours since last update
- **Error Rate**: API errors by source

### Alerts
- **Slack**: Quota warnings and errors
- **Email**: Daily usage reports
- **SMS**: Critical quota exhaustion

## Implementation Timeline

### Week 1: Basic Quota Management
- [ ] Implement QuotaManager class
- [ ] Add request tracking to PPT client
- [ ] Create usage monitoring

### Week 2: Smart Prioritization
- [ ] Implement request prioritization
- [ ] Add batch processing
- [ ] Create fallback strategies

### Week 3: Monitoring & Alerts
- [ ] Build usage dashboard
- [ ] Set up alerting system
- [ ] Add cost tracking

### Week 4: Optimization
- [ ] Implement caching layer
- [ ] Add incremental updates
- [ ] Performance tuning
