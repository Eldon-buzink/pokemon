'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { type PriceDataPoint } from '@/lib/services/chart-data'

interface PriceChartProps {
  data: PriceDataPoint[]
  cardName: string
}

export function PriceChart({ data, cardName }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
        <span className="text-muted-foreground">No price data available</span>
      </div>
    )
  }

  // Format data for Recharts
  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rawPrice: point.rawPrice,
    psa10Price: point.psa10Price,
    sales: point.sales
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#666' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#666' }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            formatter={(value: number, name: string) => [
              `$${value.toFixed(2)}`,
              name === 'rawPrice' ? 'Raw Price' : name === 'psa10Price' ? 'PSA 10 Price' : 'Sales'
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="rawPrice" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            name="Raw Price"
          />
          <Line 
            type="monotone" 
            dataKey="psa10Price" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
            name="PSA 10 Price"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
