/**
 * PPT Data Ingestion Script
 * Pulls daily market data from Pokemon Price Tracker API
 * Manages quota usage and prioritizes high-volume cards
 */

import { createPPTClient } from '@/lib/sources/ppt'
import { supabaseAdmin } from '@/lib/supabase'
import { pptQuotaManager } from '@/lib/services/quota-manager'

interface IngestConfig {
  batchSize: number
  maxCards: number
  priorityThreshold: number
}

class PPTIngestionService {
  private pptClient = createPPTClient()
  private config: IngestConfig

  constructor(config: IngestConfig) {
    this.config = config
  }

  /**
   * Main ingestion process
   */
  async run(): Promise<void> {
    console.log('Starting PPT data ingestion...')
    
    try {
      // Check quota status
      const quotaStatus = pptQuotaManager.getStatus()
      console.log(`Quota status: ${quotaStatus.used}/${quotaStatus.remaining} (${quotaStatus.percentage}%)`)
      
      if (quotaStatus.status === 'exhausted') {
        console.log('Quota exhausted, skipping ingestion')
        return
      }

      // Get high-priority cards
      const priorityCards = await this.getPriorityCards()
      console.log(`Found ${priorityCards.length} priority cards`)

      // Process in batches
      await this.processBatches(priorityCards)
      
      console.log('PPT ingestion completed successfully')
    } catch (error) {
      console.error('PPT ingestion failed:', error)
      throw error
    }
  }

  /**
   * Get cards to prioritize for ingestion
   */
  private async getPriorityCards(): Promise<string[]> {
    // Get cards with recent activity or high volume
    const { data: cards, error } = await supabaseAdmin
      .from('facts_5d')
      .select('card_id, volume_score, psa10_delta_5d')
      .order('volume_score', { ascending: false })
      .limit(this.config.maxCards)

    if (error) {
      throw new Error(`Failed to get priority cards: ${error.message}`)
    }

    return cards?.map(card => card.card_id) || []
  }

  /**
   * Process cards in batches
   */
  private async processBatches(cardIds: string[]): Promise<void> {
    for (let i = 0; i < cardIds.length; i += this.config.batchSize) {
      const batch = cardIds.slice(i, i + this.config.batchSize)
      
      console.log(`Processing batch ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(cardIds.length / this.config.batchSize)}`)
      
      await Promise.all(
        batch.map(cardId => this.processCard(cardId))
      )
      
      // Check quota after each batch
      const quotaStatus = pptQuotaManager.getStatus()
      if (quotaStatus.status === 'critical' || quotaStatus.status === 'emergency') {
        console.log('Quota critical, stopping ingestion')
        break
      }
      
      // Add delay between batches
      await this.delay(1000)
    }
  }

  /**
   * Process a single card
   */
  private async processCard(cardId: string): Promise<void> {
    try {
      // Get raw prices
      const rawPrices = await this.pptClient.getRawPrices(cardId, 7)
      await this.saveRawPrices(cardId, rawPrices)

      // Get graded sales for PSA 9 and 10
      const [psa9Sales, psa10Sales] = await Promise.all([
        this.pptClient.getGradedSales(cardId, 9, 7),
        this.pptClient.getGradedSales(cardId, 10, 7)
      ])
      
      await this.saveGradedSales(cardId, [...psa9Sales, ...psa10Sales])

      // Get PSA population data
      const populationData = await this.pptClient.getPSAPopulation(cardId)
      await this.savePopulationData(cardId, populationData)

    } catch (error) {
      console.error(`Failed to process card ${cardId}:`, error)
      // Continue with other cards
    }
  }

  /**
   * Save raw prices to database
   */
  private async saveRawPrices(cardId: string, prices: any[]): Promise<void> {
    if (prices.length === 0) return

    const priceRecords = prices.map(price => ({
      card_id: cardId,
      source: 'ppt',
      snapshot_date: price.date,
      median_price: price.median_price,
      n_sales: price.n_sales
    }))

    const { error } = await supabaseAdmin
      .from('raw_prices')
      .upsert(priceRecords, { onConflict: 'card_id,source,snapshot_date' })

    if (error) {
      throw new Error(`Failed to save raw prices: ${error.message}`)
    }
  }

  /**
   * Save graded sales to database
   */
  private async saveGradedSales(cardId: string, sales: any[]): Promise<void> {
    if (sales.length === 0) return

    const saleRecords = sales.map(sale => ({
      card_id: cardId,
      grade: sale.grade,
      sold_date: sale.sold_date,
      price: sale.price,
      source: 'ppt',
      listing_id: sale.listing_id
    }))

    const { error } = await supabaseAdmin
      .from('graded_sales')
      .insert(saleRecords)

    if (error) {
      throw new Error(`Failed to save graded sales: ${error.message}`)
    }
  }

  /**
   * Save population data to database
   */
  private async savePopulationData(cardId: string, population: any[]): Promise<void> {
    if (population.length === 0) return

    const popRecords = population.map(pop => ({
      card_id: cardId,
      grade: pop.grade,
      snapshot_date: pop.snapshot_date,
      pop_count: pop.pop_count
    }))

    const { error } = await supabaseAdmin
      .from('psa_pop')
      .upsert(popRecords, { onConflict: 'card_id,grade,snapshot_date' })

    if (error) {
      throw new Error(`Failed to save population data: ${error.message}`)
    }
  }

  /**
   * Add delay between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// CLI execution
if (require.main === module) {
  const service = new PPTIngestionService({
    batchSize: 10,
    maxCards: 1000,
    priorityThreshold: 0.5
  })

  service.run()
    .then(() => {
      console.log('Ingestion completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Ingestion failed:', error)
      process.exit(1)
    })
}

export { PPTIngestionService }
