/**
 * Price Data Ingestion Script
 * Fetches real price data from Pokemon Price Tracker API and stores in Supabase
 * Run this daily to keep price data up to date
 */

import { createClient } from '@supabase/supabase-js'
import { createPPTClient } from '@/lib/sources/ppt'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PriceData {
  card_id: string
  date: string
  median_price: number
  n_sales: number
  source: 'ppt'
}

interface GradedSale {
  card_id: string
  grade: number
  sold_date: string
  price: number
  listing_id?: string
}

interface PSAPopulation {
  card_id: string
  grade: number
  pop_count: number
  snapshot_date: string
}

async function getCardsFromDatabase() {
  console.log('📋 Fetching cards from database...')
  
  const { data: cards, error } = await supabase
    .from('cards')
    .select('card_id, name, number')
    .limit(50) // Start with first 50 cards
  
  if (error) {
    throw new Error(`Failed to fetch cards: ${error.message}`)
  }
  
  console.log(`✅ Found ${cards?.length || 0} cards`)
  return cards || []
}

async function ingestRawPrices(cardId: string) {
  try {
    const pptClient = createPPTClient()
    
    // Get raw prices for the last 30 days
    const rawPrices = await pptClient.getRawPrices(cardId, 30)
    
    if (rawPrices.length === 0) {
      console.log(`⚠️  No raw price data for ${cardId}`)
      return
    }
    
    // Transform data for our database
    const priceData = rawPrices.map(price => ({
      card_id: price.card_id,
      date: price.date,
      median_price: price.median_price,
      n_sales: price.n_sales,
      source: 'ppt' as const
    }))
    
    // Insert into raw_prices table
    const { error } = await supabase
      .from('raw_prices')
      .upsert(priceData, { 
        onConflict: 'card_id,date,source',
        ignoreDuplicates: false 
      })
    
    if (error) {
      console.error(`❌ Failed to insert raw prices for ${cardId}:`, error.message)
    } else {
      console.log(`✅ Inserted ${priceData.length} raw price records for ${cardId}`)
    }
    
  } catch (error) {
    console.error(`❌ Error fetching raw prices for ${cardId}:`, error)
  }
}

async function ingestGradedSales(cardId: string) {
  try {
    const pptClient = createPPTClient()
    
    // Get PSA 10 sales for the last 30 days
    const gradedSales = await pptClient.getGradedSales(cardId, 10, 30)
    
    if (gradedSales.length === 0) {
      console.log(`⚠️  No PSA 10 sales data for ${cardId}`)
      return
    }
    
    // Transform data for our database
    const salesData = gradedSales.map(sale => ({
      card_id: sale.card_id,
      grade: sale.grade,
      sold_date: sale.sold_date,
      price: sale.price,
      listing_id: sale.listing_id || null
    }))
    
    // Insert into graded_sales table
    const { error } = await supabase
      .from('graded_sales')
      .upsert(salesData, { 
        onConflict: 'card_id,grade,sold_date,listing_id',
        ignoreDuplicates: false 
      })
    
    if (error) {
      console.error(`❌ Failed to insert graded sales for ${cardId}:`, error.message)
    } else {
      console.log(`✅ Inserted ${salesData.length} graded sales for ${cardId}`)
    }
    
  } catch (error) {
    console.error(`❌ Error fetching graded sales for ${cardId}:`, error)
  }
}

async function ingestPSAPopulation(cardId: string) {
  try {
    const pptClient = createPPTClient()
    
    // Get PSA population data
    const populationData = await pptClient.getPSAPopulation(cardId)
    
    if (populationData.length === 0) {
      console.log(`⚠️  No PSA population data for ${cardId}`)
      return
    }
    
    // Transform data for our database
    const popData = populationData.map(pop => ({
      card_id: pop.card_id,
      grade: pop.grade,
      pop_count: pop.pop_count,
      snapshot_date: pop.snapshot_date
    }))
    
    // Insert into psa_pop table
    const { error } = await supabase
      .from('psa_pop')
      .upsert(popData, { 
        onConflict: 'card_id,grade,snapshot_date',
        ignoreDuplicates: false 
      })
    
    if (error) {
      console.error(`❌ Failed to insert PSA population for ${cardId}:`, error.message)
    } else {
      console.log(`✅ Inserted ${popData.length} PSA population records for ${cardId}`)
    }
    
  } catch (error) {
    console.error(`❌ Error fetching PSA population for ${cardId}:`, error)
  }
}

async function computeDailyFacts() {
  console.log('🧮 Computing daily facts...')
  
  // This would compute the daily aggregates from raw data
  // For now, we'll create a placeholder that can be expanded
  
  const { data: cards } = await supabase
    .from('cards')
    .select('card_id')
    .limit(10)
  
  if (!cards) return
  
  for (const card of cards) {
    // Compute daily facts for each card
    // This is where we'd calculate medians, IQR, etc.
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabase
      .from('facts_daily')
      .upsert({
        card_id: card.card_id,
        date: today,
        raw_median: 0, // Will be computed from raw_prices
        raw_iqr: 0,
        psa10_median: 0, // Will be computed from graded_sales
        psa10_iqr: 0,
        n_raw_sales: 0,
        n_psa10_sales: 0,
        confidence_score: 0
      }, {
        onConflict: 'card_id,date',
        ignoreDuplicates: false
      })
    
    if (error) {
      console.error(`❌ Failed to compute daily facts for ${card.card_id}:`, error.message)
    }
  }
  
  console.log('✅ Daily facts computed')
}

async function main() {
  console.log('🚀 Starting price data ingestion...')
  
  try {
    // Check quota status
    const pptClient = createPPTClient()
    const quotaStatus = pptClient.getQuotaStatus()
    console.log('📊 Quota status:', quotaStatus)
    
    // Get cards from database
    const cards = await getCardsFromDatabase()
    
    if (cards.length === 0) {
      console.log('❌ No cards found in database. Run catalog sync first.')
      return
    }
    
    // Process each card
    for (const card of cards) {
      console.log(`\n📦 Processing ${card.name} (${card.card_id})...`)
      
      // Ingest raw prices
      await ingestRawPrices(card.card_id)
      
      // Ingest graded sales
      await ingestGradedSales(card.card_id)
      
      // Ingest PSA population
      await ingestPSAPopulation(card.card_id)
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Compute daily facts
    await computeDailyFacts()
    
    console.log('\n✅ Price data ingestion completed!')
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}

export { main as ingestPriceData }
