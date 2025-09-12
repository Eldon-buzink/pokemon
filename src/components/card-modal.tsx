'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { type CardData } from '@/lib/actions/cards'
import { PriceChart } from './price-chart'
import { PopulationChart } from './population-chart'
import { getChartData, type ChartData } from '@/lib/actions/chart-data'

interface CardModalProps {
  card: CardData | null
  isOpen: boolean
  onClose: () => void
}

export function CardModal({ card, isOpen, onClose }: CardModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoadingCharts, setIsLoadingCharts] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      setIsVisible(false)
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Load chart data when modal opens
  useEffect(() => {
    if (isOpen && card) {
      setIsLoadingCharts(true)
      
      getChartData(card.card_id)
        .then(data => {
          setChartData(data)
        })
        .catch(error => {
          console.error('Error loading chart data:', error)
        })
        .finally(() => {
          setIsLoadingCharts(false)
        })
    }
  }, [isOpen, card])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !card) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Modal Content */}
      <div className="relative bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">{card.name}</h2>
            <p className="text-muted-foreground">{card.set_name} • #{card.number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-6 mb-6">
            {/* Card Image */}
            <div className="flex-shrink-0">
              <div className="relative w-64 h-80 bg-muted rounded-lg overflow-hidden">
                {card.image_url_small ? (
                  <Image
                    src={card.image_url_small}
                    alt={card.name}
                    fill
                    className="object-contain"
                    sizes="256px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🃏</div>
                      <div className="text-sm">No Image Available</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Card Info */}
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="font-semibold mb-2">Performance Trends</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Raw Δ5d:</span>
                      <span className={`font-mono text-sm ${
                        card.raw_delta_5d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.raw_delta_5d >= 0 ? '+' : ''}{card.raw_delta_5d.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Raw Δ30d:</span>
                      <span className={`font-mono text-sm ${
                        card.raw_delta_30d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.raw_delta_30d >= 0 ? '+' : ''}{card.raw_delta_30d.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Raw Δ90d:</span>
                      <span className={`font-mono text-sm ${
                        card.raw_delta_90d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.raw_delta_90d >= 0 ? '+' : ''}{card.raw_delta_90d.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="font-semibold mb-2">PSA 10 Trends</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">PSA 10 Δ5d:</span>
                      <span className={`font-mono text-sm ${
                        card.psa10_delta_5d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.psa10_delta_5d >= 0 ? '+' : ''}{card.psa10_delta_5d.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">PSA 10 Δ30d:</span>
                      <span className={`font-mono text-sm ${
                        card.psa10_delta_30d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.psa10_delta_30d >= 0 ? '+' : ''}{card.psa10_delta_30d.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">PSA 10 Δ90d:</span>
                      <span className={`font-mono text-sm ${
                        card.psa10_delta_90d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.psa10_delta_90d >= 0 ? '+' : ''}{card.psa10_delta_90d.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="font-semibold mb-2">Market Analysis</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Raw Price:</span>
                      <span className="font-mono text-sm">${card.raw_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">PSA 10 Price:</span>
                      <span className="font-mono text-sm">${card.psa10_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Spread after fees:</span>
                      <span className={`font-mono text-sm ${
                        card.spread_after_fees >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.spread_after_fees >= 0 ? '+' : ''}${card.spread_after_fees.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">ROI:</span>
                      <span className={`font-mono text-sm ${
                        card.spread_after_fees >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {((card.spread_after_fees / (card.raw_price + 25)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="font-semibold mb-2">PSA Population</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">PSA 9 Count:</span>
                      <span className="font-mono text-sm">{card.psa9_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">PSA 10 Count:</span>
                      <span className="font-mono text-sm">{card.psa10_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total PSA:</span>
                      <span className="font-mono text-sm">{card.total_psa_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Volume Score:</span>
                      <span className="font-mono text-sm">{card.volume_score.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="font-semibold mb-2">Risk & Recommendation</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price Volatility:</span>
                      <span className="font-mono text-sm">{card.price_volatility.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Rarity:</span>
                      <span className="text-sm">{card.rarity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Grading Rec:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        card.grading_recommendation === 'Strong Buy' ? 'bg-green-100 text-green-800' :
                        card.grading_recommendation === 'Buy' ? 'bg-blue-100 text-blue-800' :
                        card.grading_recommendation === 'Hold' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {card.grading_recommendation}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  card.confidence === 'High' ? 'bg-green-100 text-green-800' :
                  card.confidence === 'Speculative' ? 'bg-amber-100 text-amber-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {card.confidence} Confidence
                </span>
                <span className="text-sm text-muted-foreground">
                  Based on {card.volume_score.toFixed(0)} sales volume
                </span>
              </div>
            </div>
          </div>
          
          {/* Charts Section */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-semibold mb-4">Price Trends (30 Days)</h3>
              {isLoadingCharts ? (
                <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
                  <span className="text-muted-foreground">Loading chart data...</span>
                </div>
              ) : chartData ? (
                <PriceChart data={chartData.priceHistory} cardName={card.name} />
              ) : (
                <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
                  <span className="text-muted-foreground">No chart data available</span>
                </div>
              )}
            </div>
            
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-semibold mb-4">PSA Population Trends (14 Days)</h3>
              {isLoadingCharts ? (
                <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
                  <span className="text-muted-foreground">Loading chart data...</span>
                </div>
              ) : chartData ? (
                <PopulationChart data={chartData.populationHistory} cardName={card.name} />
              ) : (
                <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
                  <span className="text-muted-foreground">No chart data available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
