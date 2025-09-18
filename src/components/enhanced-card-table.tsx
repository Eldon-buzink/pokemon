'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BadgeList } from '@/components/badge'
import { MiniSparkline } from '@/components/sparkline'
import { CardModal } from '@/components/card-modal'
import { Tooltip } from '@/components/tooltip'
import { TableHeader } from '@/components/table-header'
import { type CardData } from '@/lib/actions/cards'

interface EnhancedCardTableProps {
  cards: CardData[]
  currentSort: string
  sortDirection?: 'asc' | 'desc'
}

export function EnhancedCardTable({ cards, currentSort, sortDirection = 'desc' }: EnhancedCardTableProps) {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCardClick = (card: CardData) => {
    setSelectedCard(card)
    setIsModalOpen(true)
  }

  const handleColumnClick = (columnKey: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // If clicking the same column, toggle direction
    if (currentSort === columnKey) {
      const newDirection = sortDirection === 'desc' ? 'asc' : 'desc'
      params.set('sortDirection', newDirection)
    } else {
      // New column, default to descending (high to low)
      params.set('sortBy', columnKey)
      params.set('sortDirection', 'desc')
    }
    
    router.push(`/analysis?${params.toString()}`)
  }

  const getSortIcon = (columnKey: string) => {
    if (currentSort !== columnKey) {
      return null
    }
    return sortDirection === 'desc' 
      ? <span className="text-gray-700 ml-1">↓</span>
      : <span className="text-gray-700 ml-1">↑</span>
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


  return (
    <>
      <div className="bg-white rounded-lg border overflow-hidden">
        <TableHeader 
          cardCount={cards.length}
          currentSort={currentSort}
        />
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Card
                </th>
                <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  <Tooltip content="30-day price trend visualization">
                    Trend
                  </Tooltip>
                </th>
                <th 
                  className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleColumnClick('raw_price')}
                >
                  <Tooltip content="Current market price for raw (ungraded) card">
                    <div className="flex items-center">
                      Raw
                      {getSortIcon('raw_price')}
                    </div>
                  </Tooltip>
                </th>
                <th 
                  className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleColumnClick('psa10_price')}
                >
                  <Tooltip content="Current market price for PSA 10 graded card">
                    <div className="flex items-center">
                      PSA 10
                      {getSortIcon('psa10_price')}
                    </div>
                  </Tooltip>
                </th>
                <th 
                  className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-14 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleColumnClick('raw_delta_5d')}
                >
                  <Tooltip content="5-day percentage change in raw card price">
                    <div className="flex items-center">
                      5d Δ
                      {getSortIcon('raw_delta_5d')}
                    </div>
                  </Tooltip>
                </th>
                <th 
                  className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-14 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleColumnClick('raw_delta_30d')}
                >
                  <Tooltip content="30-day percentage change in raw card price">
                    <div className="flex items-center">
                      30d Δ
                      {getSortIcon('raw_delta_30d')}
                    </div>
                  </Tooltip>
                </th>
                <th 
                  className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleColumnClick('psa10_probability')}
                >
                  <Tooltip content="Estimated probability of getting PSA 10 grade">
                    <div className="flex items-center">
                      PSA 10%
                      {getSortIcon('psa10_probability')}
                    </div>
                  </Tooltip>
                </th>
                <th 
                  className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleColumnClick('profit_loss')}
                >
                  <Tooltip content="Potential profit/loss after grading fees and PSA 10 sale">
                    <div className="flex items-center">
                      Profit
                      {getSortIcon('profit_loss')}
                    </div>
                  </Tooltip>
                </th>
                <th 
                  className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleColumnClick('confidence')}
                >
                  <Tooltip content="Data quality confidence: High (reliable), Speculative (limited data), Noisy (unreliable)">
                    <div className="flex items-center">
                      Conf
                      {getSortIcon('confidence')}
                    </div>
                  </Tooltip>
                </th>
                <th 
                  className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleColumnClick('grading_recommendation')}
                >
                  <Tooltip content="Grading recommendation based on profit potential and risk">
                    <div className="flex items-center">
                      Rec
                      {getSortIcon('grading_recommendation')}
                    </div>
                  </Tooltip>
                </th>
                <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  <Tooltip content="Special indicators: HOT (high momentum), GRADE EV (profitable to grade), EARLY (new release)">
                    Badges
                  </Tooltip>
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
                  <td className="px-1 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-6">
                        {card.image_url_small ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="h-8 w-6 rounded object-cover"
                            src={card.image_url_small}
                            alt={card.name}
                          />
                        ) : (
                          <div className="h-8 w-6 rounded bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-500">?</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-2 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {card.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {card.set_name} • {card.number}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-1 py-2 whitespace-nowrap">
                    <MiniSparkline 
                      data={card.sparkline_data}
                      color={card.raw_delta_5d > 0 ? '#10b981' : card.raw_delta_5d < 0 ? '#ef4444' : '#6b7280'}
                    />
                  </td>
                  
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900">
                    {formatCurrency(card.raw_price)}
                  </td>
                  
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900">
                    {card.psa10_price > 0 ? formatCurrency(card.psa10_price) : '—'}
                  </td>
                  
                  <td className={`px-1 py-2 whitespace-nowrap text-xs font-medium ${getDeltaColor(card.raw_delta_5d)}`}>
                    {formatPercentage(card.raw_delta_5d)}
                  </td>
                  
                  <td className={`px-1 py-2 whitespace-nowrap text-xs font-medium ${getDeltaColor(card.raw_delta_30d)}`}>
                    {formatPercentage(card.raw_delta_30d)}
                  </td>
                  
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900">
                    <div className="flex items-center">
                      <div className="w-8 bg-gray-200 rounded-full h-1 mr-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full" 
                          style={{ width: `${Math.min(card.psa10_probability * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {(card.psa10_probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  
                  <td className={`px-1 py-2 whitespace-nowrap text-xs font-medium ${getDeltaColor(card.profit_loss)}`}>
                    {formatCurrency(card.profit_loss)}
                  </td>
                  
                  <td className="px-1 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-1 py-0.5 text-xs font-medium rounded ${getConfidenceColor(card.confidence)}`}>
                      {card.confidence.charAt(0)}
                    </span>
                  </td>
                  
                  <td className="px-1 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-1 py-0.5 text-xs font-medium rounded ${getRecommendationColor(card.grading_recommendation)}`}>
                      {card.grading_recommendation.charAt(0)}
                    </span>
                  </td>
                  
                  <td className="px-1 py-2 whitespace-nowrap">
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
