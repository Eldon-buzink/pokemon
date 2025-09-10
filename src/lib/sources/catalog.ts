/**
 * Pokemon TCG Catalog API Client
 * Handles static card metadata and images (one-time/new-set syncs)
 */

interface CatalogConfig {
  baseUrl: string
  apiKey?: string
}

interface CatalogCard {
  id: string
  name: string
  set: {
    id: string
    name: string
    releaseDate: string
  }
  number: string
  rarity: string
  images: {
    small: string
    large: string
  }
  tcgplayer?: {
    url: string
    updatedAt: string
  }
}

interface CatalogSet {
  id: string
  name: string
  releaseDate: string
  total: number
}

export class CatalogClient {
  private config: CatalogConfig

  constructor(config: CatalogConfig) {
    this.config = config
  }

  /**
   * Get all sets (for initial catalog sync)
   */
  async getAllSets(): Promise<CatalogSet[]> {
    // TODO: Implement Pokemon TCG API calls
    // This is a placeholder structure
    return []
  }

  /**
   * Get all cards for a specific set
   */
  async getCardsBySet(setId: string): Promise<CatalogCard[]> {
    // TODO: Implement Pokemon TCG API calls
    // This is a placeholder structure
    return []
  }

  /**
   * Get specific card by ID
   */
  async getCard(cardId: string): Promise<CatalogCard | null> {
    // TODO: Implement Pokemon TCG API calls
    // This is a placeholder structure
    return null
  }

  /**
   * Search cards by name or other criteria
   */
  async searchCards(query: string): Promise<CatalogCard[]> {
    // TODO: Implement Pokemon TCG API search
    // This is a placeholder structure
    return []
  }
}

export const createCatalogClient = (): CatalogClient => {
  return new CatalogClient({
    baseUrl: process.env.POKEMON_TCG_API_URL || 'https://api.pokemontcg.io/v2',
    apiKey: process.env.POKEMON_TCG_API_KEY
  })
}
