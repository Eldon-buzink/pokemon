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
      <div className="flex items-center gap-2 text-sm text-gray-500">
        💡 Click column headers to sort
      </div>
    </div>
  )
}
