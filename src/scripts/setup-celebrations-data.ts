/**
 * Master Script: Setup Celebrations Data
 * Runs the complete data ingestion pipeline for the Celebrations set
 */

import { CelebrationsIngestionService } from './ingest-celebrations'
import { AggregatesService } from './compute-aggregates'

class CelebrationsDataSetup {
  async run(): Promise<void> {
    console.log('🚀 Starting Celebrations data setup...')
    console.log('=' .repeat(50))
    
    try {
      // Step 1: Ingest Celebrations cards and initial data
      console.log('\n📦 Step 1: Ingesting Celebrations cards...')
      const ingestionService = new CelebrationsIngestionService()
      await ingestionService.run()
      
      // Step 2: Compute aggregates and facts
      console.log('\n📊 Step 2: Computing aggregates and facts...')
      const aggregatesService = new AggregatesService()
      await aggregatesService.run()
      
      // Step 3: Verify data
      console.log('\n✅ Step 3: Verifying data...')
      await this.verifyData()
      
      console.log('\n🎉 Celebrations data setup completed successfully!')
      console.log('=' .repeat(50))
      console.log('You can now view the Celebrations cards in the analysis page!')
      
    } catch (error) {
      console.error('\n❌ Celebrations data setup failed:', error)
      throw error
    }
  }

  private async verifyData(): Promise<void> {
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️ Environment variables not set, skipping verification')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check cards
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('count')
      .eq('set_name', 'Celebrations')

    if (cardsError) {
      console.log(`⚠️ Could not verify cards: ${cardsError.message}`)
    } else {
      console.log(`✅ Cards in database: ${cards?.length || 0}`)
    }

    // Check daily facts
    const { data: facts, error: factsError } = await supabase
      .from('facts_5d')
      .select('count')

    if (factsError) {
      console.log(`⚠️ Could not verify facts: ${factsError.message}`)
    } else {
      console.log(`✅ 5-day facts computed: ${facts?.length || 0}`)
    }

    // Check raw prices
    const { data: prices, error: pricesError } = await supabase
      .from('raw_prices')
      .select('count')

    if (pricesError) {
      console.log(`⚠️ Could not verify prices: ${pricesError.message}`)
    } else {
      console.log(`✅ Price records: ${prices?.length || 0}`)
    }
  }
}

// CLI execution
if (require.main === module) {
  const setup = new CelebrationsDataSetup()

  setup.run()
    .then(() => {
      console.log('\n🎉 Setup completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error)
      process.exit(1)
    })
}

export { CelebrationsDataSetup }
