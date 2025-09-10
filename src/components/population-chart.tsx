'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { type PopulationDataPoint } from '@/lib/actions/chart-data'

interface PopulationChartProps {
  data: PopulationDataPoint[]
  cardName?: string
}

export function PopulationChart({ data }: PopulationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
        <span className="text-muted-foreground">No population data available</span>
      </div>
    )
  }

  // Group data by date and format for Recharts
  const groupedData = data.reduce((acc, point) => {
    const date = new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!acc[date]) {
      acc[date] = { date }
    }
    acc[date][point.grade] = point.count
    return acc
  }, {} as Record<string, Record<string, number>>)

  const chartData = Object.values(groupedData).slice(-14) // Show last 14 days

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#666' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#666' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            formatter={(value: number, name: string) => [
              value,
              name
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Bar 
            dataKey="PSA 9" 
            fill="#3b82f6" 
            name="PSA 9"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="PSA 10" 
            fill="#ef4444" 
            name="PSA 10"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
