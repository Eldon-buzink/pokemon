/**
 * Generate Mock Price Data
 * Creates realistic mock price data for development and testing
 * This will be replaced with real data once the PPT API is working
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MockPriceData {
  card_id: string
  source: 'mock'
  snapshot_date: string
  median_price: number
  n_sales: number
}

interface MockGradedSale {
  card_id: string
  grade: number
  sold_date: string
  price: number
  source: 'mock'
  listing_id?: string
}

interface MockPSAPopulation {
  card_id: string
  grade: number
  pop_count: number
  snapshot_date: string
}

function generateDateRange(days: number): string[] {
  const dates: string[] = []
  const today = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  return dates
}

function generateMockRawPrices(cardId: string, basePrice: number, days: number = 30): MockPriceData[] {
  const dates = generateDateRange(days)
  const prices: MockPriceData[] = []
  
  // Add some volatility and trend
  let currentPrice = basePrice
  const volatility = 0.15 // 15% daily volatility
  const trend = 0.001 // Slight upward trend
  
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    
    // Add trend
    currentPrice *= (1 + trend)
    
    // Add random volatility
    const randomChange = (Math.random() - 0.5) * volatility
    currentPrice *= (1 + randomChange)
    
    // Ensure price doesn't go below $1
    currentPrice = Math.max(currentPrice, 1)
    
    // Generate realistic sales volume (more sales on weekends)
    const dayOfWeek = new Date(date).getDay()
    const baseSales = Math.floor(Math.random() * 10) + 1
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.5 : 1
    const nSales = Math.floor(baseSales * weekendMultiplier)
    
    prices.push({
      card_id: cardId,
      source: 'mock',
      snapshot_date: date,
      median_price: Math.round(currentPrice * 100) / 100,
      n_sales: nSales
    })
  }
  
  return prices
}

function generateMockGradedSales(cardId: string, basePrice: number, days: number = 30): MockGradedSale[] {
  const dates = generateDateRange(days)
  const sales: MockGradedSale[] = []
  
  // PSA 10 typically sells for 2-5x raw price
  const psa10Multiplier = 2.5 + Math.random() * 2.5
  
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    
    // Generate 0-3 PSA 10 sales per day
    const numSales = Math.floor(Math.random() * 4)
    
    for (let j = 0; j < numSales; j++) {
      // Get the raw price for this date (we'll use a simplified calculation)
      const rawPrice = basePrice * (1 + (Math.random() - 0.5) * 0.2)
      const psa10Price = rawPrice * psa10Multiplier * (0.8 + Math.random() * 0.4) // Add some variance
      
      sales.push({
        card_id: cardId,
        grade: 10,
        sold_date: date,
        price: Math.round(psa10Price * 100) / 100,
        source: 'mock',
        listing_id: `mock_${cardId}_${date}_${j}`
      })
    }
  }
  
  return sales
}

function generateMockPSAPopulation(cardId: string): MockPSAPopulation[] {
  const today = new Date().toISOString().split('T')[0]
  
  // Generate realistic PSA population data
  const populations: MockPSAPopulation[] = []
  
  // PSA 10 population (most relevant for our analysis)
  const psa10Pop = Math.floor(Math.random() * 1000) + 100 // 100-1100 PSA 10s
  
  populations.push({
    card_id: cardId,
    grade: 10,
    pop_count: psa10Pop,
    snapshot_date: today
  })
  
  // Add some other grades for completeness
  const otherGrades = [9, 8, 7, 6, 5]
  for (const grade of otherGrades) {
    const popCount = Math.floor(psa10Pop * (0.1 + Math.random() * 0.3)) // 10-40% of PSA 10
    populations.push({
      card_id: cardId,
      grade,
      pop_count: popCount,
      snapshot_date: today
    })
  }
  
  return populations
}

async function generateMockDataForCard(cardId: string, cardName: string) {
  console.log(`📦 Generating mock data for ${cardName} (${cardId})...`)
  
  // Generate base price based on card name (some cards are more valuable)
  const basePrice = cardName.toLowerCase().includes('charizard') ? 200 :
                   cardName.toLowerCase().includes('pikachu') ? 150 :
                   cardName.toLowerCase().includes('blastoise') ? 120 :
                   cardName.toLowerCase().includes('venusaur') ? 100 :
                   50 + Math.random() * 100 // Random base price $50-150
  
  // Generate raw prices
  const rawPrices = generateMockRawPrices(cardId, basePrice, 30)
  
  // Insert raw prices
  const { error: rawError } = await supabase
    .from('raw_prices')
    .insert(rawPrices)
  
  if (rawError) {
    console.error(`❌ Failed to insert raw prices for ${cardId}:`, rawError.message)
  } else {
    console.log(`✅ Inserted ${rawPrices.length} raw price records`)
  }
  
  // Generate graded sales
  const gradedSales = generateMockGradedSales(cardId, basePrice, 30)
  
  // Insert graded sales
  const { error: salesError } = await supabase
    .from('graded_sales')
    .insert(gradedSales)
  
  if (salesError) {
    console.error(`❌ Failed to insert graded sales for ${cardId}:`, salesError.message)
  } else {
    console.log(`✅ Inserted ${gradedSales.length} graded sales`)
  }
  
  // Generate PSA population
  const psaPopulation = generateMockPSAPopulation(cardId)
  
  // Insert PSA population
  const { error: popError } = await supabase
    .from('psa_pop')
    .insert(psaPopulation)
  
  if (popError) {
    console.error(`❌ Failed to insert PSA population for ${cardId}:`, popError.message)
  } else {
    console.log(`✅ Inserted ${psaPopulation.length} PSA population records`)
  }
}

async function computeMockDailyFacts() {
  console.log('🧮 Computing daily facts from mock data...')
  
  // Get all cards
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('card_id')
  
  if (cardsError) {
    console.error('❌ Failed to fetch cards:', cardsError.message)
    return
  }
  
  if (!cards || cards.length === 0) {
    console.log('❌ No cards found')
    return
  }
  
  const dates = generateDateRange(30)
  
  for (const card of cards) {
    for (const date of dates) {
      // Get raw prices for this card and date
      const { data: rawPrices } = await supabase
        .from('raw_prices')
        .select('median_price, n_sales')
        .eq('card_id', card.card_id)
        .eq('snapshot_date', date)
        .eq('source', 'mock')
      
      // Get PSA 10 sales for this card and date
      const { data: psa10Sales } = await supabase
        .from('graded_sales')
        .select('price')
        .eq('card_id', card.card_id)
        .eq('grade', 10)
        .eq('sold_date', date)
        .eq('source', 'mock')
      
      // Calculate medians and other metrics
      const rawPricesList = rawPrices?.map(p => p.median_price) || []
      const psa10PricesList = psa10Sales?.map(s => s.price) || []
      
      const rawMedian = rawPricesList.length > 0 ? 
        rawPricesList.sort((a, b) => a - b)[Math.floor(rawPricesList.length / 2)] : 0
      
      const psa10Median = psa10PricesList.length > 0 ? 
        psa10PricesList.sort((a, b) => a - b)[Math.floor(psa10PricesList.length / 2)] : 0
      
      const nRawSales = rawPrices?.reduce((sum, p) => sum + p.n_sales, 0) || 0
      const nPsa10Sales = psa10Sales?.length || 0
      
      // Calculate confidence score based on sales volume
      const confidenceScore = Math.min(1, (nRawSales + nPsa10Sales) / 20) // Max confidence at 20+ sales
      
      // Insert daily facts
      const { error } = await supabase
        .from('facts_daily')
        .insert({
          card_id: card.card_id,
          date,
          raw_median: rawMedian,
          raw_n: nRawSales,
          psa10_median: psa10Median,
          psa10_n: nPsa10Sales,
          pop9: 0, // Simplified for now
          pop10: 0 // Simplified for now
        })
      
      if (error) {
        console.error(`❌ Failed to insert daily facts for ${card.card_id} on ${date}:`, error.message)
      }
    }
  }
  
  console.log('✅ Daily facts computed')
}

async function main() {
  console.log('🎭 Generating Mock Price Data...\n')
  
  try {
    // Get cards from database
    const { data: cards, error } = await supabase
      .from('cards')
      .select('card_id, name')
      .limit(10) // Start with first 10 cards
    
    if (error) {
      throw new Error(`Failed to fetch cards: ${error.message}`)
    }
    
    if (!cards || cards.length === 0) {
      console.log('❌ No cards found in database. Run catalog sync first.')
      return
    }
    
    console.log(`📋 Found ${cards.length} cards to process\n`)
    
    // Generate mock data for each card
    for (const card of cards) {
      await generateMockDataForCard(card.card_id, card.name)
      console.log('') // Add spacing
    }
    
    // Compute daily facts
    await computeMockDailyFacts()
    
    console.log('\n✅ Mock price data generation completed!')
    console.log('\n💡 Next Steps:')
    console.log('1. The mock data is now in your database')
    console.log('2. Update the getCards function to use real data instead of hardcoded mock data')
    console.log('3. Test the movers page to see the new data')
    
  } catch (error) {
    console.error('❌ Mock data generation failed:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}

export { main as generateMockPrices }
