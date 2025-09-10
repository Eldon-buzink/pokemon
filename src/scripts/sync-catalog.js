/**
 * Pokemon TCG Catalog Sync Script
 * Pulls card catalog data and images from Pokemon TCG API
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const pokemonTcgApiKey = process.env.POKEMON_TCG_API_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

class CatalogSyncService {
  constructor() {
    this.baseUrl = process.env.POKEMON_TCG_API_URL || 'https://api.pokemontcg.io/v2'
    this.headers = {}
    if (pokemonTcgApiKey && pokemonTcgApiKey !== 'your_pokemon_tcg_api_key') {
      this.headers['X-Api-Key'] = pokemonTcgApiKey
    }
  }

  async syncCatalog() {
    console.log('🚀 Starting Pokemon TCG catalog sync...')
    
    try {
      // 1. Sync sets first
      console.log('📋 Syncing sets...')
      await this.syncSets()
      
      // 2. Sync cards from recent sets
      console.log('🃏 Syncing cards from recent sets...')
      await this.syncRecentCards()
      
      console.log('✅ Catalog sync completed successfully!')
    } catch (error) {
      console.error('❌ Catalog sync failed:', error)
      throw error
    }
  }

  async syncSets() {
    let page = 1
    let hasMore = true
    
    while (hasMore) {
      const url = `${this.baseUrl}/sets?page=${page}&pageSize=100`
      const response = await fetch(url, { headers: this.headers })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sets: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        // Process sets
        for (const set of data.data) {
          await this.processSet(set)
        }
        
        console.log(`📋 Processed ${data.data.length} sets from page ${page}`)
        page++
        hasMore = data.data.length === 100
      } else {
        hasMore = false
      }
    }
  }

  async processSet(set) {
    // Store set information (we'll use this for filtering)
    console.log(`📦 Processing set: ${set.name}`)
    
    // For now, we'll just log the set info
    // In a full implementation, you might want to store set metadata
  }

  async syncRecentCards() {
    // Get the most recent 5 sets and sync their cards
    const recentSets = await this.getRecentSets(5)
    
    for (const set of recentSets) {
      console.log(`🃏 Syncing cards from ${set.name}...`)
      await this.syncCardsFromSet(set.id)
    }
  }

  async getRecentSets(limit = 5) {
    const url = `${this.baseUrl}/sets?page=1&pageSize=${limit}&orderBy=-releaseDate`
    const response = await fetch(url, { headers: this.headers })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recent sets: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.data || []
  }

  async syncCardsFromSet(setId) {
    let page = 1
    let hasMore = true
    let totalCards = 0
    
    while (hasMore) {
      const url = `${this.baseUrl}/cards?q=set.id:${setId}&page=${page}&pageSize=100`
      const response = await fetch(url, { headers: this.headers })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cards for set ${setId}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        // Process cards
        for (const card of data.data) {
          await this.processCard(card)
          totalCards++
        }
        
        console.log(`  📄 Processed ${data.data.length} cards from page ${page}`)
        page++
        hasMore = data.data.length === 100
      } else {
        hasMore = false
      }
    }
    
    console.log(`  ✅ Total cards synced from set: ${totalCards}`)
  }

  async processCard(card) {
    try {
      // Create card ID (using Pokemon TCG API ID)
      const cardId = card.id
      
      // Insert/update card record
      const { error: cardError } = await supabase
        .from('cards')
        .upsert({
          card_id: cardId,
          set_id: card.set.id,
          number: card.number,
          name: card.name,
          rarity: card.rarity,
          lang: card.lang || 'EN',
          edition: card.set.name
        }, {
          onConflict: 'card_id'
        })
      
      if (cardError) {
        throw new Error(`Failed to insert card: ${cardError.message}`)
      }
      
      // Insert/update card assets
      const { error: assetError } = await supabase
        .from('card_assets')
        .upsert({
          card_id: cardId,
          tcgio_id: card.id,
          set_name: card.set.name,
          release_date: card.set.releaseDate,
          rarity: card.rarity,
          image_url_small: card.images?.small,
          image_url_large: card.images?.large,
          last_catalog_sync: new Date().toISOString()
        }, {
          onConflict: 'card_id'
        })
      
      if (assetError) {
        throw new Error(`Failed to insert card assets: ${assetError.message}`)
      }
      
    } catch (error) {
      console.error(`❌ Failed to process card ${card.name}:`, error.message)
      // Continue with other cards
    }
  }
}

// CLI execution
if (require.main === module) {
  const service = new CatalogSyncService()
  
  service.syncCatalog()
    .then(() => {
      console.log('🎉 Catalog sync completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Catalog sync failed:', error)
      process.exit(1)
    })
}

module.exports = { CatalogSyncService }
