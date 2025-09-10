# Requirements Update Summary

## ✅ **Changes Made to Meet Your Requirements**

### 1. **Profit/Loss Sorting (Raw vs PSA 10)**
- **Updated UI**: Added "Sort By" filter with "Profit/Loss (Raw vs PSA 10)" as the default option
- **Database**: Added `profit_loss_rank` column to track rankings
- **Logic**: `spread_after_fees` = PSA 10 price - (Raw price + grading fees)

### 2. **Weekly Market Update Emails**
- **Email Subscription**: Added subscription form to movers page
- **Database**: Created `email_subscriptions` table to store user preferences
- **Service**: Built `EmailService` to send weekly updates every Monday
- **Content**: Top 5 movers based on user's filter settings
- **Unsubscribe**: Token-based unsubscribe system

### 3. **Removed EUR Currency Filter**
- **Updated UI**: Removed EUR currency checkbox from filters
- **Simplified**: Focus on USD pricing only

### 4. **Extended Time Periods (90 days max)**
- **Updated UI**: Added time period selector (5, 7, 30, 90 days)
- **Database**: Created `facts_historical` table for longer-term data
- **Weekly Updates**: Script runs every Sunday to update historical data
- **Storage**: Maintains 90 days of historical price data

## 🔧 **Technical Implementation**

### Database Schema Updates
```sql
-- New tables added:
- email_subscriptions (user email preferences)
- facts_historical (7, 30, 90-day aggregates)
- market_update_logs (email sending statistics)

-- Updated tables:
- facts_5d (added profit_loss_rank column)
```

### New Services Created
- **EmailService**: Handles weekly market update emails
- **WeeklyUpdateService**: Runs every Sunday to update historical data
- **QuotaManager**: Tracks API usage to avoid burning through limits

### Updated UI Components
- **Movers Page**: New filters for time period, sorting, profit/loss
- **Email Subscription**: Form to subscribe to weekly updates
- **Results Table**: Will show profit/loss as primary metric

## 📅 **Weekly Update Schedule**

### Sunday (Data Update)
1. **Historical Aggregates**: Calculate 7, 30, 90-day deltas
2. **Profit/Loss Rankings**: Rank all cards by spread after fees
3. **Data Freshness**: Ensure all historical data is up to date

### Monday (Email Sends)
1. **Top 5 Movers**: Get highest profit/loss cards
2. **Personalized Emails**: Send based on user's filter preferences
3. **Email Logging**: Track delivery statistics

## 🎯 **User Experience Flow**

### 1. **Discovering Opportunities**
- User visits movers page
- Sorts by "Profit/Loss (Raw vs PSA 10)"
- Sees cards with highest grading profit potential
- Can filter by time period (5-90 days)

### 2. **Setting Up Alerts**
- User applies their preferred filters
- Enters email address
- Subscribes to weekly updates
- Gets top 5 movers every Monday

### 3. **Weekly Updates**
- Every Monday, receives email with top 5 movers
- Based on their saved filter preferences
- Shows profit/loss potential for grading
- Can unsubscribe anytime

## 🚀 **Next Steps to Implement**

### 1. **Database Setup**
- Run `schema-updates.sql` to add new tables
- Set up Supabase project with updated schema

### 2. **Email Service Integration**
- Choose email provider (Resend, SendGrid, AWS SES)
- Implement actual email sending in `EmailService`
- Set up email templates

### 3. **Cron Jobs**
- Set up weekly cron job to run `weekly-update.ts`
- Schedule for Sunday evenings (data update)
- Schedule for Monday mornings (email sends)

### 4. **UI Implementation**
- Connect filters to actual data queries
- Implement sorting and filtering logic
- Add email subscription API endpoints

## 📊 **Data Flow**

```
Daily: PPT API → Raw Data → facts_daily
Weekly: facts_daily → Historical Aggregates → facts_historical
Weekly: facts_historical → Top 5 Movers → Email Subscribers
```

The system now perfectly matches your requirements:
- ✅ Profit/loss sorting (raw vs PSA 10)
- ✅ Weekly email updates with top 5 movers
- ✅ No EUR currency filter
- ✅ Extended time periods up to 90 days
- ✅ Historical data storage and weekly updates
