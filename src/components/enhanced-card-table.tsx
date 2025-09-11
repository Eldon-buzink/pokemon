'use client'

import { useState } from 'react'
import { BadgeList } from '@/components/badge'
import { MiniSparkline } from '@/components/sparkline'
import { CardModal } from '@/components/card-modal'

interface EnhancedCardData {
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
  
  // Deltas
  raw_delta_5d: number
  raw_delta_30d: number
  raw_delta_90d: number
  psa10_delta_5d: number
  psa10_delta_30d: number
  psa10_delta_90d: number
  
  // Spread and profit
  spread_after_fees: number
  profit_loss: number
  
  // Confidence and volume
  confidence: 'High' | 'Speculative' | 'Noisy'
  volume_score: number
  
  // PSA data
  psa9_count: number
  psa10_count: number
  total_psa_count: number
  
  // Analysis
  price_volatility: number
  grading_recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid'
  
  // New metrics
  psa10_probability: number
  ev_grade: number
  upside_potential: number
  badges: string[]
  headline_momentum: number
}

interface EnhancedCardTableProps {
  cards: EnhancedCardData[]
  currentSort: string
}

export function EnhancedCardTable({ cards, currentSort: _currentSort }: EnhancedCardTableProps) {
  const [selectedCard, setSelectedCard] = useState<EnhancedCardData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCardClick = (card: EnhancedCardData) => {
    setSelectedCard(card)
    setIsModalOpen(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getDeltaColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'text-green-600 bg-green-50'
      case 'Speculative': return 'text-yellow-600 bg-yellow-50'
      case 'Noisy': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Strong Buy': return 'text-green-700 bg-green-100'
      case 'Buy': return 'text-blue-700 bg-blue-100'
      case 'Hold': return 'text-yellow-700 bg-yellow-100'
      case 'Avoid': return 'text-red-700 bg-red-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  // Generate deterministic sparkline data to avoid hydration mismatch
  const generateSparklineData = (basePrice: number, volatility: number) => {
    const data = []
    
    // Use a fixed date to ensure server/client consistency
    const fixedDate = new Date('2024-01-01T00:00:00Z')
    
    // Use a simple seeded random function based on basePrice for consistency
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(fixedDate.getTime() - i * 24 * 60 * 60 * 1000)
      const trend = Math.sin((30 - i) * Math.PI / 30) * 0.1
      const noise = (seededRandom(basePrice * 1000 + i) - 0.5) * volatility
      const price = basePrice * (1 + trend + noise)
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: Math.max(price, basePrice * 0.1)
      })
    }
    
    return data
  }

  return (
    <>
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Card
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price Trend
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Raw Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PSA 10 Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  5d Δ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  30d Δ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PSA 10 Chance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit/Loss
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recommendation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Badges
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cards.map((card) => (
                <tr 
                  key={card.card_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleCardClick(card)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {card.image_url_small ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="h-10 w-10 rounded object-cover"
                            src={card.image_url_small}
                            alt={card.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-500">?</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {card.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {card.set_name} • {card.number}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <MiniSparkline 
                      data={generateSparklineData(card.raw_price, card.price_volatility)}
                    />
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(card.raw_price)}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {card.psa10_price > 0 ? formatCurrency(card.psa10_price) : '—'}
                  </td>
                  
                  <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${getDeltaColor(card.raw_delta_5d)}`}>
                    {formatPercentage(card.raw_delta_5d)}
                  </td>
                  
                  <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${getDeltaColor(card.raw_delta_30d)}`}>
                    {formatPercentage(card.raw_delta_30d)}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(card.psa10_probability * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {(card.psa10_probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  
                  <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${getDeltaColor(card.profit_loss)}`}>
                    {formatCurrency(card.profit_loss)}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(card.confidence)}`}>
                      {card.confidence}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRecommendationColor(card.grading_recommendation)}`}>
                      {card.grading_recommendation}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <BadgeList badges={card.badges} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedCard && (
        <CardModal
          card={selectedCard}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
