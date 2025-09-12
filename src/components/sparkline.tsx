'use client'

import { useMemo } from 'react'

interface SparklineProps {
  data: { date: string; price: number }[]
  width?: number
  height?: number
  className?: string
  title?: string
  color?: string
}

export function Sparkline({ 
  data, 
  width = 100, 
  height = 20, 
  className = '',
  title,
  color = '#10b981'
}: SparklineProps) {
  const svgPath = useMemo(() => {
    if (data.length === 0) return ''
    
    const minPrice = Math.min(...data.map(d => d.price))
    const maxPrice = Math.max(...data.map(d => d.price))
    const priceRange = maxPrice - minPrice || 1
    
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((point.price - minPrice) / priceRange) * height
      return `${x},${y}`
    }).join(' ')
    
    return `M ${points}`
  }, [data, width, height])
  
  const trendColor = useMemo(() => {
    if (data.length < 2) return '#6b7280' // gray
    
    const firstPrice = data[0].price
    const lastPrice = data[data.length - 1].price
    const change = lastPrice - firstPrice
    
    if (change > 0) return '#10b981' // green
    if (change < 0) return '#ef4444' // red
    return '#6b7280' // gray
  }, [data])
  
  if (data.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center text-gray-400 text-xs ${className}`}
        style={{ width, height }}
        title={title}
      >
        No data
      </div>
    )
  }
  
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <path
        d={svgPath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface MiniSparklineProps {
  data: { date: string; price: number }[]
  className?: string
  color?: string
}

export function MiniSparkline({ data, className, color }: MiniSparklineProps) {
  return (
    <Sparkline
      data={data}
      width={60}
      height={16}
      className={className}
      color={color}
    />
  )
}
