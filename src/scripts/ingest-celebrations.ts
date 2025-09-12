/**
 * Celebrations Set Data Ingestion Script
 * Fetches all Celebrations cards from Pokemon TCG API and populates the database
 */

import { pokemonTCGClient, type PokemonTCGCard } from '@/lib/sources/pokemon-tcg'
import { supabaseAdmin } from '@/lib/supabase'

interface CardData {
  card_id: string
  name: string
  set_name: string
  number: string
  rarity: string
  image_url_small: string
  image_url_large: string
  tcgplayer_url?: string
  cardmarket_url?: string
  artist?: string
  hp?: string
  types?: string[]
  attacks?: any[]
  weaknesses?: any[]
  resistances?: any[]
  retreat_cost?: string[]
  flavor_text?: string
  national_pokedex_numbers?: number[]
  legalities: any
  tcgplayer_prices?: any
  cardmarket_prices?: any
}

class CelebrationsIngestionService {
  private set_name = 'Celebrations'

  async run(): Promise<void> {
    console.log('🎉 Starting Celebrations set ingestion...')
    
    try {
      // Step 1: Get the set information
      console.log('📦 Fetching set information...')
      const setInfo = await pokemonTCGClient.getSet(this.set_name)
      if (!setInfo) {
        throw new Error(`Set "${this.set_name}" not found`)
      }
      console.log(`✅ Found set: ${setInfo.name} (${setInfo.total} cards)`)

      // Step 2: Get all cards from the set
      console.log('🃏 Fetching all cards from Celebrations set...')
      const cards = await pokemonTCGClient.getSetCards(this.set_name)
      console.log(`✅ Fetched ${cards.length} cards`)

      // Step 3: Transform and save cards
      console.log('💾 Saving cards to database...')
      await this.saveCards(cards)

      // Step 4: Generate initial price data (mock for now)
      console.log('💰 Generating initial price data...')
      await this.generateInitialPriceData(cards)

      console.log('🎉 Celebrations ingestion completed successfully!')
    } catch (error) {
      console.error('❌ Celebrations ingestion failed:', error)
      throw error
    }
  }

  private async saveCards(cards: PokemonTCGCard[]): Promise<void> {
    const cardData: CardData[] = cards.map(card => ({
      card_id: `${this.set_name}-${card.number}`,
      name: card.name,
      set_name: this.set_name,
      number: card.number,
      rarity: card.rarity,
      image_url_small: card.images.small,
      image_url_large: card.images.large,
      tcgplayer_url: card.tcgplayer?.url,
      cardmarket_url: card.cardmarket?.url,
      artist: card.artist,
      hp: card.hp,
      types: card.types,
      attacks: card.attacks,
      weaknesses: card.weaknesses,
      resistances: card.resistances,
      retreat_cost: card.retreatCost,
      flavor_text: card.flavorText,
      national_pokedex_numbers: card.nationalPokedexNumbers,
      legalities: card.legalities,
      tcgplayer_prices: card.tcgplayer?.prices,
      cardmarket_prices: card.cardmarket?.prices,
    }))

    // Save cards
    const { error: cardsError } = await supabaseAdmin
      .from('cards')
      .upsert(cardData, { onConflict: 'card_id' })

    if (cardsError) {
      throw new Error(`Failed to save cards: ${cardsError.message}`)
    }

    console.log(`✅ Saved ${cardData.length} cards`)

    // Save card assets
    const assetData = cards.map(card => ({
      card_id: `${this.set_name}-${card.number}`,
      image_url_small: card.images.small,
      image_url_large: card.images.large,
      tcgplayer_url: card.tcgplayer?.url,
      cardmarket_url: card.cardmarket?.url,
    }))

    const { error: assetsError } = await supabaseAdmin
      .from('card_assets')
      .upsert(assetData, { onConflict: 'card_id' })

    if (assetsError) {
      throw new Error(`Failed to save card assets: ${assetsError.message}`)
    }

    console.log(`✅ Saved ${assetData.length} card assets`)
  }

  private async generateInitialPriceData(cards: PokemonTCGCard[]): Promise<void> {
    const priceData = []
    const salesData = []
    const populationData = []

    for (const card of cards) {
      const cardId = `${this.set_name}-${card.number}`
      
      // Generate mock price data for the last 30 days
      const basePrice = this.generateBasePrice(card)
      const volatility = 0.1 + Math.random() * 0.3
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        // Generate price with some trend and noise
        const trend = Math.sin((30 - i) * Math.PI / 30) * 0.1
        const noise = (Math.random() - 0.5) * volatility
        const price = basePrice * (1 + trend + noise)
        
        priceData.push({
          card_id: cardId,
          source: 'mock',
          snapshot_date: dateStr,
          median_price: Math.round(price * 100) / 100,
          n_sales: Math.floor(Math.random() * 10) + 1,
        })
      }

      // Generate mock PSA population data
      const totalPop = Math.floor(Math.random() * 1000) + 100
      for (let grade = 1; grade <= 10; grade++) {
        const count = Math.floor(totalPop * Math.pow(0.7, grade - 1))
        if (count > 0) {
          populationData.push({
            card_id: cardId,
            grade: grade.toString(),
            snapshot_date: new Date().toISOString().split('T')[0],
            pop_count: count,
          })
        }
      }

      // Generate mock graded sales
      const numSales = Math.floor(Math.random() * 20) + 5
      for (let i = 0; i < numSales; i++) {
        const grade = Math.random() > 0.5 ? '9' : '10'
        const saleDate = new Date()
        saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 30))
        
        const gradeMultiplier = grade === '9' ? 3 : 8
        const price = basePrice * gradeMultiplier * (0.8 + Math.random() * 0.4)
        
        salesData.push({
          card_id: cardId,
          grade,
          sold_date: saleDate.toISOString().split('T')[0],
          price: Math.round(price * 100) / 100,
          source: 'mock',
          listing_id: `mock_${cardId}_${i}`,
        })
      }
    }

    // Save price data
    if (priceData.length > 0) {
      const { error: priceError } = await supabaseAdmin
        .from('raw_prices')
        .upsert(priceData, { onConflict: 'card_id,source,snapshot_date' })
      
      if (priceError) {
        console.warn(`Failed to save price data: ${priceError.message}`)
      } else {
        console.log(`✅ Generated ${priceData.length} price records`)
      }
    }

    // Save sales data
    if (salesData.length > 0) {
      const { error: salesError } = await supabaseAdmin
        .from('graded_sales')
        .insert(salesData)
      
      if (salesError) {
        console.warn(`Failed to save sales data: ${salesError.message}`)
      } else {
        console.log(`✅ Generated ${salesData.length} sales records`)
      }
    }

    // Save population data
    if (populationData.length > 0) {
      const { error: popError } = await supabaseAdmin
        .from('psa_pop')
        .upsert(populationData, { onConflict: 'card_id,grade,snapshot_date' })
      
      if (popError) {
        console.warn(`Failed to save population data: ${popError.message}`)
      } else {
        console.log(`✅ Generated ${populationData.length} population records`)
      }
    }
  }

  private generateBasePrice(card: PokemonTCGCard): number {
    // Use TCGPlayer prices if available, otherwise generate based on rarity
    if (card.tcgplayer?.prices?.holofoil?.market) {
      return card.tcgplayer.prices.holofoil.market
    }
    if (card.tcgplayer?.prices?.normal?.market) {
      return card.tcgplayer.prices.normal.market
    }

    // Fallback to rarity-based pricing
    const rarityMultipliers: { [key: string]: number } = {
      'Common': 0.5,
      'Uncommon': 1,
      'Rare': 2,
      'Rare Holo': 5,
      'Rare Ultra': 10,
      'Rare Secret': 20,
      'Rare Rainbow': 30,
      'Rare Shiny': 25,
      'Amazing Rare': 15,
      'Classic Collection': 50,
      'Special': 100,
    }

    const basePrice = rarityMultipliers[card.rarity] || 1
    return basePrice * (0.5 + Math.random())
  }
}

// CLI execution
if (require.main === module) {
  const service = new CelebrationsIngestionService()

  service.run()
    .then(() => {
      console.log('🎉 Celebrations ingestion completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Celebrations ingestion failed:', error)
      process.exit(1)
    })
}

export { CelebrationsIngestionService }
