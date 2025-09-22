// External benchmark integration for price validation

export interface ExternalBenchmark {
  priceChartingPsa10?: number | null;
  updatedAt?: string;
  source?: string;
}

/**
 * Get PriceCharting benchmark for a card (mock implementation for now)
 * In production, this would call PriceCharting API or scrape data
 */
export async function getPriceChartingBenchmark(setId: string, number: string): Promise<ExternalBenchmark | null> {
  // Mock data based on known PriceCharting values and market estimates
  const mockBenchmarks: Record<string, number> = {
    // Celebrations Classic Collection
    'cel25c-4': 394.21,  // Charizard #4 from PriceCharting
    'cel25c-1': 220.00,  // Venusaur estimate
    'cel25c-2': 200.00,  // Blastoise estimate
    'cel25c-3': 394.21,  // Another Charizard
    'cel25c-76': 185.00, // M Rayquaza-EX
    
    // Celebrations
    'cel25-25': 75.00,   // Flying Pikachu VMAX
    'cel25-6': 60.00,    // Surfing Pikachu V
    'cel25-4': 45.00,    // Pikachu V-UNION
    'cel25-10': 25.00,   // Professor's Research
    
    // 151 (Very popular set)
    'sv35-150': 285.00,  // Charizard ex Special Illustration Rare
    'sv35-25': 120.00,   // Pikachu ex Special Illustration Rare
    'sv35-151': 95.00,   // Mew ex Special Illustration Rare
    'sv35-1': 180.00,    // Alakazam ex Special Illustration Rare
    
    // Scarlet & Violet Base Set
    'sv01-1': 165.00,    // Charizard ex Special Illustration Rare
    'sv01-25': 85.00,    // Pikachu ex
    'sv01-150': 120.00,  // Mewtwo ex
    
    // Prismatic Evolutions (Latest popular set)
    'sv10-1': 195.00,    // Charizard ex Rainbow Rare
    'sv10-25': 95.00,    // Pikachu ex Rainbow Rare
    'sv10-150': 135.00,  // Mewtwo ex Rainbow Rare
    'sv10-196': 110.00,  // Espeon ex Rainbow Rare
    'sv10-197': 115.00,  // Umbreon ex Rainbow Rare
    
    // Pokemon GO
    'pgo-1': 125.00,     // Charizard V
    'pgo-25': 65.00,     // Pikachu V
    'pgo-150': 85.00,    // Mewtwo V
    
    // Brilliant Stars
    'swsh11-1': 145.00,  // Charizard V
    'swsh11-25': 55.00,  // Pikachu V
    'swsh11-172': 95.00, // Charizard VSTAR
    
    // Journey Together
    'sv11-1': 125.00,    // Charizard ex
    'sv11-25': 75.00,    // Pikachu ex
    'sv11-150': 95.00,   // Mewtwo ex
    
    // Space-Time Smackdown
    'sv115-1': 135.00,   // Charizard ex
    'sv115-25': 80.00,   // Pikachu ex
    'sv115-150': 105.00, // Mewtwo ex
    
    // Mega Evolutions (Latest set)
    'sv12-1': 195.00,    // Mega Charizard ex (premium pricing)
    'sv12-25': 125.00,   // Mega Pikachu ex
    'sv12-150': 165.00,  // Mega Mewtwo ex
    'sv12-6': 145.00,    // Mega Blastoise ex
    'sv12-3': 155.00     // Mega Venusaur ex
  };
  
  const key = `${setId}-${number}`;
  const price = mockBenchmarks[key];
  
  if (price) {
    return {
      priceChartingPsa10: price,
      updatedAt: new Date().toISOString(),
      source: 'PriceCharting'
    };
  }
  
  return null;
}

/**
 * Calculate how far off our estimate is from PriceCharting
 */
export function calculateBenchmarkDelta(ourEstimate?: number | null, benchmark?: number | null): {
  deltaPercent: number | null;
  isSignificant: boolean;
  direction: 'over' | 'under' | 'close' | 'unknown';
} {
  if (!ourEstimate || !benchmark) {
    return { deltaPercent: null, isSignificant: false, direction: 'unknown' };
  }
  
  const delta = (ourEstimate - benchmark) / benchmark;
  const deltaPercent = Math.round(delta * 100);
  const isSignificant = Math.abs(deltaPercent) > 15; // >15% difference is significant
  
  const direction = deltaPercent > 15 ? 'over' : 
                   deltaPercent < -15 ? 'under' : 'close';
  
  return { deltaPercent, isSignificant, direction };
}
