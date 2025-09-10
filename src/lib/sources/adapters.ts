/**
 * Data Source Adapters
 * Modular interfaces for different data sources (PPT, Cardmarket, eBay, PSA, etc.)
 */

// Base interfaces for all data sources
export interface PriceData {
  card_id: string
  date: string
  price: number
  source: string
}

export interface GradedSale {
  card_id: string
  grade: number
  sold_date: string
  price: number
  source: string
  listing_id?: string
}

export interface PopulationData {
  card_id: string
  grade: number
  pop_count: number
  snapshot_date: string
  source: string
}

// Adapter interface for price data sources
export interface PriceDataAdapter {
  getRawPrices(cardId: string, days: number): Promise<PriceData[]>
  getGradedSales(cardId: string, grade: number, days: number): Promise<GradedSale[]>
  getRecentPrices(days: number): Promise<PriceData[]>
}

// Adapter interface for population data sources
export interface PopulationDataAdapter {
  getPopulationData(cardId: string): Promise<PopulationData[]>
  getAllPopulationData(): Promise<PopulationData[]>
}

// Combined adapter interface
export interface DataSourceAdapter extends PriceDataAdapter, PopulationDataAdapter {
  readonly sourceName: string
  readonly quotaStatus?: { used: number; remaining: number; resetDate: string }
}

// Cardmarket adapter (future expansion)
export class CardmarketAdapter implements DataSourceAdapter {
  readonly sourceName = 'cardmarket'
  
  async getRawPrices(cardId: string, days: number): Promise<PriceData[]> {
    // TODO: Implement Cardmarket API integration
    return []
  }
  
  async getGradedSales(cardId: string, grade: number, days: number): Promise<GradedSale[]> {
    // TODO: Implement Cardmarket graded sales
    return []
  }
  
  async getRecentPrices(days: number): Promise<PriceData[]> {
    // TODO: Implement Cardmarket recent prices
    return []
  }
  
  async getPopulationData(cardId: string): Promise<PopulationData[]> {
    // Cardmarket doesn't have population data
    return []
  }
  
  async getAllPopulationData(): Promise<PopulationData[]> {
    return []
  }
}

// eBay adapter (future expansion)
export class EbayAdapter implements DataSourceAdapter {
  readonly sourceName = 'ebay'
  
  async getRawPrices(cardId: string, days: number): Promise<PriceData[]> {
    // TODO: Implement eBay sold listings API
    return []
  }
  
  async getGradedSales(cardId: string, grade: number, days: number): Promise<GradedSale[]> {
    // TODO: Implement eBay graded sales
    return []
  }
  
  async getRecentPrices(days: number): Promise<PriceData[]> {
    // TODO: Implement eBay recent prices
    return []
  }
  
  async getPopulationData(cardId: string): Promise<PopulationData[]> {
    // eBay doesn't have population data
    return []
  }
  
  async getAllPopulationData(): Promise<PopulationData[]> {
    return []
  }
}

// PSA adapter (future expansion)
export class PSAAdapter implements DataSourceAdapter {
  readonly sourceName = 'psa'
  
  async getRawPrices(cardId: string, days: number): Promise<PriceData[]> {
    // PSA doesn't have raw price data
    return []
  }
  
  async getGradedSales(cardId: string, grade: number, days: number): Promise<GradedSale[]> {
    // TODO: Implement PSA sales data
    return []
  }
  
  async getRecentPrices(days: number): Promise<PriceData[]> {
    return []
  }
  
  async getPopulationData(cardId: string): Promise<PopulationData[]> {
    // TODO: Implement PSA population data
    return []
  }
  
  async getAllPopulationData(): Promise<PopulationData[]> {
    // TODO: Implement PSA population data for all cards
    return []
  }
}

// Data source registry
export class DataSourceRegistry {
  private adapters: Map<string, DataSourceAdapter> = new Map()
  
  register(adapter: DataSourceAdapter): void {
    this.adapters.set(adapter.sourceName, adapter)
  }
  
  get(sourceName: string): DataSourceAdapter | undefined {
    return this.adapters.get(sourceName)
  }
  
  getAll(): DataSourceAdapter[] {
    return Array.from(this.adapters.values())
  }
  
  getPriceDataAdapters(): PriceDataAdapter[] {
    return this.getAll()
  }
  
  getPopulationDataAdapters(): PopulationDataAdapter[] {
    return this.getAll()
  }
}

// Global registry instance
export const dataSourceRegistry = new DataSourceRegistry()
