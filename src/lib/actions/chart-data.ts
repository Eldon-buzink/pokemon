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
    // For now, generate realistic historical data based on card type
    const priceData: PriceDataPoint[] = []
    const currentDate = new Date()
    
    // Determine base prices based on card ID patterns
    let baseRawPrice = 10
    let basePsa10Price = 50
    
    if (cardId.includes('cel25c')) {
      // Classic Collection cards are more valuable
      baseRawPrice = 20 + Math.random() * 30 // $20-50
      basePsa10Price = 80 + Math.random() * 120 // $80-200
    } else if (cardId.includes('cel25')) {
      // Main Celebrations set
      baseRawPrice = 2 + Math.random() * 8 // $2-10
      basePsa10Price = 15 + Math.random() * 35 // $15-50
    }
    
    // Generate 30 days of historical data with realistic trends
    for (let i = 29; i >= 0; i--) {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - i)
      
      // Add some realistic price variation and trends
      const trendFactor = 1 + (Math.random() - 0.5) * 0.4 // ±20% variation
      const volatilityFactor = 1 + (Math.random() - 0.5) * 0.2 // ±10% daily volatility
      
      const rawPrice = baseRawPrice * trendFactor * volatilityFactor
      const psa10Price = basePsa10Price * trendFactor * volatilityFactor * (1 + (Math.random() - 0.5) * 0.3)
      
      priceData.push({
        date: date.toISOString().split('T')[0],
        rawPrice: Math.max(0.01, rawPrice),
        psa10Price: Math.max(0.01, psa10Price),
        sales: Math.floor(Math.random() * 5) + 1 // 1-5 sales per day
      })
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
    // Generate realistic population data based on card type
    const populationData: PopulationDataPoint[] = []
    const grades = ['PSA 9', 'PSA 10']
    const currentDate = new Date()
    
    // Determine base population based on card type
    let basePsa9Count = 50
    let basePsa10Count = 20
    
    if (cardId.includes('cel25c')) {
      // Classic Collection cards have lower population (rarer)
      basePsa9Count = 30 + Math.random() * 20 // 30-50
      basePsa10Count = 10 + Math.random() * 15 // 10-25
    } else if (cardId.includes('cel25')) {
      // Main Celebrations set has higher population
      basePsa9Count = 100 + Math.random() * 50 // 100-150
      basePsa10Count = 30 + Math.random() * 40 // 30-70
    }
    
    // Generate 30 days of population data with realistic growth
    for (let i = 29; i >= 0; i--) {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - i)
      
      grades.forEach(grade => {
        // Simulate realistic population growth over time
        const baseCount = grade === 'PSA 10' ? basePsa10Count : basePsa9Count
        const growthRate = grade === 'PSA 10' ? 0.8 : 1.2 // PSA 10 grows slower
        const growth = Math.floor((29 - i) * growthRate) // Gradual growth over time
        const variation = Math.floor(Math.random() * 5) - 2 // ±2 variation
        const count = Math.max(0, baseCount - growth + variation)
        
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
