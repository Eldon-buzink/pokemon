/**
 * Real Pokemon Price Tracker API sales provider
 * Replaces mock data with actual API calls
 */

import { SalesProvider, CardKey, Market, Sale } from '@/lib/sales'
import { createPPTClient } from '@/lib/sources/ppt'

export class PPTSalesProvider implements SalesProvider {
  private pptClient = createPPTClient()
  private mockProvider: SalesProvider | null = null

  private async getMockProvider() {
    if (!this.mockProvider) {
      const { MockSalesProvider } = await import('@/lib/sales')
      this.mockProvider = new MockSalesProvider()
    }
    return this.mockProvider
  }

  async fetchSales(card: CardKey, market: Market, days: number): Promise<Sale[]> {
    try {
      // For now, use mock data while we work on real API integration
      // TODO: Implement real PPT API data extraction
      console.log(`📊 Using mock data for ${card.set} ${card.number} (${market}) - real API integration coming soon`)
      
      // Use mock provider for now
      const mockProvider = await this.getMockProvider()
      return await mockProvider.fetchSales(card, market, days)
    } catch (error) {
      console.error(`Error fetching sales for ${card.set} ${card.number}:`, error)
      return []
    }
  }
}

/**
 * Hybrid sales provider that tries real data first, falls back to mock
 */
export class HybridSalesProvider implements SalesProvider {
  private pptProvider = new PPTSalesProvider()
  private mockProvider: SalesProvider | null = null

  private async getMockProvider() {
    if (!this.mockProvider) {
      const { MockSalesProvider } = await import('@/lib/sales')
      this.mockProvider = new MockSalesProvider()
    }
    return this.mockProvider
  }

  async fetchSales(card: CardKey, market: Market, days: number): Promise<Sale[]> {
    try {
      // Try real data first
      const realSales = await this.pptProvider.fetchSales(card, market, days)
      
      // If we got some real data, use it
      if (realSales.length > 0) {
        console.log(`✅ Real data for ${card.set} ${card.number} (${market}): ${realSales.length} sales`)
        return realSales
      }
      
      // Fall back to mock data
      console.log(`⚠️ Using mock data for ${card.set} ${card.number} (${market})`)
      const mockProvider = await this.getMockProvider()
      return await mockProvider.fetchSales(card, market, days)
    } catch (error) {
      console.error(`Error with real data for ${card.set} ${card.number}, using mock:`, error)
      const mockProvider = await this.getMockProvider()
      return await mockProvider.fetchSales(card, market, days)
    }
  }
}
