'use client';

import { PopHistory } from '@/lib/types';
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

interface PopTrendProps {
  data: PopHistory;
  range: "30d" | "90d" | "180d";
  className?: string;
}

export function PopTrend({ data, range, className = "" }: PopTrendProps) {
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
      psa10: point.psa10,
      psa9: point.psa9,
      total: point.total,
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
          <div className="text-xs mt-1">No population history available for {range}</div>
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
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip 
            formatter={(value: any, name: any) => [
              Number(value).toLocaleString(), 
              name === 'psa10' ? 'PSA 10' : 
              name === 'psa9' ? 'PSA 9' : 'Total'
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="psa10" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={false}
            name="PSA 10"
          />
          <Line 
            type="monotone" 
            dataKey="psa9" 
            stroke="#f59e0b" 
            strokeWidth={2}
            dot={false}
            name="PSA 9"
          />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#6b7280" 
            strokeWidth={2}
            dot={false}
            name="Total"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
