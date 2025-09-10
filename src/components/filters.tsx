'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface FiltersProps {
  sets: string[]
  rarities: string[]
  currentFilters: {
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
}

export function Filters({ sets, rarities, currentFilters }: FiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState(currentFilters)

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Update URL with new filters
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value.toString())
    router.push(`/movers?${params.toString()}`)
  }

  const resetFilters = () => {
    const defaultFilters = {
      timePeriod: 5,
      sortBy: 'profit_loss',
      set: 'All Sets',
      rarity: 'All Rarities',
      minSales: 3,
      minPrice: 0,
      minProfitLoss: 0,
      psa10Only: false,
      highConfidenceOnly: false,
      // Enhanced filtering options
      minRawDelta: 0,
      minPsa10Delta: 0,
      maxVolatility: 0,
      gradingRecommendation: 'All',
    }
    setFilters(defaultFilters)
    router.push('/movers')
  }

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold">Filters</h3>
      
      <div className="space-y-4">
        {/* Quick Filter Buttons */}
        <div>
          <label className="text-sm font-medium mb-2 block">Quick Filters</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => {
                updateFilter('minRawDelta', 10)
                updateFilter('minPsa10Delta', 15)
                updateFilter('sortBy', 'psa10_delta_5d')
              }}
              className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 transition-colors"
            >
              🚀 Rising Values
            </button>
            <button 
              onClick={() => {
                updateFilter('gradingRecommendation', 'Strong Buy')
                updateFilter('sortBy', 'grading_recommendation')
              }}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              💎 Strong Buy
            </button>
            <button 
              onClick={() => {
                updateFilter('minRawDelta', 5)
                updateFilter('minPsa10Delta', 10)
                updateFilter('maxVolatility', 20)
              }}
              className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
            >
              📈 Stable Growth
            </button>
            <button 
              onClick={() => {
                updateFilter('highConfidenceOnly', true)
                updateFilter('minSales', 5)
              }}
              className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded hover:bg-orange-200 transition-colors"
            >
              ✅ High Confidence
            </button>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Time Period</label>
          <select 
            value={filters.timePeriod}
            onChange={(e) => updateFilter('timePeriod', parseInt(e.target.value))}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value={5}>5 Days</option>
            <option value={7}>7 Days</option>
            <option value={30}>30 Days</option>
            <option value={90}>90 Days</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Set</label>
          <select 
            value={filters.set}
            onChange={(e) => updateFilter('set', e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="All Sets">All Sets</option>
            {sets.map(set => (
              <option key={set} value={set}>{set}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Rarity</label>
          <select 
            value={filters.rarity}
            onChange={(e) => updateFilter('rarity', e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="All Rarities">All Rarities</option>
            {rarities.map(rarity => (
              <option key={rarity} value={rarity}>{rarity}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Min Sales Volume</label>
          <input 
            type="number"
            value={filters.minSales}
            onChange={(e) => updateFilter('minSales', parseInt(e.target.value) || 0)}
            className="w-full mt-1 p-2 border rounded-md"
            min="0"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Min Price ($)</label>
          <input 
            type="number"
            value={filters.minPrice}
            onChange={(e) => updateFilter('minPrice', parseFloat(e.target.value) || 0)}
            className="w-full mt-1 p-2 border rounded-md"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Min Profit/Loss ($)</label>
          <input 
            type="number"
            value={filters.minProfitLoss}
            onChange={(e) => updateFilter('minProfitLoss', parseFloat(e.target.value) || 0)}
            className="w-full mt-1 p-2 border rounded-md"
            step="0.01"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox"
            id="psa10_only"
            checked={filters.psa10Only}
            onChange={(e) => updateFilter('psa10Only', e.target.checked)}
            className="rounded" 
          />
          <label htmlFor="psa10_only" className="text-sm">PSA 10 Only</label>
        </div>

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox"
            id="high_confidence"
            checked={filters.highConfidenceOnly}
            onChange={(e) => updateFilter('highConfidenceOnly', e.target.checked)}
            className="rounded" 
          />
          <label htmlFor="high_confidence" className="text-sm">High Confidence Only</label>
        </div>

        {/* Enhanced Filtering Options */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 text-sm">Advanced Filters</h4>
          
          <div>
            <label className="text-sm font-medium">Min Raw Price Δ (%)</label>
            <input 
              type="number"
              value={filters.minRawDelta}
              onChange={(e) => updateFilter('minRawDelta', parseFloat(e.target.value) || 0)}
              className="w-full mt-1 p-2 border rounded-md"
              min="0"
              step="0.1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Min PSA 10 Δ (%)</label>
            <input 
              type="number"
              value={filters.minPsa10Delta}
              onChange={(e) => updateFilter('minPsa10Delta', parseFloat(e.target.value) || 0)}
              className="w-full mt-1 p-2 border rounded-md"
              min="0"
              step="0.1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Max Volatility (%)</label>
            <input 
              type="number"
              value={filters.maxVolatility}
              onChange={(e) => updateFilter('maxVolatility', parseFloat(e.target.value) || 0)}
              className="w-full mt-1 p-2 border rounded-md"
              min="0"
              step="0.1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Grading Recommendation</label>
            <select 
              value={filters.gradingRecommendation}
              onChange={(e) => updateFilter('gradingRecommendation', e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="All">All Recommendations</option>
              <option value="Strong Buy">Strong Buy</option>
              <option value="Buy">Buy</option>
              <option value="Hold">Hold</option>
              <option value="Avoid">Avoid</option>
            </select>
          </div>
        </div>
        
        <button 
          onClick={resetFilters}
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90"
        >
          Apply Filters
        </button>
        
        <button
          onClick={resetFilters}
          className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:bg-secondary/90"
        >
          Reset Filters
        </button>
      </div>
    </div>
  )
}