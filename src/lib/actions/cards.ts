/**
 * Server Actions for Card Data
 * Fetch card data from Supabase for the UI
 */

'use server'

import { supabase } from '@/lib/supabase'
import { createPSA10Service } from '@/lib/services/psa10-service'
import { createPPTClient } from '@/lib/sources/ppt'

export interface CardData {
  card_id: string
  name: string
  set_name: string
  number: string
  rarity: string
  image_url_small: string
  image_url_large: string
  // Price data
  raw_price: number
  psa10_price: number
  spread_after_fees: number
  confidence: 'High' | 'Speculative' | 'Noisy'
  volume_score: number
  // Time period deltas
  psa10_delta_5d: number
  raw_delta_5d: number
  psa10_delta_30d: number
  raw_delta_30d: number
  psa10_delta_90d: number
  raw_delta_90d: number
  // PSA population data
  psa9_count: number
  psa10_count: number
  total_psa_count: number
  // Market analysis
  price_volatility: number
  grading_recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid'
}

export interface FilterOptions {
  timePeriod: number
  sortBy: string
  set: string
  rarity: string
  minSales: number
  minPrice: number
  minProfitLoss: number
  psa10Only: boolean
  highConfidenceOnly: boolean
  // Enhanced filtering options
  minRawDelta: number
  minPsa10Delta: number
  maxVolatility: number
  gradingRecommendation: string
}

export async function getCards(filters: FilterOptions): Promise<CardData[]> {
  try {
    // Get cards with real price data from facts_daily and facts_5d
    const { data: cards, error } = await supabase
      .from('cards')
      .select(`
        card_id,
        name,
        number,
        rarity,
        card_assets!inner(
          set_name,
          image_url_small,
          image_url_large
        )
      `)
      .limit(50)

    if (error) {
      throw new Error(`Failed to fetch cards: ${error.message}`)
    }

    if (!cards || cards.length === 0) {
      return []
    }

    // Get the most recent price data for each card
    const cardData: CardData[] = []
    
    // Create PSA10 service once outside the loop to avoid repeated API calls
    const psa10Service = createPSA10Service()
    
    // Prepare batch data for PSA10 service
    const cardBatch = cards.map(card => ({
      cardId: card.card_id,
      cardName: card.name
    }))
    
    // Get PSA10 data for all cards in batch (more efficient)
    // Limit to first 10 cards to avoid rate limits
    const limitedCardBatch = cardBatch.slice(0, 10)
    const psa10DataMap = await psa10Service.getPSA10DataBatch(limitedCardBatch)
    
    // Track cards with insufficient PSA 10 history for summary
    let cardsWithInsufficientHistory = 0
    
    for (const card of cards) {
      const assets = card.card_assets as { image_url_small?: string; image_url_large?: string } | null
      
      // Get the most recent daily facts for this card
      const { data: recentFacts, error: factsError } = await supabase
        .from('facts_daily')
        .select('*')
        .eq('card_id', card.card_id)
        .order('date', { ascending: false })
        .limit(1)
      
      if (factsError) {
        console.error(`Error fetching facts for ${card.card_id}:`, factsError.message)
        continue
      }
      
      if (!recentFacts || recentFacts.length === 0) {
        // Skip cards without price data
        continue
      }
      
      const facts = recentFacts[0]
      
      // Get 5-day facts for delta calculations
      const { error: facts5dError } = await supabase
        .from('facts_5d')
        .select('*')
        .eq('card_id', card.card_id)
        .limit(1)
      
      if (facts5dError) {
        console.error(`Error fetching facts_5d for ${card.card_id}:`, facts5dError.message)
      }
      
      // Calculate spread after fees (PSA 10 price - raw price - grading fees)
      const gradingFees = 25 // $25 base grading fee
      const rawPrice = Number(facts.raw_median) || 0
      
      // Get PSA 10 price from batch data (much faster)
      const psa10Data = psa10DataMap.get(card.card_id)
      const psa10Price = psa10Data?.price || 0
      
      const spreadAfterFees = psa10Price - (rawPrice + gradingFees)
      
      // Get card data with history for real calculations (only for first 5 cards to avoid rate limits)
      let cardWithHistory = null
      if (cards.indexOf(card) < 10) {
        try {
          const pptClient = createPPTClient()
          cardWithHistory = await pptClient.getCardWithHistory(card.card_id)
          // priceHistory = cardWithHistory.priceHistory?.conditions?.Near_Mint?.history || []
          // Add delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (error) {
          console.error(`Error getting card history for ${card.card_id}:`, error)
        }
      }
      
      // Calculate confidence based on real sales volume from PPT API
      let totalSales = (facts.raw_n || 0)
      let confidence: 'High' | 'Speculative' | 'Noisy' = 'Noisy'
      
      if (cardWithHistory) {
        try {
          // Add PSA sales from PPT API
          const psa9Data = cardWithHistory.ebay?.salesByGrade?.psa9
          const psa10Data = cardWithHistory.ebay?.salesByGrade?.psa10
          
          if (psa9Data) totalSales += psa9Data.count || 0
          if (psa10Data) totalSales += psa10Data.count || 0
          
          if (totalSales >= 10) confidence = 'High'
          else if (totalSales >= 5) confidence = 'Speculative'
        } catch (error) {
          console.error(`Error calculating confidence for ${card.card_id}:`, error)
          // Use database data only if API fails
          totalSales = (facts.raw_n || 0) + (facts.psa10_n || 0)
          if (totalSales >= 10) confidence = 'High'
          else if (totalSales >= 5) confidence = 'Speculative'
        }
      } else {
        // Use database data only if API fails
        totalSales = (facts.raw_n || 0) + (facts.psa10_n || 0)
        if (totalSales >= 10) confidence = 'High'
        else if (totalSales >= 5) confidence = 'Speculative'
      }
      
      // Calculate volume score (normalized sales volume)
      const volumeScore = Math.min(1, totalSales / 20) // Max at 20+ sales
      
      // Calculate deltas from PPT API price history
      let psa10Delta5d = 0
      let rawDelta5d = 0
      let psa10Delta30d = 0
      let rawDelta30d = 0
      let psa10Delta90d = 0
      let rawDelta90d = 0

      try {
        // Use already fetched card history
        if (cardWithHistory) {
          const priceHistory = cardWithHistory.priceHistory?.conditions?.Near_Mint?.history || []
        
          if (priceHistory.length >= 2) {
            const latest = priceHistory[0]
            const fiveDaysAgo = priceHistory.find(h => {
              const daysDiff = (new Date(latest.date).getTime() - new Date(h.date).getTime()) / (1000 * 60 * 60 * 24)
              return daysDiff >= 4 && daysDiff <= 6
            })
            
            const thirtyDaysAgo = priceHistory.find(h => {
              const daysDiff = (new Date(latest.date).getTime() - new Date(h.date).getTime()) / (1000 * 60 * 60 * 24)
              return daysDiff >= 25 && daysDiff <= 35
            })
            
            const ninetyDaysAgo = priceHistory.find(h => {
              const daysDiff = (new Date(latest.date).getTime() - new Date(h.date).getTime()) / (1000 * 60 * 60 * 24)
              return daysDiff >= 85 && daysDiff <= 95
            })

            // Calculate raw price deltas
            if (fiveDaysAgo && latest.market && fiveDaysAgo.market) {
              rawDelta5d = ((latest.market - fiveDaysAgo.market) / fiveDaysAgo.market) * 100
            }
            
            if (thirtyDaysAgo && latest.market && thirtyDaysAgo.market) {
              rawDelta30d = ((latest.market - thirtyDaysAgo.market) / thirtyDaysAgo.market) * 100
            }
            
            if (ninetyDaysAgo && latest.market && ninetyDaysAgo.market) {
              rawDelta90d = ((latest.market - ninetyDaysAgo.market) / ninetyDaysAgo.market) * 100
            }
          }

          // Calculate PSA 10 deltas from eBay data
          const psa10History = cardWithHistory.ebay?.priceHistory?.psa10 || {}
          const psa10Dates = Object.keys(psa10History).sort().reverse()
          
          if (psa10Dates.length >= 2) {
            const latestPsa10 = psa10History[psa10Dates[0]]
            const fiveDaysAgoPsa10 = psa10Dates.find(date => {
              const daysDiff = (new Date(psa10Dates[0]).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
              return daysDiff >= 1 && daysDiff <= 7
            })
            
            const thirtyDaysAgoPsa10 = psa10Dates.find(date => {
              const daysDiff = (new Date(psa10Dates[0]).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
              return daysDiff >= 20 && daysDiff <= 40
            }) || psa10Dates[psa10Dates.length - 1] // Fallback to oldest data
            
            const ninetyDaysAgoPsa10 = psa10Dates.find(date => {
              const daysDiff = (new Date(psa10Dates[0]).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
              return daysDiff >= 80 && daysDiff <= 100
            }) || psa10Dates[psa10Dates.length - 1] // Fallback to oldest data

                if (fiveDaysAgoPsa10 && latestPsa10?.average && psa10History[fiveDaysAgoPsa10]?.average) {
                  psa10Delta5d = ((latestPsa10.average - psa10History[fiveDaysAgoPsa10].average) / psa10History[fiveDaysAgoPsa10].average) * 100
                }
            
            if (thirtyDaysAgoPsa10 && latestPsa10?.average && psa10History[thirtyDaysAgoPsa10]?.average) {
              psa10Delta30d = ((latestPsa10.average - psa10History[thirtyDaysAgoPsa10].average) / psa10History[thirtyDaysAgoPsa10].average) * 100
            }
            
            if (ninetyDaysAgoPsa10 && latestPsa10?.average && psa10History[ninetyDaysAgoPsa10]?.average) {
              psa10Delta90d = ((latestPsa10.average - psa10History[ninetyDaysAgoPsa10].average) / psa10History[ninetyDaysAgoPsa10].average) * 100
            }
          } else {
            // Not enough PSA 10 history data available - this is expected for many cards
            // Delta calculations will remain at 0
            cardsWithInsufficientHistory++
          }
        }
      } catch (error) {
        console.error(`Error calculating deltas for ${card.card_id}:`, error)
        // Keep deltas as 0 if calculation fails
      }

      // Get PSA population data from PPT API
      let psa9Count = 0
      let psa10Count = 0
      let totalPsaCount = 0

      if (cardWithHistory) {
        try {
          const psa9Data = cardWithHistory.ebay?.salesByGrade?.psa9
          const psa10Data = cardWithHistory.ebay?.salesByGrade?.psa10
          
          if (psa9Data) {
            psa9Count = psa9Data.count || 0
          }
          
          if (psa10Data) {
            psa10Count = psa10Data.count || 0
          }
          
          totalPsaCount = psa9Count + psa10Count
        } catch (error) {
          console.error(`Error getting PSA population for ${card.card_id}:`, error)
          // Keep counts as 0 if API call fails
        }
      }

      // Calculate price volatility from PPT API price history
      let priceVolatility = 0
      if (cardWithHistory) {
        try {
          const priceHistory = cardWithHistory.priceHistory?.conditions?.Near_Mint?.history || []
          if (priceHistory.length >= 5) {
            const recentPrices = priceHistory.slice(0, 10).map(h => h.market).filter(Boolean)
            if (recentPrices.length >= 5) {
              const mean = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length
              const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / recentPrices.length
              priceVolatility = Math.sqrt(variance) / mean * 100 // Coefficient of variation
            }
          }
        } catch (error) {
          console.error(`Error calculating volatility for ${card.card_id}:`, error)
          // Keep volatility as 0 if calculation fails
        }
      }

      // Calculate grading recommendation
      let gradingRecommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid' = 'Hold'
      const roi = (spreadAfterFees / (rawPrice + 25)) * 100
      const psa10Premium = psa10Price / rawPrice
      
      if (roi > 50 && psa10Premium > 2 && psa10Delta5d > 10) {
        gradingRecommendation = 'Strong Buy'
      } else if (roi > 25 && psa10Premium > 1.5 && psa10Delta5d > 5) {
        gradingRecommendation = 'Buy'
      } else if (roi < -10 || psa10Premium < 1.2) {
        gradingRecommendation = 'Avoid'
      }
      
      cardData.push({
        card_id: card.card_id,
        name: card.name,
        set_name: assets.set_name,
        number: card.number,
        rarity: card.rarity,
        image_url_small: assets.image_url_small,
        image_url_large: assets.image_url_large,
        raw_price: rawPrice,
        psa10_price: psa10Price,
        spread_after_fees: spreadAfterFees,
        confidence,
        volume_score: volumeScore,
        psa10_delta_5d: psa10Delta5d,
        raw_delta_5d: rawDelta5d,
        psa10_delta_30d: psa10Delta30d,
        raw_delta_30d: rawDelta30d,
        psa10_delta_90d: psa10Delta90d,
        raw_delta_90d: rawDelta90d,
        psa9_count: psa9Count,
        psa10_count: psa10Count,
        total_psa_count: totalPsaCount,
        price_volatility: priceVolatility,
        grading_recommendation: gradingRecommendation
      })
    }

    // Apply filters
    let filteredCards = cardData

    if (filters.set && filters.set !== 'All Sets') {
      filteredCards = filteredCards.filter(card => card.set_name === filters.set)
    }

    if (filters.rarity && filters.rarity !== 'All Rarities') {
      filteredCards = filteredCards.filter(card => card.rarity === filters.rarity)
    }

    if (filters.minPrice > 0) {
      filteredCards = filteredCards.filter(card => card.raw_price >= filters.minPrice)
    }

    if (filters.minProfitLoss > 0) {
      filteredCards = filteredCards.filter(card => card.spread_after_fees >= filters.minProfitLoss)
    }

    if (filters.psa10Only) {
      filteredCards = filteredCards.filter(card => card.psa10_price > 0)
    }

    if (filters.highConfidenceOnly) {
      filteredCards = filteredCards.filter(card => card.confidence === 'High')
    }

    // Enhanced filtering options
    if (filters.minRawDelta > 0) {
      filteredCards = filteredCards.filter(card => card.raw_delta_5d >= filters.minRawDelta)
    }

    if (filters.minPsa10Delta > 0) {
      filteredCards = filteredCards.filter(card => card.psa10_delta_5d >= filters.minPsa10Delta)
    }

    if (filters.maxVolatility > 0) {
      filteredCards = filteredCards.filter(card => card.price_volatility <= filters.maxVolatility)
    }

    if (filters.gradingRecommendation && filters.gradingRecommendation !== 'All') {
      filteredCards = filteredCards.filter(card => card.grading_recommendation === filters.gradingRecommendation)
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'profit_loss':
        filteredCards.sort((a, b) => b.spread_after_fees - a.spread_after_fees)
        break
      case 'psa10_delta':
        filteredCards.sort((a, b) => b.psa10_delta_5d - a.psa10_delta_5d)
        break
      case 'raw_delta':
        filteredCards.sort((a, b) => b.raw_delta_5d - a.raw_delta_5d)
        break
      case 'volume':
        filteredCards.sort((a, b) => b.volume_score - a.volume_score)
        break
      case 'confidence':
        const confidenceOrder = { 'High': 3, 'Speculative': 2, 'Noisy': 1 }
        filteredCards.sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence])
        break
      case 'psa10_price':
        filteredCards.sort((a, b) => b.psa10_price - a.psa10_price)
        break
      case 'raw_price':
        filteredCards.sort((a, b) => b.raw_price - a.raw_price)
        break
      case 'spread_percentage':
        filteredCards.sort((a, b) => {
          const aROI = (a.spread_after_fees / (a.raw_price + 25)) * 100
          const bROI = (b.spread_after_fees / (b.raw_price + 25)) * 100
          return bROI - aROI
        })
        break
      case 'psa10_delta_30d':
        filteredCards.sort((a, b) => b.psa10_delta_30d - a.psa10_delta_30d)
        break
      case 'raw_delta_30d':
        filteredCards.sort((a, b) => b.raw_delta_30d - a.raw_delta_30d)
        break
      case 'psa10_delta_90d':
        filteredCards.sort((a, b) => b.psa10_delta_90d - a.psa10_delta_90d)
        break
      case 'raw_delta_90d':
        filteredCards.sort((a, b) => b.raw_delta_90d - a.raw_delta_90d)
        break
      case 'grading_recommendation':
        const recommendationOrder = { 'Strong Buy': 4, 'Buy': 3, 'Hold': 2, 'Avoid': 1 }
        filteredCards.sort((a, b) => recommendationOrder[b.grading_recommendation] - recommendationOrder[a.grading_recommendation])
        break
      case 'volatility':
        filteredCards.sort((a, b) => a.price_volatility - b.price_volatility) // Lower volatility is better
        break
      default:
        filteredCards.sort((a, b) => b.spread_after_fees - a.spread_after_fees)
    }

    // Log summary of cards with insufficient PSA 10 history
    if (cardsWithInsufficientHistory > 0) {
      console.log(`📊 Data Summary: ${cardsWithInsufficientHistory} cards have insufficient PSA 10 history (delta calculations = 0)`)
    }

    return filteredCards

  } catch (error) {
    console.error('Error fetching cards:', error)
    return []
  }
}

export async function getSets(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('card_assets')
      .select('set_name')

    if (error) {
      throw new Error(`Failed to fetch sets: ${error.message}`)
    }

    // Get unique set names
    const uniqueSets = [...new Set(data?.map(item => item.set_name) || [])]
    return ['All Sets', ...uniqueSets.sort()]
  } catch (error) {
    console.error('Error fetching sets:', error)
    return ['All Sets']
  }
}

export async function getRarities(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('rarity')

    if (error) {
      throw new Error(`Failed to fetch rarities: ${error.message}`)
    }

    // Get unique rarities
    const uniqueRarities = [...new Set(data?.map(item => item.rarity).filter(Boolean) || [])]
    return ['All Rarities', ...uniqueRarities.sort()]
  } catch (error) {
    console.error('Error fetching rarities:', error)
    return ['All Rarities']
  }
}
