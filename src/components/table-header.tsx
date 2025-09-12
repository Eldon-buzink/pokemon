'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface TableHeaderProps {
  cardCount: number
  currentSort: string
}

export function TableHeader({ cardCount, currentSort }: TableHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSortChange = (sortBy: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sortBy', sortBy)
    router.push(`/analysis?${params.toString()}`)
  }

  return (
    <div className="flex justify-between items-center p-4 border-b bg-gray-50">
      <div className="text-sm text-muted-foreground">
        {cardCount} cards found
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Sort by:</label>
        <select 
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="profit_loss">Profit/Loss</option>
          <option value="psa10_delta_5d">PSA 10 Δ 5d</option>
          <option value="raw_delta_5d">Raw Δ 5d</option>
          <option value="psa10_delta_30d">PSA 10 Δ 30d</option>
          <option value="raw_delta_30d">Raw Δ 30d</option>
          <option value="raw_price">Raw Price</option>
          <option value="psa10_price">PSA 10 Price</option>
          <option value="confidence">Confidence</option>
          <option value="volume_score">Volume Score</option>
        </select>
      </div>
    </div>
  )
}
