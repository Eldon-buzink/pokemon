'use client';

import { PriceHistory } from '@/lib/types';
import dynamic from 'next/dynamic';

// Dynamically import Recharts to avoid SSR issues
const ResponsiveContainer = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  { ssr: false }
);
const LineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { ssr: false }
);
const Line = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Line })),
  { ssr: false }
);
const XAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.XAxis })),
  { ssr: false }
);
const YAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.YAxis })),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Tooltip })),
  { ssr: false }
);
// Legend removed due to typing issues

interface PriceTrendProps {
  data: PriceHistory;
  range: "30d" | "90d" | "180d";
  className?: string;
}

export function PriceTrend({ data, range, className = "" }: PriceTrendProps) {
  // Filter data based on range
  const now = new Date();
  const cutoffDate = new Date(now);
  
  switch (range) {
    case "30d":
      cutoffDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      cutoffDate.setDate(now.getDate() - 90);
      break;
    case "180d":
      cutoffDate.setDate(now.getDate() - 180);
      break;
  }
  
  const filteredData = data
    .filter(point => new Date(point.date) >= cutoffDate)
    .map(point => ({
      date: point.date,
      raw: point.rawUsd || null,
      psa10: point.psa10Usd || null,
      displayDate: new Date(point.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));
  
  if (filteredData.length === 0) {
    return (
      <div className={`h-[300px] flex items-center justify-center bg-gray-50 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-sm">Not enough data</div>
          <div className="text-xs mt-1">No price history available for {range}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`h-[300px] ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis 
            dataKey="displayDate" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            formatter={(value: any, name: any) => [
              value ? `$${Number(value).toFixed(2)}` : 'N/A', 
              name === 'raw' ? 'Raw Price' : 'PSA 10 Price'
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="raw" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            name="Raw Price"
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="psa10" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={false}
            name="PSA 10 Price"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
