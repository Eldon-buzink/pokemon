/**
 * Core metrics engine for Pokémon card analysis
 * Implements robust statistical calculations for price analysis
 */

export type Horizon = '5d' | '30d' | '90d';
export type Market = 'raw' | 'psa9' | 'psa10';
export type Series = { date: string; price: number }[];

export type BasicStats = {
  median5d: number;
  median30d: number;
  median90d: number;
  pct5d: number;
  pct30d: number;
  sales5d: number;
  sales30d: number;
  sales90d: number;
  volatility30d: number;
  L: number; // liquidity
  S: number; // stability
  momentum: number;
  removedOutliersCount?: number;
};

/**
 * Calculate median of an array of numbers
 */
export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Winsorize data by replacing extreme values with percentiles
 */
export function winsorize(
  nums: number[],
  lower = 0.05,
  upper = 0.95
): number[] {
  if (nums.length === 0) return [];
  
  const sorted = [...nums].sort((a, b) => a - b);
  const lowerIndex = Math.floor(sorted.length * lower);
  const upperIndex = Math.ceil(sorted.length * upper) - 1;
  
  const lowerBound = sorted[lowerIndex];
  const upperBound = sorted[upperIndex];
  
  return nums.map(num => 
    Math.max(lowerBound, Math.min(upperBound, num))
  );
}

/**
 * Calculate Median Absolute Deviation
 */
export function mad(nums: number[]): number {
  if (nums.length === 0) return 0;
  
  const med = median(nums);
  const deviations = nums.map(num => Math.abs(num - med));
  return median(deviations);
}

/**
 * Calculate percentage change between two values
 */
export function percentChange(shortMedian: number, longMedian: number): number {
  if (longMedian === 0) return 0;
  return (shortMedian - longMedian) / longMedian;
}

/**
 * Calculate liquidity score based on sales volume
 * Clamps sales30d/10 to [0,1] range
 */
export function liquidity(sales30d: number): number {
  return Math.max(0, Math.min(1, sales30d / 10));
}

/**
 * Calculate stability score based on volatility
 * 1 - clamp(volatility, 0, 1)
 */
export function stability(vol30d: number): number {
  return 1 - Math.max(0, Math.min(1, vol30d));
}

/**
 * Calculate momentum score
 * 0.5*pct5d + 0.3*pct30d + 0.2*L - 0.2*(1-S)
 */
export function momentum(
  pct5d: number,
  pct30d: number,
  L: number,
  S: number
): number {
  return 0.5 * pct5d + 0.3 * pct30d + 0.2 * L - 0.2 * (1 - S);
}

/**
 * Calculate expected value of grading
 * p10*psa10 + (1-p10)*psa9*(k||0.9)
 */
export function evGrade(params: {
  p10: number;
  psa10: number;
  psa9: number;
  k?: number;
}): number {
  const { p10, psa10, psa9, k = 0.9 } = params;
  return p10 * psa10 + (1 - p10) * psa9 * k;
}

/**
 * Calculate net expected value after grading costs
 */
export function gradingNetEv(params: {
  rawMedian30d: number;
  evGrade: number;
  gradeCostAllIn: number;
}): number {
  const { rawMedian30d, evGrade, gradeCostAllIn } = params;
  return evGrade - rawMedian30d - gradeCostAllIn;
}

/**
 * Calculate upside potential as percentage
 */
export function upside(net: number, rawMedian30d: number): number {
  if (rawMedian30d === 0) return 0;
  return net / rawMedian30d;
}

/**
 * Compute basic statistics for a price series
 */
export function computeBasicStats(
  series: Series,
  _options: {
    minCondition?: 'NM' | 'EX' | 'LP';
    minSales5d?: number;
    minSales30d?: number;
  } = {}
): BasicStats {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Filter series by time periods
  const series5d = series.filter(s => new Date(s.date) >= fiveDaysAgo);
  const series30d = series.filter(s => new Date(s.date) >= thirtyDaysAgo);
  const series90d = series.filter(s => new Date(s.date) >= ninetyDaysAgo);

  // Extract prices
  const prices5d = series5d.map(s => s.price);
  const prices30d = series30d.map(s => s.price);
  const prices90d = series90d.map(s => s.price);

  // Winsorize data to remove extreme outliers
  const winsorized5d = winsorize(prices5d);
  const winsorized30d = winsorize(prices30d);
  const winsorized90d = winsorize(prices90d);

  // Calculate medians
  const median5d = median(winsorized5d);
  const median30d = median(winsorized30d);
  const median90d = median(winsorized90d);

  // Calculate percentage changes
  const pct5d = percentChange(median5d, median30d);
  const pct30d = percentChange(median30d, median90d);

  // Calculate sales counts
  const sales5d = series5d.length;
  const sales30d = series30d.length;
  const sales90d = series90d.length;

  // Calculate volatility (MAD/median over 30d)
  const mad30d = mad(winsorized30d);
  const volatility30d = median30d > 0 ? mad30d / median30d : 0;

  // Calculate liquidity and stability
  const L = liquidity(sales30d);
  const S = stability(volatility30d);

  // Calculate momentum
  const momentumScore = momentum(pct5d, pct30d, L, S);

  // Count removed outliers
  const removedOutliersCount = prices30d.length - winsorized30d.length;

  return {
    median5d,
    median30d,
    median90d,
    pct5d,
    pct30d,
    sales5d,
    sales30d,
    sales90d,
    volatility30d,
    L,
    S,
    momentum: momentumScore,
    removedOutliersCount,
  };
}
