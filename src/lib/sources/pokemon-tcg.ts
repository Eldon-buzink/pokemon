/**
 * Pokemon TCG API Client
 * Fetches card catalog data from pokemontcg.io
 */

export interface PokemonTCGCard {
  id: string
  name: string
  supertype: string
  subtypes: string[]
  hp?: string
  types?: string[]
  evolvesFrom?: string
  evolvesTo?: string[]
  rules?: string[]
  ancientTrait?: {
    name: string
    text: string
  }
  abilities?: Array<{
    name: string
    text: string
    type: string
  }>
  attacks?: Array<{
    cost: string[]
    name: string
    text?: string
    damage?: string
    convertedEnergyCost?: number
  }>
  weaknesses?: Array<{
    type: string
    value: string
  }>
  resistances?: Array<{
    type: string
    value: string
  }>
  retreatCost?: string[]
  convertedRetreatCost?: number
  set: {
    id: string
    name: string
    series: string
    printedTotal: number
    total: number
    legalities: {
      unlimited: string
      standard?: string
      expanded?: string
    }
    ptcgoCode: string
    releaseDate: string
    updatedAt: string
    images: {
      symbol: string
      logo: string
    }
  }
  number: string
  artist: string
  rarity: string
  flavorText?: string
  nationalPokedexNumbers?: number[]
  legalities: {
    unlimited: string
    standard?: string
    expanded?: string
  }
  images: {
    small: string
    large: string
  }
  tcgplayer?: {
    url: string
    updatedAt: string
    prices: {
      holofoil?: {
        low: number
        mid: number
        high: number
        market: number
        directLow?: number
      }
      normal?: {
        low: number
        mid: number
        high: number
        market: number
        directLow?: number
      }
      reverseHolofoil?: {
        low: number
        mid: number
        high: number
        market: number
        directLow?: number
      }
      '1stEditionHolofoil'?: {
        low: number
        mid: number
        high: number
        market: number
        directLow?: number
      }
      unlimitedHolofoil?: {
        low: number
        mid: number
        high: number
        market: number
        directLow?: number
      }
    }
  }
  cardmarket?: {
    url: string
    updatedAt: string
    prices: {
      averageSellPrice: number
      lowPrice: number
      trendPrice: number
      germanProLow?: number
      suggestedPrice?: number
      reverseHoloSell?: number
      reverseHoloLow?: number
      reverseHoloTrend?: number
      lowPriceExPlus?: number
      avg1?: number
      avg7?: number
      avg30?: number
      reverseHoloAvg1?: number
      reverseHoloAvg7?: number
      reverseHoloAvg30?: number
    }
  }
}

export interface PokemonTCGSet {
  id: string
  name: string
  series: string
  printedTotal: number
  total: number
  legalities: {
    unlimited: string
    standard?: string
    expanded?: string
  }
  ptcgoCode: string
  releaseDate: string
  updatedAt: string
  images: {
    symbol: string
    logo: string
  }
}

export class PokemonTCGClient {
  private baseUrl = 'https://api.pokemontcg.io/v2'
  private apiKey?: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get all cards from a specific set
   */
  async getSetCards(setName: string): Promise<PokemonTCGCard[]> {
    const allCards: PokemonTCGCard[] = []
    let page = 1
    const pageSize = 250

    while (true) {
      const response = await this.request<{
        data: PokemonTCGCard[]
        page: number
        pageSize: number
        count: number
        totalCount: number
      }>(`/cards?q=set.name:"${encodeURIComponent(setName)}"&page=${page}&pageSize=${pageSize}`)

      allCards.push(...response.data)

      if (response.data.length < pageSize) {
        break
      }

      page++
    }

    return allCards
  }

  /**
   * Get a specific set by name
   */
  async getSet(setName: string): Promise<PokemonTCGSet | null> {
    const response = await this.request<{
      data: PokemonTCGSet[]
    }>(`/sets?q=name:"${encodeURIComponent(setName)}"`)

    return response.data[0] || null
  }

  /**
   * Get all sets
   */
  async getAllSets(): Promise<PokemonTCGSet[]> {
    const allSets: PokemonTCGSet[] = []
    let page = 1
    const pageSize = 250

    while (true) {
      const response = await this.request<{
        data: PokemonTCGSet[]
        page: number
        pageSize: number
        count: number
        totalCount: number
      }>(`/sets?page=${page}&pageSize=${pageSize}`)

      allSets.push(...response.data)

      if (response.data.length < pageSize) {
        break
      }

      page++
    }

    return allSets
  }
}

export const pokemonTCGClient = new PokemonTCGClient(process.env.POKEMON_TCG_API_KEY)
