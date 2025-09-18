export type PSA10Chance = {
  pct: number | null;
  band: 'Unknown' | 'Low' | 'Medium' | 'High';
};

export function psa10Chance(rawCents?: number | null, psa10Cents?: number | null): PSA10Chance {
  if (!rawCents || !psa10Cents || rawCents <= 0) {
    return { pct: null, band: 'Unknown' as const };
  }
  
  const R = Math.max(psa10Cents / rawCents, 1);
  
  // Heuristic curve: base 15%, grows slowly with premium, capped at 90%
  let p = 0.15 + 0.10 * Math.log10(R);
  p = Math.max(0.0, Math.min(0.90, p));
  
  const band = p >= 0.55 ? 'High' : p >= 0.35 ? 'Medium' : 'Low';
  
  return { 
    pct: Math.round(p * 100), 
    band 
  };
}

// Helper function to format PSA10 chance for display
export function formatPSA10Chance(chance: PSA10Chance): string {
  if (chance.pct === null) {
    return 'Unknown';
  }
  
  return `${chance.band} (${chance.pct}%)`;
}

// Helper function to get badge color for PSA10 chance
export function getPSA10ChanceBadgeColor(band: PSA10Chance['band']): string {
  switch (band) {
    case 'High': return 'bg-green-100 text-green-800';
    case 'Medium': return 'bg-yellow-100 text-yellow-800';
    case 'Low': return 'bg-red-100 text-red-800';
    case 'Unknown': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
