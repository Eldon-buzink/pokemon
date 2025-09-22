'use client';

import { pctDiff } from '@/lib/quality';

interface Psa10DeltaProps {
  local?: number | null;
  external?: number | null;
  className?: string;
}

export function Psa10Delta({ local, external, className = "" }: Psa10DeltaProps) {
  const d = pctDiff(local ?? null, external ?? null);
  
  if (d === null || !external) return null;
  
  const pct = Math.round(d * 100);
  const color = Math.abs(pct) > 25 ? "text-red-600" : 
                Math.abs(pct) > 10 ? "text-orange-600" : "text-muted-foreground";
  const sign = pct > 0 ? "+" : "";
  
  return (
    <span 
      className={`ml-2 text-xs ${color} ${className}`} 
      title={`Δ vs external benchmark: ${sign}${pct}%`}
    >
      Δ {sign}{pct}%
    </span>
  );
}
