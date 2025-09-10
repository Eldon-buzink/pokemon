interface PriceData {
  price: number
  date: string
}

interface SalesData {
  price: number
  sold_date: string
}

/**
 * Calculate median price from an array of prices
 */
export function calculateMedian(prices: number[]): number {
  if (prices.length === 0) return 0
  
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Calculate IQR (Interquartile Range) for outlier detection
 */
export function calculateIQR(prices: number[]): { q1: number; q3: number; iqr: number } {
  if (prices.length === 0) return { q1: 0, q3: 0, iqr: 0 }
  
  const sorted = [...prices].sort((a, b) => a - b)
  const q1Index = Math.floor(sorted.length * 0.25)
  const q3Index = Math.floor(sorted.length * 0.75)
  
  const q1 = sorted[q1Index]
  const q3 = sorted[q3Index]
  const iqr = q3 - q1
  
  return { q1, q3, iqr }
}

/**
 * Remove outliers using IQR method (Q1 - 1.5*IQR to Q3 + 1.5*IQR)
 */
export function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices // Need at least 4 points for IQR
  
  const { q1, q3, iqr } = calculateIQR(prices)
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  
  return prices.filter(price => price >= lowerBound && price <= upperBound)
}

/**
 * Calculate 5-day price delta as percentage change
 */
export function calculateDelta5d(currentPrice: number, price5DaysAgo: number): number {
  if (price5DaysAgo === 0) return 0
  return ((currentPrice - price5DaysAgo) / price5DaysAgo) * 100
}

/**
 * Calculate daily aggregates for a card
 */
export function calculateDailyAggregates(
  rawPrices: PriceData[],
  gradedSales: SalesData[],
  _grade: number
): {
  rawMedian: number
  rawN: number
  gradedMedian: number
  gradedN: number
} {
  const rawMedian = calculateMedian(rawPrices.map(p => p.price))
  const rawN = rawPrices.length
  
  const gradedForGrade = gradedSales.filter(s => s.price > 0) // Filter out invalid prices
  const gradedMedian = calculateMedian(gradedForGrade.map(s => s.price))
  const gradedN = gradedForGrade.length
  
  return {
    rawMedian,
    rawN,
    gradedMedian,
    gradedN
  }
}

/**
 * Calculate volume score based on number of sales
 */
export function calculateVolumeScore(nSales: number): number {
  // Normalize volume score between 0 and 1
  // More sales = higher score, with diminishing returns
  return Math.min(1, Math.log10(nSales + 1) / 2)
}
