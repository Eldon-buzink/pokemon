interface CardMetrics {
  delta5dRaw: number
  delta5dPsa10: number
  volumeScore: number
  pop10Delta5d: number
  spreadAfterFees: number
  psa10Median: number
  psa10ProbAdj: number
  gradedN: number
  iqrWidth: number
  median: number
}

type ConfidenceLevel = 'High' | 'Speculative' | 'Noisy'

/**
 * Calculate PSA10 probability trio as defined in score.md
 */
export function calculatePSA10Probabilities(
  totalGrades: number,
  psa10Count: number,
  recentGrades: number,
  recentPsa10Count: number,
  popGrowthRate: number
): {
  lifetime: number
  rolling: number
  adjusted: number
} {
  const lifetime = totalGrades > 0 ? psa10Count / totalGrades : 0
  const rolling = recentGrades > 0 ? recentPsa10Count / recentGrades : 0
  
  // Adjusted probability with population growth penalty
  const k = 0.1 // Penalty factor
  const penalty = 1 / (1 + k * Math.max(0, popGrowthRate))
  const adjusted = rolling * penalty
  
  return { lifetime, rolling, adjusted }
}

/**
 * Calculate confidence level based on volume and data quality
 */
export function calculateConfidence(
  gradedN: number,
  iqrWidth: number,
  median: number
): ConfidenceLevel {
  const iqrRatio = median > 0 ? (iqrWidth / median) * 100 : 100
  
  if (gradedN >= 8 && iqrRatio <= 25) {
    return 'High'
  } else if (gradedN >= 3 && gradedN <= 7) {
    return 'Speculative'
  } else {
    return 'Noisy'
  }
}

/**
 * Calculate main ranking score as defined in score.md
 */
export function calculateRankingScore(metrics: CardMetrics): number {
  const {
    delta5dPsa10,
    delta5dRaw,
    volumeScore,
    pop10Delta5d,
    spreadAfterFees,
    psa10Median,
    psa10ProbAdj
  } = metrics
  
  // Z-score normalization (simplified - in practice you'd use population stats)
  const zVolume = (volumeScore - 0.5) * 2 // Normalize to roughly [-1, 1]
  const zPopDelta = Math.max(-2, Math.min(2, pop10Delta5d / 10)) // Normalize pop delta
  
  // Main score components
  const score = 
    0.4 * delta5dPsa10 +
    0.2 * delta5dRaw +
    0.2 * zVolume -
    0.2 * zPopDelta
  
  // Add spread component
  const spreadComponent = psa10Median > 0 
    ? 0.2 * (spreadAfterFees / psa10Median) * psa10ProbAdj
    : 0
  
  return score + spreadComponent
}

/**
 * Calculate spread after fees
 */
export function calculateSpreadAfterFees(
  psa10Price: number,
  rawPrice: number,
  fees: {
    psaGrading: number
    shipping: number
    marketplace: number
  }
): number {
  const totalFees = fees.psaGrading + fees.shipping + fees.marketplace
  return psa10Price - (rawPrice + totalFees)
}

/**
 * Get fee structure based on PSA tier and card value
 */
export function getFeeStructure(
  cardValue: number,
  psaTier: 'value' | 'regular' | 'express' | 'walkthrough' = 'regular'
): {
  psaGrading: number
  shipping: number
  marketplace: number
} {
  const feeStructure = {
    value: { psaGrading: 15, shipping: 5, marketplace: 0.03 },
    regular: { psaGrading: 25, shipping: 5, marketplace: 0.03 },
    express: { psaGrading: 50, shipping: 5, marketplace: 0.03 },
    walkthrough: { psaGrading: 200, shipping: 5, marketplace: 0.03 }
  }
  
  const base = feeStructure[psaTier]
  return {
    psaGrading: base.psaGrading,
    shipping: base.shipping,
    marketplace: cardValue * base.marketplace
  }
}
