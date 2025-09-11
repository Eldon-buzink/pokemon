/**
 * PSA 10 probability estimator (Gem Rate)
 * Implements conservative p10 estimators with method and confidence scoring
 */

export type GemRate = { 
  p10: number; 
  method: 'pop-proxy' | 'recent-proxy' | 'set-default'; 
  confidence: number 
};

export type PopSnapshot = { 
  pop8: number; 
  pop9: number; 
  pop10: number; 
  total: number; 
  windowDays?: number 
};

/**
 * Set-specific baseline PSA 10 probabilities
 * Based on historical grading data and set characteristics
 */
const SET_BASELINES: Record<string, number> = {
  // Modern alt arts - higher gem rate due to better printing quality
  'Crown Zenith': 0.25,
  'Paldean Fates': 0.22,
  '151': 0.20,
  'Brilliant Stars': 0.18,
  'Lost Origin': 0.18,
  'Astral Radiance': 0.16,
  'SWSH Black Star Promos': 0.15,
  
  // Celebrations - special set with higher gem rate
  'Celebrations': 0.30,
  'Celebrations Classic': 0.25,
  
  // Vintage sets - lower gem rate due to age and handling
  'Base Set': 0.08,
  'Jungle': 0.10,
  'Fossil': 0.10,
  'Team Rocket': 0.12,
  'Gym Heroes': 0.12,
  'Gym Challenge': 0.12,
  'Neo Genesis': 0.15,
  'Neo Discovery': 0.15,
  'Neo Destiny': 0.15,
  'Neo Revelation': 0.15,
  
  // Default for unknown sets
  'default': 0.15,
};

/**
 * Estimate PSA 10 probability for a card
 */
export function estimateGemRate(opts: {
  set: string;
  number: string;
  ageDays?: number;
  pop?: PopSnapshot;
  recent?: PopSnapshot;
}): GemRate {
  const { set, number, ageDays, pop, recent } = opts;
  
  // Method 1: Recent data (most reliable)
  if (recent && recent.total > 0) {
    const p10 = recent.pop10 / Math.max(recent.total, 1);
    const confidence = Math.min(1, recent.total / 100);
    
    return {
      p10: Math.max(0.03, Math.min(0.6, p10)), // Clamp to reasonable range
      method: 'recent-proxy',
      confidence,
    };
  }
  
  // Method 2: Historical population data
  if (pop && pop.total > 0) {
    const p10 = pop.pop10 / Math.max(pop.total, 1);
    const confidence = Math.min(1, pop.total / 300);
    
    return {
      p10: Math.max(0.03, Math.min(0.6, p10)), // Clamp to reasonable range
      method: 'pop-proxy',
      confidence,
    };
  }
  
  // Method 3: Set defaults (fallback)
  const baseline = SET_BASELINES[set] || SET_BASELINES['default'];
  
  // Adjust based on card characteristics
  let adjustedP10 = baseline;
  
  // Special cards tend to have higher gem rates
  if (number.includes('TG') || number.includes('Alt Art')) {
    adjustedP10 *= 1.2;
  }
  
  // Promo cards often have higher gem rates
  if (set.includes('Promo') || set.includes('Black Star')) {
    adjustedP10 *= 1.1;
  }
  
  // Very new cards might have higher gem rates (better condition)
  if (ageDays && ageDays < 30) {
    adjustedP10 *= 1.15;
  }
  
  // Very old cards have lower gem rates
  if (ageDays && ageDays > 365 * 5) {
    adjustedP10 *= 0.8;
  }
  
  return {
    p10: Math.max(0.03, Math.min(0.6, adjustedP10)), // Clamp to reasonable range
    method: 'set-default',
    confidence: 0.2, // Low confidence for set defaults
  };
}

/**
 * Get set baseline probability
 */
export function getSetBaseline(set: string): number {
  return SET_BASELINES[set] || SET_BASELINES['default'];
}

/**
 * Calculate expected PSA grade distribution
 */
export function calculateGradeDistribution(p10: number): {
  psa10: number;
  psa9: number;
  psa8: number;
  psa7: number;
  psa6: number;
} {
  // Based on typical grading patterns
  const psa9 = p10 * 0.3; // PSA 9 is typically 30% of PSA 10 rate
  const psa8 = p10 * 0.15; // PSA 8 is typically 15% of PSA 10 rate
  const psa7 = p10 * 0.05; // PSA 7 is typically 5% of PSA 10 rate
  const psa6 = p10 * 0.02; // PSA 6 is typically 2% of PSA 10 rate
  
  return {
    psa10: p10,
    psa9,
    psa8,
    psa7,
    psa6,
  };
}

/**
 * Calculate confidence score based on data quality
 */
export function calculateConfidence(
  method: GemRate['method'],
  dataPoints: number,
  ageDays?: number
): number {
  let confidence = 0;
  
  switch (method) {
    case 'recent-proxy':
      confidence = Math.min(1, dataPoints / 100);
      break;
    case 'pop-proxy':
      confidence = Math.min(1, dataPoints / 300);
      break;
    case 'set-default':
      confidence = 0.2;
      break;
  }
  
  // Adjust confidence based on card age
  if (ageDays) {
    if (ageDays < 30) {
      // Very new cards have lower confidence
      confidence *= 0.7;
    } else if (ageDays > 365 * 2) {
      // Older cards have slightly higher confidence
      confidence *= 1.1;
    }
  }
  
  return Math.max(0, Math.min(1, confidence));
}
