/**
 * Weekly Update Script
 * Runs every Sunday to update historical data and send market update emails
 */

import { supabaseAdmin } from '@/lib/supabase'
import { emailService } from '@/lib/services/email-service'
// import { calculateDailyAggregates, calculateDelta5d } from '@/lib/compute/aggregates'
// import { calculateRankingScore, calculateConfidence } from '@/lib/compute/score'

interface WeeklyUpdateConfig {
  periods: number[] // [7, 30, 90] days
  batchSize: number
}

class WeeklyUpdateService {
  private config: WeeklyUpdateConfig

  constructor(config: WeeklyUpdateConfig) {
    this.config = config
  }

  /**
   * Main weekly update process
   */
  async run(): Promise<void> {
    console.log('Starting weekly update process...')
    
    try {
      // 1. Update historical aggregates for all periods
      await this.updateHistoricalAggregates()
      
      // 2. Calculate profit/loss rankings
      await this.calculateProfitLossRankings()
      
      // 3. Send weekly market update emails
      await this.sendMarketUpdateEmails()
      
      console.log('Weekly update completed successfully')
    } catch (error) {
      console.error('Weekly update failed:', error)
      throw error
    }
  }

  /**
   * Update historical aggregates for all time periods
   */
  private async updateHistoricalAggregates(): Promise<void> {
    console.log('Updating historical aggregates...')
    
    for (const period of this.config.periods) {
      console.log(`Processing ${period}-day aggregates...`)
      
      // Get all cards that have data for this period
      const { data: cards, error: cardsError } = await supabaseAdmin
        .from('facts_daily')
        .select('card_id')
        .gte('date', new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .distinct()

      if (cardsError) {
        throw new Error(`Failed to get cards for ${period}-day period: ${cardsError.message}`)
      }

      if (!cards || cards.length === 0) {
        console.log(`No cards found for ${period}-day period`)
        continue
      }

      // Process cards in batches
      for (let i = 0; i < cards.length; i += this.config.batchSize) {
        const batch = cards.slice(i, i + this.config.batchSize)
        
        await Promise.all(
          batch.map(card => this.updateCardHistoricalData(card.card_id, period))
        )
        
        console.log(`Processed ${Math.min(i + this.config.batchSize, cards.length)}/${cards.length} cards for ${period}-day period`)
      }
    }
  }

  /**
   * Update historical data for a single card
   */
  private async updateCardHistoricalData(cardId: string, periodDays: number): Promise<void> {
    try {
      // Get daily data for the period
      const { data: dailyData, error: dailyError } = await supabaseAdmin
        .from('facts_daily')
        .select('*')
        .eq('card_id', cardId)
        .gte('date', new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (dailyError) {
        throw new Error(`Failed to get daily data for card ${cardId}: ${dailyError.message}`)
      }

      if (!dailyData || dailyData.length < 2) {
        return // Need at least 2 data points to calculate deltas
      }

      // Calculate aggregates
      const latest = dailyData[dailyData.length - 1]
      const earliest = dailyData[0]
      
      const rawDelta = calculateDelta5d(latest.raw_median, earliest.raw_median)
      const psa10Delta = calculateDelta5d(latest.psa10_median, earliest.psa10_median)
      
      // Calculate volume score
      const totalSales = dailyData.reduce((sum, day) => sum + (day.raw_n || 0), 0)
      const volumeScore = Math.min(1, Math.log10(totalSales + 1) / 2)
      
      // Calculate population delta
      const pop10Delta = (latest.pop10 || 0) - (earliest.pop10 || 0)
      
      // Calculate spread after fees (simplified)
      const spreadAfterFees = (latest.psa10_median || 0) - (latest.raw_median || 0) - 25 // $25 base fee
      
      // Calculate PSA10 probabilities (simplified)
      const psa10ProbLifetime = 0.15 // Placeholder
      const psa10ProbRolling = 0.18 // Placeholder
      const psa10ProbAdj = 0.16 // Placeholder
      
      // Calculate confidence
      const confidence = calculateConfidence(
        latest.psa10_n || 0,
        0, // IQR width placeholder
        latest.psa10_median || 0
      )

      // Upsert historical data
      const { error: upsertError } = await supabaseAdmin
        .from('facts_historical')
        .upsert({
          card_id: cardId,
          asof: new Date().toISOString().split('T')[0],
          period_days: periodDays,
          raw_delta: rawDelta,
          psa9_delta: 0, // Placeholder
          psa10_delta: psa10Delta,
          volume_score: volumeScore,
          pop10_delta: pop10Delta,
          spread_after_fees: spreadAfterFees,
          psa10_prob_lifetime: psa10ProbLifetime,
          psa10_prob_rolling: psa10ProbRolling,
          psa10_prob_adj: psa10ProbAdj,
          confidence
        }, {
          onConflict: 'card_id,asof,period_days'
        })

      if (upsertError) {
        throw new Error(`Failed to upsert historical data: ${upsertError.message}`)
      }

    } catch (error) {
      console.error(`Failed to update historical data for card ${cardId}:`, error)
      // Continue with other cards
    }
  }

  /**
   * Calculate profit/loss rankings for all periods
   */
  private async calculateProfitLossRankings(): Promise<void> {
    console.log('Calculating profit/loss rankings...')
    
    for (const period of this.config.periods) {
      // Get all cards for this period, ordered by spread_after_fees
      const { data: cards, error } = await supabaseAdmin
        .from('facts_historical')
        .select('card_id, spread_after_fees')
        .eq('period_days', period)
        .eq('asof', new Date().toISOString().split('T')[0])
        .order('spread_after_fees', { ascending: false })

      if (error) {
        throw new Error(`Failed to get cards for ranking: ${error.message}`)
      }

      if (!cards || cards.length === 0) {
        continue
      }

      // Update rankings
      const updates = cards.map((card, index) => ({
        card_id: card.card_id,
        asof: new Date().toISOString().split('T')[0],
        period_days: period,
        profit_loss_rank: index + 1
      }))

      const { error: updateError } = await supabaseAdmin
        .from('facts_historical')
        .upsert(updates, {
          onConflict: 'card_id,asof,period_days'
        })

      if (updateError) {
        throw new Error(`Failed to update rankings: ${updateError.message}`)
      }

      console.log(`Updated rankings for ${cards.length} cards in ${period}-day period`)
    }
  }

  /**
   * Send weekly market update emails
   */
  private async sendMarketUpdateEmails(): Promise<void> {
    console.log('Sending weekly market update emails...')
    
    try {
      const result = await emailService.sendWeeklyUpdates()
      console.log(`Market update emails sent: ${result.successfulSends} successful, ${result.failedSends} failed`)
    } catch (error) {
      console.error('Failed to send market update emails:', error)
      // Don't throw - email failure shouldn't stop the weekly update
    }
  }
}

// CLI execution
if (require.main === module) {
  const service = new WeeklyUpdateService({
    periods: [7, 30, 90],
    batchSize: 100
  })

  service.run()
    .then(() => {
      console.log('Weekly update completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Weekly update failed:', error)
      process.exit(1)
    })
}

export { WeeklyUpdateService }
