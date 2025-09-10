/**
 * Pokemon Price Tracker API Client
 * Handles daily market data (raw/graded medians, PSA pop)
 * Quota: 20k requests/day - use sparingly for daily updates only
 */

import { pptQuotaManager } from '@/lib/services/quota-manager'

interface PPTConfig {
  apiKey: string
  baseUrl: string
  dailyQuota: number
}

interface PPTCard {
  id: string
  tcgPlayerId: string
  setId: string
  setName: string
  name: string
  cardNumber: string
  totalSetNumber: string
  rarity: string
  cardType: string
  hp?: number
  stage?: string
  attacks?: Array<{
    cost: string[]
    name: string
    damage: string
    text?: string
  }>
  weakness?: {
    type: string
    value: string
  }
  resistance?: {
    type: string
    value: string | null
  }
  retreatCost?: number
  artist?: string
  tcgPlayerUrl: string
  prices: {
    market: number
    listings: number
    primaryCondition: string
    conditions: {
      [condition: string]: {
        price: number
        listings: number
        priceString: string
      }
    }
    lastUpdated: string
    priceWasCorrected: boolean
  }
  imageUrl: string
  needsDetailedScrape: boolean
  dataCompleteness: number
  lastScrapedAt: string
  createdAt: string
  updatedAt: string
  priceHistory?: {
    conditions: {
      [condition: string]: {
        history: Array<{
          date: string
          market: number
          volume: number | null
        }>
        dataPoints: number
        latestPrice: number
        latestDate: string
        priceRange: {
          min: number
          max: number
        }
      }
    }
    conditions_tracked: string[]
    totalDataPoints: number
    earliestDate: string
    latestDate: string
    lastUpdated: string
    createdAt: string
    updatedAt: string
  }
  ebay?: {
    updatedAt: string
    lastScrapedDate: string
    salesByGrade: {
      psa8?: {
        count: number
        totalValue: number
        averagePrice: number
        medianPrice: number
        minPrice: number
        maxPrice: number
        marketPrice7Day: number
        marketPriceMedian7Day: number
        dailyVolume7Day: number
        marketTrend: string
        lastMarketUpdate: string
        smartMarketPrice: {
          price: number
          confidence: string
          method: string
          daysUsed: number
        }
      }
      psa9?: {
        count: number
        totalValue: number
        averagePrice: number
        medianPrice: number
        minPrice: number
        maxPrice: number
        marketPrice7Day: number
        marketPriceMedian7Day: number
        dailyVolume7Day: number
        marketTrend: string
        lastMarketUpdate: string
        smartMarketPrice: {
          price: number
          confidence: string
          method: string
          daysUsed: number
        }
      }
      psa10?: {
        count: number
        totalValue: number
        averagePrice: number
        medianPrice: number
        minPrice: number
        maxPrice: number
        marketPrice7Day: number
        marketPriceMedian7Day: number
        dailyVolume7Day: number
        marketTrend: string
        lastMarketUpdate: string
        smartMarketPrice: {
          price: number
          confidence: string
          method: string
          daysUsed: number
        }
      }
    }
    salesVelocity: {
      dailyAverage: number
      weeklyAverage: number
      monthlyTotal: number
    }
    priceHistory: {
      psa8?: { [date: string]: { average: number; count: number } }
      psa9?: { [date: string]: { average: number; count: number } }
      psa10?: { [date: string]: { average: number; count: number } }
    }
  }
}

interface PPTPriceData {
  card_id: string
  date: string
  median_price: number
  n_sales: number
  source: 'ppt'
}

interface PPTGradedSale {
  card_id: string
  grade: number
  sold_date: string
  price: number
  listing_id?: string
}

interface PSAPopulationData {
  card_id: string
  grade: number
  pop_count: number
  snapshot_date: string
}

export class PPTClient {
  private config: PPTConfig

  constructor(config: PPTConfig) {
    this.config = config
  }

  /**
   * Make a request and track quota usage
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const startTime = Date.now()
    
    if (!pptQuotaManager.canMakeRequest()) {
      throw new Error('Daily quota exceeded for PPT API')
    }
    
    try {
      const url = `${this.config.baseUrl}${endpoint}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`PPT API error: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      
      // Record successful request
      await pptQuotaManager.recordRequest(endpoint, true, Date.now() - startTime)
      
      return result
    } catch (error) {
      // Record failed request
      await pptQuotaManager.recordRequest(
        endpoint, 
        false, 
        Date.now() - startTime, 
        error instanceof Error ? error.message : 'Unknown error'
      )
      
      throw error
    }
  }

  /**
   * Get card data with price history and PSA data from PPT API
   */
  async getCardWithHistory(cardId: string): Promise<PPTCard> {
    const response = await this.makeRequest<{data: PPTCard}>(`/api/v2/cards?tcgPlayerId=${cardId}&includeHistory=true&includeEbay=true&limit=1`)
    if (!response.data) {
      throw new Error(`Card not found: ${cardId}`)
    }
    return response.data
  }

  /**
   * Search for cards by name
   */
  async searchCards(query: string, limit: number = 10): Promise<PPTCard[]> {
    const response = await this.makeRequest<{data: PPTCard[]}>(`/api/v2/cards?search=${encodeURIComponent(query)}&limit=${limit}`)
    return response.data || []
  }

  /**
   * Get cards from a specific set
   */
  async getCardsBySet(setName: string, limit: number = 50): Promise<PPTCard[]> {
    const response = await this.makeRequest<{data: PPTCard[]}>(`/api/v2/cards?set=${encodeURIComponent(setName)}&limit=${limit}`)
    return response.data || []
  }

  /**
   * Get available sets
   */
  async getSets(): Promise<Array<{id: string, name: string}>> {
    const response = await this.makeRequest<{data: Array<{id: string, name: string}>}>(`/api/v2/sets`)
    return response.data || []
  }

  /**
   * Get raw prices for a specific card (daily quota usage)
   * This method extracts price data from the card's price history
   */
  async getRawPrices(cardId: string, days: number = 30): Promise<PPTPriceData[]> {
    const card = await this.getCardWithHistory(cardId)
    const prices: PPTPriceData[] = []
    
    if (card.priceHistory?.conditions) {
      // Extract Near Mint prices (closest to raw/unlimited condition)
      const nearMintCondition = card.priceHistory.conditions['Near Mint']
      if (nearMintCondition?.history) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        
        nearMintCondition.history
          .filter(entry => new Date(entry.date) >= cutoffDate)
          .forEach(entry => {
            prices.push({
              card_id: cardId,
              date: entry.date,
              median_price: entry.market,
              n_sales: entry.volume || 0,
              source: 'ppt'
            })
          })
      }
    }
    
    return prices
  }

  /**
   * Get graded sales for a specific card and grade (daily quota usage)
   * Now extracts PSA data from the eBay section of the PPT API response
   */
  async getGradedSales(cardId: string, grade: number, days: number = 30): Promise<PPTGradedSale[]> {
    const card = await this.getCardWithHistory(cardId)
    const sales: PPTGradedSale[] = []
    
    if (card.ebay?.salesByGrade) {
      const gradeKey = `psa${grade}` as keyof typeof card.ebay.salesByGrade
      const gradeData = card.ebay.salesByGrade[gradeKey]
      
      if (gradeData) {
        // Convert the aggregated PSA data into individual sale records
        // Note: PPT API provides aggregated data, not individual sales
        // We'll create a representative sale record based on the median price
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        
        // Use the median price as a representative sale
        sales.push({
          card_id: cardId,
          grade: grade,
          sold_date: gradeData.lastMarketUpdate,
          price: gradeData.medianPrice,
          listing_id: `ppt_aggregated_${grade}_${cardId}`
        })
      }
    }
    
    return sales
  }

  /**
   * Get PSA 10 price for a specific card
   */
  async getPSA10Price(cardId: string): Promise<number | null> {
    const card = await this.getCardWithHistory(cardId)
    
    if (card.ebay?.salesByGrade?.psa10) {
      // Use the 7-day market price as it's more current than median
      return card.ebay.salesByGrade.psa10.marketPrice7Day
    }
    
    return null
  }

  /**
   * Get PSA population data for a card (daily quota usage)
   * Note: PPT API doesn't provide population data in the current structure
   * This is a placeholder for future implementation
   */
  async getPSAPopulation(cardId: string): Promise<PSAPopulationData[]> {
    // PPT API doesn't currently provide population data
    // Return empty array for now
    return []
  }

  /**
   * Get recent price changes for all cards (high quota usage - use sparingly)
   * This would require multiple API calls and is not efficient with current API structure
   */
  async getAllRecentPrices(days: number = 7): Promise<PPTPriceData[]> {
    // This would require fetching all cards and extracting price data
    // Not efficient with current API structure - return empty array for now
    return []
  }

  /**
   * Get quota status
   */
  getQuotaStatus() {
    return pptQuotaManager.getStatus()
  }
}

export const createPPTClient = (): PPTClient => {
  return new PPTClient({
    apiKey: process.env.PPT_API_KEY!,
    baseUrl: process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com',
    dailyQuota: parseInt(process.env.PPT_DAILY_QUOTA || '20000')
  })
}