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
    maxPrice: number
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
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateFilter = (key: string, value: string | number | boolean) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value.toString())
    router.push(`/analysis?${params.toString()}`)
  }

  const resetFilters = () => {
    const defaultFilters = {
      timePeriod: 5,
      sortBy: 'profit_loss',
      set: 'All Sets',
      rarity: 'All Rarities',
      minSales: 3,
      minPrice: 0,
      maxPrice: 10000,
      psa10Only: false,
      highConfidenceOnly: false,
      // Enhanced filtering options
      minRawDelta: 0,
      minPsa10Delta: 0,
      maxVolatility: 0,
      gradingRecommendation: 'All',
    }
    setFilters(defaultFilters)
    router.push('/analysis')
  }

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold">Filters</h3>
      
      <div className="space-y-4">
        {/* Quick Filter Buttons */}
        <div>
          <label className="text-sm font-medium mb-2 block">Quick Filters</label>
          <div className="space-y-2">
            <button 
              onClick={() => {
                updateFilter('minRawDelta', 10)
                updateFilter('minPsa10Delta', 15)
                updateFilter('sortBy', 'psa10_delta_5d')
              }}
              className="w-full text-xs bg-green-100 text-green-800 px-3 py-2 rounded hover:bg-green-200 transition-colors"
            >
              🚀 Rising Values
            </button>
            <button 
              onClick={() => {
                updateFilter('gradingRecommendation', 'Strong Buy')
                updateFilter('sortBy', 'grading_recommendation')
              }}
              className="w-full text-xs bg-blue-100 text-blue-800 px-3 py-2 rounded hover:bg-blue-200 transition-colors"
            >
              💎 Strong Buy
            </button>
            <button 
              onClick={() => {
                updateFilter('minRawDelta', 5)
                updateFilter('minPsa10Delta', 10)
                updateFilter('maxVolatility', 20)
              }}
              className="w-full text-xs bg-purple-100 text-purple-800 px-3 py-2 rounded hover:bg-purple-200 transition-colors"
            >
              📈 Stable Growth
            </button>
            <button 
              onClick={() => {
                updateFilter('highConfidenceOnly', true)
                updateFilter('minSales', 5)
              }}
              className="w-full text-xs bg-orange-100 text-orange-800 px-3 py-2 rounded hover:bg-orange-200 transition-colors"
            >
              ✅ High Confidence
            </button>
          </div>
        </div>

        {/* Basic Filters */}
        <div className="space-y-3">
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

          <div className="grid grid-cols-2 gap-2">
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
              <label className="text-sm font-medium">Max Price ($)</label>
              <input 
                type="number"
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', parseFloat(e.target.value) || 10000)}
                className="w-full mt-1 p-2 border rounded-md"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox"
              id="psa10_only"
              checked={filters.psa10Only}
              onChange={(e) => updateFilter('psa10Only', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="psa10_only" className="text-sm">PSA 10 data only</label>
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox"
              id="high_confidence"
              checked={filters.highConfidenceOnly}
              onChange={(e) => updateFilter('highConfidenceOnly', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="high_confidence" className="text-sm">High confidence only</label>
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        <div className="border-t pt-4">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>Advanced Filters</span>
            <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {showAdvanced && (
            <div className="mt-3 space-y-3">
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
                <label className="text-sm font-medium">Min Raw Price Change (%)</label>
                <input 
                  type="number"
                  value={filters.minRawDelta}
                  onChange={(e) => updateFilter('minRawDelta', parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2 border rounded-md"
                  step="0.1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Min PSA 10 Price Change (%)</label>
                <input 
                  type="number"
                  value={filters.minPsa10Delta}
                  onChange={(e) => updateFilter('minPsa10Delta', parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2 border rounded-md"
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
                  <option value="All">All</option>
                  <option value="Strong Buy">Strong Buy</option>
                  <option value="Buy">Buy</option>
                  <option value="Hold">Hold</option>
                  <option value="Avoid">Avoid</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={resetFilters}
          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  )
}