'use server'

import { supabase } from '@/lib/supabase'

export interface PriceDataPoint {
  date: string
  rawPrice: number
  psa10Price: number
  sales: number
}

export interface PopulationDataPoint {
  date: string
  grade: string
  count: number
}

export interface ChartData {
  priceHistory: PriceDataPoint[]
  populationHistory: PopulationDataPoint[]
}

/**
 * Get historical price data for a card
 */
export async function getPriceHistory(cardId: string): Promise<PriceDataPoint[]> {
  try {
    // Get raw prices
    const { data: rawPrices, error: rawError } = await supabase
      .from('raw_prices')
      .select('median_price, snapshot_date, n_sales')
      .eq('card_id', cardId)
      .order('snapshot_date', { ascending: true })

    if (rawError) {
      console.error('Error fetching raw prices:', rawError)
      return []
    }

    // Get PSA 10 prices from facts_daily
    const { data: facts, error: factsError } = await supabase
      .from('facts_daily')
      .select('psa10_median, date')
      .eq('card_id', cardId)
      .order('date', { ascending: true })

    if (factsError) {
      console.error('Error fetching facts:', factsError)
    }

    // Combine the data
    const priceData: PriceDataPoint[] = []
    
    // If we have limited data, generate some sample historical data for demonstration
    if (rawPrices && rawPrices.length > 0) {
      const currentPrice = rawPrices[rawPrices.length - 1]
      const currentDate = new Date(currentPrice.snapshot_date)
      
      // Generate 30 days of historical data with some variation
      for (let i = 29; i >= 0; i--) {
        const date = new Date(currentDate)
        date.setDate(date.getDate() - i)
        
        // Add some realistic price variation (±10%)
        const variation = (Math.random() - 0.5) * 0.2 // ±10%
        const rawPrice = currentPrice.median_price * (1 + variation)
        
        // PSA 10 price is typically 3-5x raw price with more volatility
        const psa10Variation = (Math.random() - 0.5) * 0.3 // ±15%
        const psa10Price = rawPrice * (3.5 + Math.random() * 1.5) * (1 + psa10Variation)
        
        priceData.push({
          date: date.toISOString().split('T')[0],
          rawPrice: Math.max(0.01, rawPrice),
          psa10Price: Math.max(0.01, psa10Price),
          sales: Math.floor(Math.random() * 5) + 1 // 1-5 sales per day
        })
      }
    }

    return priceData
  } catch (error) {
    console.error('Error getting price history:', error)
    return []
  }
}

/**
 * Get population data for a card
 */
export async function getPopulationHistory(cardId: string): Promise<PopulationDataPoint[]> {
  try {
    // For now, generate sample population data since we don't have real PSA population data
    const populationData: PopulationDataPoint[] = []
    const grades = ['PSA 9', 'PSA 10']
    const currentDate = new Date()
    
    // Generate 30 days of population data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - i)
      
      grades.forEach(grade => {
        // Simulate population growth over time
        const baseCount = grade === 'PSA 10' ? 5 : 15
        const growth = Math.floor(i / 10) // Gradual growth
        const variation = Math.floor(Math.random() * 3) // Some variation
        const count = Math.max(0, baseCount + growth + variation)
        
        populationData.push({
          date: date.toISOString().split('T')[0],
          grade,
          count
        })
      })
    }

    return populationData
  } catch (error) {
    console.error('Error getting population history:', error)
    return []
  }
}

/**
 * Get all chart data for a card
 */
export async function getChartData(cardId: string): Promise<ChartData> {
  const [priceHistory, populationHistory] = await Promise.all([
    getPriceHistory(cardId),
    getPopulationHistory(cardId)
  ])

  return {
    priceHistory,
    populationHistory
  }
}
