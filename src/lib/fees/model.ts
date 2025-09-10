export interface FeeStructure {
  psaGrading: number
  shipping: number
  marketplace: number
  turnaround: number // days
}

export interface PSATier {
  name: string
  minValue: number
  maxValue: number
  fees: FeeStructure
}

export const PSA_TIERS: PSATier[] = [
  {
    name: 'Value',
    minValue: 0,
    maxValue: 199,
    fees: {
      psaGrading: 15,
      shipping: 5,
      marketplace: 0.03, // 3%
      turnaround: 45
    }
  },
  {
    name: 'Regular',
    minValue: 200,
    maxValue: 499,
    fees: {
      psaGrading: 25,
      shipping: 5,
      marketplace: 0.03,
      turnaround: 20
    }
  },
  {
    name: 'Express',
    minValue: 500,
    maxValue: 999,
    fees: {
      psaGrading: 50,
      shipping: 5,
      marketplace: 0.03,
      turnaround: 10
    }
  },
  {
    name: 'Walkthrough',
    minValue: 1000,
    maxValue: Infinity,
    fees: {
      psaGrading: 200,
      shipping: 5,
      marketplace: 0.03,
      turnaround: 3
    }
  }
]

/**
 * Get the appropriate PSA tier for a card value
 */
export function getPSATier(cardValue: number): PSATier {
  return PSA_TIERS.find(tier => 
    cardValue >= tier.minValue && cardValue <= tier.maxValue
  ) || PSA_TIERS[0] // Default to Value tier
}

/**
 * Calculate total fees for a card
 */
export function calculateTotalFees(cardValue: number, psaTier?: PSATier): number {
  const tier = psaTier || getPSATier(cardValue)
  const marketplaceFee = cardValue * tier.fees.marketplace
  
  return tier.fees.psaGrading + tier.fees.shipping + marketplaceFee
}

/**
 * Calculate spread after fees
 */
export function calculateSpread(
  psa10Price: number,
  rawPrice: number,
  cardValue: number
): number {
  const totalFees = calculateTotalFees(cardValue)
  return psa10Price - (rawPrice + totalFees)
}

/**
 * Get turnaround time for a card value
 */
export function getTurnaroundDays(cardValue: number): number {
  const tier = getPSATier(cardValue)
  return tier.fees.turnaround
}
