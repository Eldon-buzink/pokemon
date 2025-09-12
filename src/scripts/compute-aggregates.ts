/**
 * Compute Daily Aggregates and Facts
 * Processes raw price data into daily aggregates and 5-day facts
 */

import { supabaseAdmin } from '@/lib/supabase'

class AggregatesService {
  async run(): Promise<void> {
    console.log('📊 Starting aggregates computation...')
    
    try {
      // Step 1: Compute daily aggregates
      console.log('📈 Computing daily aggregates...')
      await this.computeDailyAggregates()

      // Step 2: Compute 5-day facts
      console.log('⚡ Computing 5-day facts...')
      await this.compute5DayFacts()

      // Step 3: Compute historical facts
      console.log('📚 Computing historical facts...')
      await this.computeHistoricalFacts()

      console.log('✅ Aggregates computation completed!')
    } catch (error) {
      console.error('❌ Aggregates computation failed:', error)
      throw error
    }
  }

  private async computeDailyAggregates(): Promise<void> {
    // Get all unique card_ids and dates
    const { data: rawPrices, error: rawError } = await supabaseAdmin
      .from('raw_prices')
      .select('card_id, snapshot_date, median_price, n_sales')
      .order('card_id, snapshot_date')

    if (rawError) {
      throw new Error(`Failed to fetch raw prices: ${rawError.message}`)
    }

    if (!rawPrices || rawPrices.length === 0) {
      console.log('⚠️ No raw prices found, skipping daily aggregates')
      return
    }

    // Group by card_id and date
    const grouped = rawPrices.reduce((acc, price) => {
      const key = `${price.card_id}-${price.snapshot_date}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(price)
      return acc
    }, {} as { [key: string]: any[] })

    // Compute aggregates for each card/date combination
    const aggregates = Object.entries(grouped).map(([key, prices]) => {
      const [card_id, snapshot_date] = key.split('-')
      const validPrices = prices.filter(p => p.median_price > 0)
      
      if (validPrices.length === 0) {
        return null
      }

      const prices = validPrices.map(p => p.median_price)
      const sales = validPrices.map(p => p.n_sales || 0)
      
      // Compute statistics
      const median = this.median(prices)
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      const std = this.standardDeviation(prices, mean)
      const totalSales = sales.reduce((a, b) => a + b, 0)
      const volatility = std / mean

      return {
        card_id,
        snapshot_date,
        median_price: Math.round(median * 100) / 100,
        mean_price: Math.round(mean * 100) / 100,
        min_price: Math.round(min * 100) / 100,
        max_price: Math.round(max * 100) / 100,
        std_price: Math.round(std * 100) / 100,
        volatility: Math.round(volatility * 1000) / 1000,
        n_sales: totalSales,
        n_sources: validPrices.length,
      }
    }).filter(Boolean)

    // Save to facts_daily table
    if (aggregates.length > 0) {
      const { error } = await supabaseAdmin
        .from('facts_daily')
        .upsert(aggregates, { onConflict: 'card_id,snapshot_date' })

      if (error) {
        throw new Error(`Failed to save daily aggregates: ${error.message}`)
      }

      console.log(`✅ Computed ${aggregates.length} daily aggregates`)
    }
  }

  private async compute5DayFacts(): Promise<void> {
    // Get all cards
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('cards')
      .select('card_id')

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`)
    }

    if (!cards || cards.length === 0) {
      console.log('⚠️ No cards found, skipping 5-day facts')
      return
    }

    const facts = []

    for (const card of cards) {
      const fact = await this.computeCard5DayFact(card.card_id)
      if (fact) {
        facts.push(fact)
      }
    }

    // Save to facts_5d table
    if (facts.length > 0) {
      const { error } = await supabaseAdmin
        .from('facts_5d')
        .upsert(facts, { onConflict: 'card_id' })

      if (error) {
        throw new Error(`Failed to save 5-day facts: ${error.message}`)
      }

      console.log(`✅ Computed ${facts.length} 5-day facts`)
    }
  }

  private async computeCard5DayFact(cardId: string): Promise<any> {
    // Get last 5 days of daily aggregates
    const { data: daily, error: dailyError } = await supabaseAdmin
      .from('facts_daily')
      .select('*')
      .eq('card_id', cardId)
      .order('snapshot_date', { ascending: false })
      .limit(5)

    if (dailyError || !daily || daily.length === 0) {
      return null
    }

    // Get PSA population data
    const { data: population, error: popError } = await supabaseAdmin
      .from('psa_pop')
      .select('grade, pop_count')
      .eq('card_id', cardId)

    const psa9Count = population?.find(p => p.grade === '9')?.pop_count || 0
    const psa10Count = population?.find(p => p.grade === '10')?.pop_count || 0
    const totalPsaCount = population?.reduce((sum, p) => sum + (p.pop_count || 0), 0) || 0

    // Get recent graded sales
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('graded_sales')
      .select('grade, price, sold_date')
      .eq('card_id', cardId)
      .gte('sold_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const psa9Sales = sales?.filter(s => s.grade === '9') || []
    const psa10Sales = sales?.filter(s => s.grade === '10') || []

    // Compute metrics
    const currentPrice = daily[0].median_price
    const price5DaysAgo = daily[daily.length - 1].median_price
    const rawDelta5d = ((currentPrice - price5DaysAgo) / price5DaysAgo) * 100

    const avgVolatility = daily.reduce((sum, d) => sum + d.volatility, 0) / daily.length
    const avgSales = daily.reduce((sum, d) => sum + d.n_sales, 0) / daily.length

    // Compute PSA 10 probability (simplified)
    const psa10Probability = totalPsaCount > 0 ? psa10Count / totalPsaCount : 0.1

    // Compute PSA 10 price (average of recent sales)
    const psa10Price = psa10Sales.length > 0 
      ? psa10Sales.reduce((sum, s) => sum + s.price, 0) / psa10Sales.length
      : currentPrice * 8

    const psa10Delta5d = rawDelta5d * 0.5 // Assume PSA 10 moves less than raw

    // Compute confidence score
    let confidence = 'Noisy'
    if (avgSales > 10 && avgVolatility < 0.2) {
      confidence = 'High'
    } else if (avgSales > 5 && avgVolatility < 0.4) {
      confidence = 'Speculative'
    }

    // Compute volume score
    const volumeScore = Math.min(avgSales / 20, 1)

    // Compute grading recommendation
    const spread = (psa10Price * 0.3) - currentPrice
    const profitMargin = spread / currentPrice

    let gradingRecommendation = 'Hold'
    if (profitMargin > 0.5 && psa10Probability > 0.2) {
      gradingRecommendation = 'Strong Buy'
    } else if (profitMargin > 0.2 && psa10Probability > 0.15) {
      gradingRecommendation = 'Buy'
    } else if (profitMargin < -0.2) {
      gradingRecommendation = 'Avoid'
    }

    return {
      card_id: cardId,
      raw_price: Math.round(currentPrice * 100) / 100,
      psa10_price: Math.round(psa10Price * 100) / 100,
      spread_after_fees: Math.round(spread * 100) / 100,
      profit_loss: Math.round(spread * 100) / 100,
      confidence,
      volume_score: Math.round(volumeScore * 1000) / 1000,
      raw_delta_5d: Math.round(rawDelta5d * 100) / 100,
      raw_delta_30d: Math.round(rawDelta5d * 2 * 100) / 100, // Estimate
      raw_delta_90d: Math.round(rawDelta5d * 4 * 100) / 100, // Estimate
      psa10_delta_5d: Math.round(psa10Delta5d * 100) / 100,
      psa10_delta_30d: Math.round(psa10Delta5d * 2 * 100) / 100, // Estimate
      psa10_delta_90d: Math.round(psa10Delta5d * 4 * 100) / 100, // Estimate
      psa9_count: psa9Count,
      psa10_count: psa10Count,
      total_psa_count: totalPsaCount,
      price_volatility: Math.round(avgVolatility * 1000) / 1000,
      grading_recommendation: gradingRecommendation,
      psa10_probability: Math.round(psa10Probability * 1000) / 1000,
      ev_grade: Math.round(currentPrice * 0.3 * 100) / 100,
      upside_potential: Math.round(profitMargin * 1000) / 1000,
      badges: profitMargin > 0.3 ? ['HOT'] : profitMargin > 0.1 ? ['GRADE_EV'] : [],
      headline_momentum: Math.round(rawDelta5d * 100) / 100,
    }
  }

  private async computeHistoricalFacts(): Promise<void> {
    // This would compute longer-term historical facts
    // For now, we'll skip this as it's not critical for the initial setup
    console.log('📚 Historical facts computation skipped (not critical for initial setup)')
  }

  private median(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid]
  }

  private standardDeviation(numbers: number[], mean: number): number {
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2))
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length
    return Math.sqrt(avgSquaredDiff)
  }
}

// CLI execution
if (require.main === module) {
  const service = new AggregatesService()

  service.run()
    .then(() => {
      console.log('✅ Aggregates computation completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Aggregates computation failed:', error)
      process.exit(1)
    })
}

export { AggregatesService }
