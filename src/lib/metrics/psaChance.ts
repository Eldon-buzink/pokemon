// src/lib/metrics/psaChance.ts

export interface PSAChanceResult {
  label: 'High' | 'Medium' | 'Low' | 'Unknown';
  pct: number | null;
}

export function psa10Chance(
  rawCents?: number | null, 
  psa10Cents?: number | null, 
  pop10?: number | null, 
  pop9?: number | null
): PSAChanceResult {
  if (!psa10Cents || !rawCents || rawCents <= 0) {
    return { label: 'Unknown', pct: null };
  }
  
  // Ratio of PSA10 price vs raw
  const ratio = psa10Cents / rawCents;
  
  // Crude probability proxy: if ratio is huge, chance is low
  // Higher ratios mean PSA10 is more valuable relative to raw, which often means it's harder to achieve
  let pct = 50 + 15 * Math.log10(Math.max(1, ratio));
  
  // Adjust based on population report if available
  if (pop10 && pop9 && (pop10 + pop9) > 0) {
    const rate = pop10 / (pop10 + pop9);
    pct = pct * rate; // Adjust down if PSA10 is hard to achieve based on population
  }
  
  // Clamp between 1-90%
  pct = Math.max(1, Math.min(90, Math.round(pct)));
  
  // Determine label based on percentage
  const label = pct >= 60 ? 'High' : pct >= 40 ? 'Medium' : 'Low';
  
  return { label, pct };
}
