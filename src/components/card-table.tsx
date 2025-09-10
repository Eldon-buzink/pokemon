'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { type CardData } from '@/lib/actions/cards'
import { CardModal } from './card-modal'
import { Tooltip } from './tooltip'

interface CardTableProps {
  cards: CardData[]
  currentSort: string
}

export function CardTable({ cards, currentSort }: CardTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSortChange = (sortBy: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sortBy', sortBy)
    router.push(`/movers?${params.toString()}`)
  }

  const handleCardClick = (card: CardData) => {
    setSelectedCard(card)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedCard(null)
  }
  if (cards.length === 0) {
    return (
      <div className="bg-card rounded-lg border">
        <div className="p-8 text-center">
          <div className="text-muted-foreground">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg mb-2">No cards found</p>
            <p className="text-sm mb-4">
              Try adjusting your filters to see more results.
            </p>
            <div className="text-xs text-muted-foreground">
              💡 Tip: Try removing some filters or changing the time period
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Card Analysis Results</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Updated {new Date().toISOString().split('T')[0]}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {cards.length} cards found
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Sort by:</label>
              <select 
                value={currentSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm bg-background"
              >
                <option value="profit_loss">Highest ROI (Profit/Loss)</option>
                <option value="psa10_delta">PSA 10 Price Change</option>
                <option value="raw_delta">Raw Price Change</option>
                <option value="volume">Trading Volume</option>
                <option value="confidence">Data Confidence</option>
                <option value="psa10_price">PSA 10 Value (High to Low)</option>
                <option value="raw_price">Raw Value (High to Low)</option>
                <option value="spread_percentage">Spread Percentage</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left p-4 font-medium">Card</th>
              <th className="text-right p-4 font-medium">
                <Tooltip content="Current market price for raw (ungraded) cards in Near Mint condition. Based on recent sales data.">
                  <span className="cursor-help border-b border-dotted border-gray-400">Raw Price</span>
                </Tooltip>
              </th>
              <th className="text-right p-4 font-medium">
                <Tooltip content="Current market price for PSA 10 graded cards from eBay sold listings via Pokemon Price Tracker API. Shows real 7-day average prices based on recent sales data.">
                  <span className="cursor-help border-b border-dotted border-gray-400">PSA 10 Price</span>
                </Tooltip>
              </th>
              <th className="text-right p-4 font-medium">
                <Tooltip content="Profit you'd make if you bought raw, graded it PSA 10, and sold it. Formula: PSA 10 Price - (Raw Price + $25 grading fee)">
                  <span className="cursor-help border-b border-dotted border-gray-400">Profit/Loss</span>
                </Tooltip>
              </th>
              <th className="text-right p-4 font-medium">
                <Tooltip content="Return on Investment percentage. Formula: (Profit/Loss ÷ Total Investment) × 100. Higher is better.">
                  <span className="cursor-help border-b border-dotted border-gray-400">ROI %</span>
                </Tooltip>
              </th>
              <th className="text-right p-4 font-medium">
                <Tooltip content="5-day percentage change in PSA 10 prices. Positive = price going up, Negative = price going down.">
                  <span className="cursor-help border-b border-dotted border-gray-400">PSA 10 Δ</span>
                </Tooltip>
              </th>
              <th className="text-right p-4 font-medium">
                <Tooltip content="5-day percentage change in raw card prices. Shows recent price trends for ungraded cards.">
                  <span className="cursor-help border-b border-dotted border-gray-400">Raw Δ</span>
                </Tooltip>
              </th>
              <th className="text-center p-4 font-medium">
                <Tooltip content="Data confidence level: High (10+ sales), Speculative (5-9 sales), Noisy (<5 sales). Higher confidence = more reliable prices.">
                  <span className="cursor-help border-b border-dotted border-gray-400">Confidence</span>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.card_id} className="border-b hover:bg-muted/50">
                <td className="p-4">
                  <button 
                    onClick={() => handleCardClick(card)}
                    className="flex items-center space-x-3 hover:opacity-80 transition-opacity w-full text-left"
                  >
                    <div className="relative w-12 h-16 flex-shrink-0">
                      <Image
                        src={card.image_url_small || '/placeholder-card.svg'}
                        alt={card.name}
                        fill
                        className="object-cover rounded"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <div className="font-medium">{card.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {card.set_name} • #{card.number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {card.rarity}
                      </div>
                    </div>
                  </button>
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  ${card.raw_price.toFixed(2)}
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  ${card.psa10_price.toFixed(2)}
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  <span className={`font-semibold ${
                    card.spread_after_fees >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {card.spread_after_fees >= 0 ? '+' : ''}${card.spread_after_fees.toFixed(2)}
                  </span>
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  <span className={`font-semibold ${
                    card.spread_after_fees >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {((card.spread_after_fees / (card.raw_price + 25)) * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  <span className={`${
                    card.psa10_delta_5d >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {card.psa10_delta_5d >= 0 ? '+' : ''}{card.psa10_delta_5d.toFixed(1)}%
                  </span>
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  <span className={`${
                    card.raw_delta_5d >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {card.raw_delta_5d >= 0 ? '+' : ''}{card.raw_delta_5d.toFixed(1)}%
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    card.confidence === 'High' 
                      ? 'bg-green-100 text-green-800' 
                      : card.confidence === 'Speculative'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {card.confidence}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Card Modal */}
      <CardModal 
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}
