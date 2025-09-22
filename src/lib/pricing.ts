import { PriceHistory, MarketNow, Estimation, GemRate, RoiEstimate } from './types';
import { isSuspiciousRatio } from './quality';

/**
 * Calculate median from array of numbers
 */
export function median(nums: number[]): number | null {
  const arr = nums.filter(n => Number.isFinite(n)).slice().sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

/**
 * Compute gem rate (PSA10 chance) from population data
 */
export function computeGemRate(
  pop: { psa10: number; psa9: number; psa8?: number }, 
  opts?: { useEight?: boolean }
): GemRate {
  const { psa10, psa9, psa8 = 0 } = pop;
  const { useEight = false } = opts ?? {};
  
  // Calculate total relevant population
  const totalRelevant = useEight ? psa10 + psa9 + psa8 : psa10 + psa9;
  const totalPop = psa10 + psa9 + psa8;
  
  if (totalRelevant <= 0) {
    return {
      value: null,
      basis: "unknown",
      confidence: "none"
    };
  }
  
  const gemRate = psa10 / totalRelevant;
  
  // Determine confidence based on sample size
  let confidence: "high" | "medium" | "low" | "none";
  if (totalPop >= 500) {
    confidence = "high";
  } else if (totalPop >= 100) {
    confidence = "medium";
  } else if (totalPop >= 10) {
    confidence = "low";
  } else {
    confidence = "none";
  }
  
  return {
    value: gemRate,
    basis: useEight ? "8v9v10" : "9v10",
    confidence
  };
}

/**
 * Estimate PSA10 price using hierarchical approach
 */
export function estimatePsa10Price({
  marketNow,
  history,
  setPeers
}: {
  marketNow: MarketNow;
  history: PriceHistory;
  setPeers: Array<{ raw: number; psa10: number }>;
}): Estimation {
  // Method 1: Observed recent PSA10 sales
  const recentPsa10Sales = history
    .filter(point => point.psa10Usd && point.psa10Usd > 0)
    .slice(-30) // Last 30 data points
    .map(point => point.psa10Usd!)
    .filter(price => price > 0);
    
  if (recentPsa10Sales.length >= 3) {
    const medianValue = median(recentPsa10Sales);
    
    return {
      value: medianValue,
      method: "observed",
      confidence: recentPsa10Sales.length >= 8 ? "high" : "medium",
      sample: recentPsa10Sales.length
    };
  }
  
  // Method 2: Set-ratio based on peers
  if (setPeers.length >= 3 && marketNow.rawUsd && marketNow.rawUsd > 0) {
    const ratios = setPeers
      .filter(peer => peer.raw > 0 && peer.psa10 > 0)
      .map(peer => peer.psa10 / peer.raw);
      
    if (ratios.length >= 3) {
      const medianRatio = median(ratios);
      
      if (medianRatio) {
        return {
          value: Math.round(marketNow.rawUsd * medianRatio * 100) / 100,
          method: "set-ratio",
          confidence: "medium",
          sample: ratios.length
        };
      }
    }
  }
  
  // Method 3: Global ratio fallback - updated based on PriceCharting analysis
  if (marketNow.rawUsd && marketNow.rawUsd > 0) {
    // More realistic ratios based on PriceCharting data analysis:
    // Charizard #4 Celebrations: $394.21 PSA10 / $114.33 Raw = 3.45x
    // Most modern cards fall in 3.5-5.5x range
    const globalRatio = 4.5; // Updated based on real market data
    
    return {
      value: Math.round(marketNow.rawUsd * globalRatio * 100) / 100,
      method: "global-ratio",
      confidence: "low",
      sample: 1
    };
  }
  
  // No estimation possible
  return {
    value: null,
    method: "unknown",
    confidence: "none"
  };
}

/**
 * Estimate ROI for grading decision
 */
export function estimateRoi({
  raw,
  gradingFee,
  estPsa10,
  gemRate
}: {
  raw?: number | null;
  gradingFee: number;
  estPsa10?: number | null;
  gemRate?: number | null;
}): RoiEstimate {
  if (!raw || raw <= 0 || !estPsa10 || estPsa10 <= 0 || !gemRate || gemRate <= 0) {
    return {
      gross: null,
      net: null,
      roiPct: null
    };
  }
  
  const expected = estPsa10 * gemRate;
  const totalCost = raw + gradingFee;
  const gross = expected - raw;
  const net = expected - totalCost;
  const roiPct = net / totalCost;
  
  return {
    gross,
    net,
    roiPct
  };
}
