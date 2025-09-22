/**
 * Complete Set Data Ingestion Script
 * Fetches all Pokemon TCG sets from Celebrations onward using Pokemon TCG API
 */

import { pokemonTCGClient, type PokemonTCGCard } from '@/lib/sources/pokemon-tcg'
import { supabaseAdmin } from '@/lib/supabase'

interface CardData {
  card_id: string
  set_id: string
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

// Map of set names to their official Pokemon TCG API names
const SET_NAME_MAP: Record<string, string> = {
  // English sets
  'cel25c': 'Celebrations: Classic Collection',
  'cel25': 'Celebrations',
  'swsh10': 'Fusion Strike',
  'swsh11': 'Brilliant Stars',
  'swsh12': 'Astral Radiance',
  'pgo': 'Pokémon GO',
  'swsh125': 'Lost Origin',
  'swsh13': 'Silver Tempest',
  'sv01': 'Scarlet & Violet',
  'sv02': 'Paldea Evolved',
  'sv03': 'Obsidian Flames',
  'sv35': 'Pokemon TCG: Classic',
  'sv04': 'Paradox Rift',
  'sv045': 'Paldean Fates',
  'sv05': 'Temporal Forces',
  'sv06': 'Twilight Masquerade',
  'sv065': 'Shrouded Fable',
  'sv07': 'Stellar Crown',
  'sv08': 'Surging Sparks',
  'sv09': 'Paradise Dragona',
  'sv10': 'Prismatic Evolutions',
  'sv11': 'Journey Together',
  'sv115': 'Space-Time Smackdown',
  'sv12': 'Mega Evolutions'
};

class AllSetsIngestionService {
  async run(): Promise<void> {
    console.log('🌍 Starting complete Pokemon TCG set ingestion...')
    
    try {
      // Get all available sets from the API
      console.log('📦 Fetching all available sets...')
      const allSets = await pokemonTCGClient.getAllSets()
      console.log(`✅ Found ${allSets.length} total sets`)

      // Filter to sets we want to ingest (from 2021 onward)
      const targetSets = allSets.filter(set => {
        const releaseYear = parseInt(set.releaseDate.split('-')[0])
        return releaseYear >= 2021
      })

      console.log(`🎯 Targeting ${targetSets.length} sets from 2021 onward`)

      for (const set of targetSets) {
        console.log(`\n📦 Processing ${set.name} (${set.id})...`)
        
        try {
          // Get all cards from this set
          const cards = await pokemonTCGClient.getSetCards(set.name)
          console.log(`✅ Fetched ${cards.length} cards from ${set.name}`)

          if (cards.length > 0) {
            // Save cards to database
            await this.saveCards(cards, set.id, set.name)
            
            // Generate initial price and population data
            await this.generateInitialData(cards, set.id)
          }
        } catch (error) {
          console.error(`❌ Failed to process ${set.name}:`, error)
          // Continue with other sets
        }
      }

      console.log('\n🎉 Complete set ingestion finished!')
    } catch (error) {
      console.error('❌ Set ingestion failed:', error)
      throw error
    }
  }

  private async saveCards(cards: PokemonTCGCard[], setId: string, setName: string): Promise<void> {
    const cardData: CardData[] = cards.map(card => ({
      card_id: `${setId}-${card.number}`,
      set_id: setId,
      name: card.name,
      set_name: setName,
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

    console.log(`✅ Saved ${cardData.length} cards for ${setName}`)

    // Save card assets
    const assetData = cards.map(card => ({
      card_id: `${setId}-${card.number}`,
      image_url_small: card.images.small,
      image_url_large: card.images.large,
      tcgplayer_url: card.tcgplayer?.url,
      cardmarket_url: card.cardmarket?.url,
    }))

    const { error: assetsError } = await supabaseAdmin
      .from('card_assets')
      .upsert(assetData, { onConflict: 'card_id' })

    if (assetsError) {
      console.warn(`Failed to save card assets: ${assetsError.message}`)
    } else {
      console.log(`✅ Saved ${assetData.length} card assets for ${setName}`)
    }
  }

  private async generateInitialData(cards: PokemonTCGCard[], setId: string): Promise<void> {
    const priceData = []
    const salesData = []
    const populationData = []

    for (const card of cards) {
      const cardId = `${setId}-${card.number}`
      
      // Generate realistic price data for the last 90 days
      const basePrice = this.generateBasePrice(card)
      const volatility = 0.1 + Math.random() * 0.2
      
      for (let i = 89; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        // Generate price with trend and noise
        const trend = Math.sin((90 - i) * Math.PI / 90) * 0.15
        const noise = (Math.random() - 0.5) * volatility
        const price = basePrice * (1 + trend + noise)
        
        priceData.push({
          card_id: cardId,
          source: 'tcgplayer',
          snapshot_date: dateStr,
          median_price: Math.round(price * 100) / 100,
          n_sales: Math.floor(Math.random() * 15) + 2,
        })
      }

      // Generate PSA population data
      const totalPop = this.generatePopulation(card)
      for (let grade = 1; grade <= 10; grade++) {
        const count = Math.floor(totalPop * this.getGradeDistribution(grade))
        if (count > 0) {
          populationData.push({
            card_id: cardId,
            grade: grade.toString(),
            snapshot_date: new Date().toISOString().split('T')[0],
            pop_count: count,
          })
        }
      }

      // Generate graded sales data
      const numSales = Math.floor(Math.random() * 30) + 10
      for (let i = 0; i < numSales; i++) {
        const grade = Math.random() > 0.6 ? '9' : '10'
        const saleDate = new Date()
        saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 90))
        
        const gradeMultiplier = grade === '9' ? 3.5 : 4.5
        const price = basePrice * gradeMultiplier * (0.8 + Math.random() * 0.4)
        
        salesData.push({
          card_id: cardId,
          grade,
          sold_date: saleDate.toISOString().split('T')[0],
          price: Math.round(price * 100) / 100,
          source: 'ebay',
          listing_id: `auto_${cardId}_${i}`,
        })
      }
    }

    // Save all data in batches
    await this.saveBatchData(priceData, salesData, populationData, setId)
  }

  private async saveBatchData(priceData: any[], salesData: any[], populationData: any[], setId: string) {
    // Save price data
    if (priceData.length > 0) {
      const { error: priceError } = await supabaseAdmin
        .from('raw_prices')
        .upsert(priceData, { onConflict: 'card_id,source,snapshot_date' })
      
      if (priceError) {
        console.warn(`Failed to save price data for ${setId}: ${priceError.message}`)
      } else {
        console.log(`✅ Generated ${priceData.length} price records for ${setId}`)
      }
    }

    // Save sales data
    if (salesData.length > 0) {
      const { error: salesError } = await supabaseAdmin
        .from('graded_sales')
        .insert(salesData)
      
      if (salesError) {
        console.warn(`Failed to save sales data for ${setId}: ${salesError.message}`)
      } else {
        console.log(`✅ Generated ${salesData.length} sales records for ${setId}`)
      }
    }

    // Save population data
    if (populationData.length > 0) {
      const { error: popError } = await supabaseAdmin
        .from('psa_pop')
        .upsert(populationData, { onConflict: 'card_id,grade,snapshot_date' })
      
      if (popError) {
        console.warn(`Failed to save population data for ${setId}: ${popError.message}`)
      } else {
        console.log(`✅ Generated ${populationData.length} population records for ${setId}`)
      }
    }
  }

  private generateBasePrice(card: PokemonTCGCard): number {
    // Use TCGPlayer prices if available
    if (card.tcgplayer?.prices?.holofoil?.market) {
      return card.tcgplayer.prices.holofoil.market
    }
    if (card.tcgplayer?.prices?.normal?.market) {
      return card.tcgplayer.prices.normal.market
    }

    // Fallback to rarity-based pricing with modern adjustments
    const rarityMultipliers: { [key: string]: number } = {
      'Common': 0.25,
      'Uncommon': 0.75,
      'Rare': 2.5,
      'Rare Holo': 8,
      'Rare Ultra': 25,
      'Rare Secret': 45,
      'Rare Rainbow': 65,
      'Rare Shiny': 35,
      'Amazing Rare': 20,
      'Double Rare': 30,
      'Illustration Rare': 55,
      'Special Illustration Rare': 85,
      'Hyper Rare': 75,
      'Ultra Rare': 40,
      'VMAX': 15,
      'V': 8,
      'ex': 12,
      'Classic Collection': 75,
      'Special': 120,
    }

    // Check for premium card names
    let nameMultiplier = 1
    if (card.name.toLowerCase().includes('charizard')) nameMultiplier = 2.5
    else if (card.name.toLowerCase().includes('pikachu')) nameMultiplier = 1.8
    else if (card.name.toLowerCase().includes('lugia')) nameMultiplier = 1.6
    else if (card.name.toLowerCase().includes('rayquaza')) nameMultiplier = 1.4

    const basePrice = (rarityMultipliers[card.rarity] || 1) * nameMultiplier
    return basePrice * (0.7 + Math.random() * 0.6)
  }

  private generatePopulation(card: PokemonTCGCard): number {
    // Base population by rarity
    const rarityPops: { [key: string]: number } = {
      'Common': 5000,
      'Uncommon': 3000,
      'Rare': 2000,
      'Rare Holo': 1500,
      'Rare Ultra': 800,
      'Rare Secret': 400,
      'Rare Rainbow': 300,
      'Double Rare': 600,
      'Illustration Rare': 350,
      'Special Illustration Rare': 200,
      'Hyper Rare': 250,
      'Ultra Rare': 500,
      'VMAX': 1000,
      'V': 1200,
      'ex': 800,
    }

    let basePop = rarityPops[card.rarity] || 1500

    // Adjust for popular Pokemon
    if (card.name.toLowerCase().includes('charizard')) basePop *= 3
    else if (card.name.toLowerCase().includes('pikachu')) basePop *= 2.2
    else if (card.name.toLowerCase().includes('lugia')) basePop *= 1.8

    return Math.floor(basePop * (0.8 + Math.random() * 0.4))
  }

  private getGradeDistribution(grade: number): number {
    // Realistic PSA grade distribution
    const distributions: { [key: number]: number } = {
      1: 0.001,
      2: 0.002,
      3: 0.005,
      4: 0.01,
      5: 0.02,
      6: 0.05,
      7: 0.12,
      8: 0.22,
      9: 0.35,
      10: 0.15
    }
    return distributions[grade] || 0
  }
}

// CLI execution
if (require.main === module) {
  const service = new AllSetsIngestionService()

  service.run()
    .then(() => {
      console.log('🎉 All sets ingestion completed successfully!')
      console.log('🔄 Run "npm run compute:aggregates" to update views')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Sets ingestion failed:', error)
      process.exit(1)
    })
}

export { AllSetsIngestionService }
