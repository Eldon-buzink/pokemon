'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface SortControlsProps {
  currentSort: string
  cardCount: number
}

export function SortControls({ currentSort, cardCount }: SortControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSortChange = (sortBy: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sortBy', sortBy)
    router.push(`/analysis?${params.toString()}`)
  }

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {cardCount} cards found
      </div>
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Sort by:</label>
        <select 
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
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
  )
}
