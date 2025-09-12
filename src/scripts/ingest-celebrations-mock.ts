/**
 * Celebrations Set Mock Data Ingestion Script
 * Creates mock Celebrations data without requiring database connection
 */

import { pokemonTCGClient, type PokemonTCGCard } from '@/lib/sources/pokemon-tcg'

interface MockCardData {
  card_id: string
  name: string
  set_name: string
  number: string
  rarity: string
  image_url_small: string
  image_url_large: string
  raw_price: number
  psa10_price: number
  spread_after_fees: number
  profit_loss: number
  confidence: 'High' | 'Speculative' | 'Noisy'
  volume_score: number
  raw_delta_5d: number
  raw_delta_30d: number
  raw_delta_90d: number
  psa10_delta_5d: number
  psa10_delta_30d: number
  psa10_delta_90d: number
  psa9_count: number
  psa10_count: number
  total_psa_count: number
  price_volatility: number
  grading_recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid'
  psa10_probability: number
  ev_grade: number
  upside_potential: number
  badges: string[]
  headline_momentum: number
  sparkline_data: { date: string; price: number }[]
}

class CelebrationsMockIngestionService {
  private set_name = 'Celebrations'

  async run(): Promise<MockCardData[]> {
    console.log('🎉 Starting Celebrations mock data generation...')
    
    try {
      // Step 1: Get all cards from the set
      console.log('🃏 Fetching all cards from Celebrations set...')
      const cards = await pokemonTCGClient.getSetCards(this.set_name)
      console.log(`✅ Fetched ${cards.length} cards`)

      // Step 2: Transform to mock data with realistic metrics
      console.log('💰 Generating mock data with realistic metrics...')
      const mockCards = this.generateMockCardData(cards)

      console.log('🎉 Celebrations mock data generation completed successfully!')
      return mockCards
    } catch (error) {
      console.error('❌ Celebrations mock data generation failed:', error)
      throw error
    }
  }

  private generateMockCardData(cards: PokemonTCGCard[]): MockCardData[] {
    return cards.map((card, index) => {
      const cardId = `${this.set_name}-${card.number}`
      
      // Generate realistic base price from TCGPlayer data
      const basePrice = this.generateBasePrice(card)
      const volatility = 0.1 + Math.random() * 0.3
      const momentum = (Math.random() - 0.5) * 0.4
      
      // Generate PSA 10 price (typically 5-15x raw price)
      const psa10Multiplier = 5 + Math.random() * 10
      const psa10Price = basePrice * psa10Multiplier
      
      // Generate realistic metrics
      const spread = (psa10Price * 0.3) - basePrice
      const profitMargin = spread / basePrice
      
      // Generate confidence based on volume and volatility
      let confidence: 'High' | 'Speculative' | 'Noisy' = 'Noisy'
      if (volatility < 0.2 && Math.random() > 0.5) {
        confidence = 'High'
      } else if (volatility < 0.4) {
        confidence = 'Speculative'
      }
      
      // Generate volume score
      const volumeScore = Math.random()
      
      // Generate deltas with some correlation
      const rawDelta5d = momentum * 10 + (Math.random() - 0.5) * 5
      const rawDelta30d = rawDelta5d * 2 + (Math.random() - 0.5) * 10
      const rawDelta90d = rawDelta5d * 4 + (Math.random() - 0.5) * 20
      
      const psa10Delta5d = rawDelta5d * 0.5
      const psa10Delta30d = rawDelta30d * 0.5
      const psa10Delta90d = rawDelta90d * 0.5
      
      // Generate PSA population data
      const totalPop = Math.floor(Math.random() * 1000) + 100
      const psa10Count = Math.floor(totalPop * Math.pow(0.7, 9)) // Grade 10 is rare
      const psa9Count = Math.floor(totalPop * Math.pow(0.7, 8))
      
      // Generate grading recommendation
      let gradingRecommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid' = 'Hold'
      if (profitMargin > 0.5 && psa10Count > 50) {
        gradingRecommendation = 'Strong Buy'
      } else if (profitMargin > 0.2 && psa10Count > 20) {
        gradingRecommendation = 'Buy'
      } else if (profitMargin < -0.2) {
        gradingRecommendation = 'Avoid'
      }
      
      // Generate badges
      const badges: string[] = []
      if (profitMargin > 0.3) badges.push('HOT')
      if (psa10Count > 100) badges.push('GRADE_EV')
      if (rawDelta5d > 20) badges.push('MOMENTUM')
      
      // Generate sparkline data
      const sparklineData = this.generateSparklineData(basePrice, volatility, cardId)
      
      return {
        card_id: cardId,
        name: card.name,
        set_name: this.set_name,
        number: card.number,
        rarity: card.rarity,
        image_url_small: card.images.small,
        image_url_large: card.images.large,
        raw_price: Math.round(basePrice * 100) / 100,
        psa10_price: Math.round(psa10Price * 100) / 100,
        spread_after_fees: Math.round(spread * 100) / 100,
        profit_loss: Math.round(spread * 100) / 100,
        confidence,
        volume_score: Math.round(volumeScore * 1000) / 1000,
        raw_delta_5d: Math.round(rawDelta5d * 100) / 100,
        raw_delta_30d: Math.round(rawDelta30d * 100) / 100,
        raw_delta_90d: Math.round(rawDelta90d * 100) / 100,
        psa10_delta_5d: Math.round(psa10Delta5d * 100) / 100,
        psa10_delta_30d: Math.round(psa10Delta30d * 100) / 100,
        psa10_delta_90d: Math.round(psa10Delta90d * 100) / 100,
        psa9_count: psa9Count,
        psa10_count: psa10Count,
        total_psa_count: totalPop,
        price_volatility: Math.round(volatility * 1000) / 1000,
        grading_recommendation: gradingRecommendation,
        psa10_probability: Math.round((psa10Count / totalPop) * 1000) / 1000,
        ev_grade: Math.round(basePrice * 0.3 * 100) / 100,
        upside_potential: Math.round(profitMargin * 1000) / 1000,
        badges,
        headline_momentum: Math.round(rawDelta5d * 100) / 100,
        sparkline_data: sparklineData,
      }
    })
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

  private generateSparklineData(basePrice: number, volatility: number, cardId: string): { date: string; price: number }[] {
    const data = []
    const fixedDate = new Date('2024-01-01T00:00:00Z')
    
    // Use cardId for deterministic but unique data
    const cardIdHash = cardId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const trendOffset = (cardIdHash % 100) / 100 * Math.PI * 2
    const volatilityMultiplier = 0.5 + (cardIdHash % 50) / 50 * 1.5
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(fixedDate.getTime() - i * 24 * 60 * 60 * 1000)
      const trend = Math.sin((30 - i) * Math.PI / 30 + trendOffset) * 0.15
      const noise = (Math.random() - 0.5) * volatility * volatilityMultiplier
      const price = basePrice * (1 + trend + noise)
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: Math.max(Math.round(price * 100) / 100, basePrice * 0.1)
      })
    }
    
    return data
  }
}

// CLI execution
if (require.main === module) {
  const service = new CelebrationsMockIngestionService()

  service.run()
    .then((cards) => {
      console.log(`\n🎉 Generated ${cards.length} mock Celebrations cards!`)
      console.log('Sample cards:')
      cards.slice(0, 3).forEach(card => {
        console.log(`- ${card.name} (${card.number}): $${card.raw_price} → PSA 10: $${card.psa10_price}`)
      })
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Mock data generation failed:', error)
      process.exit(1)
    })
}

export { CelebrationsMockIngestionService }
