/**
 * Sales data abstraction layer
 * Allows swapping between different data sources (Cardmarket, PPT, mocks)
 */

export type CardKey = { set: string; number: string; name?: string };
export type Market = 'raw' | 'psa9' | 'psa10';
export type Sale = { 
  soldAt: string; 
  priceEur: number; 
  condition?: string; 
  source?: string; 
};

export interface SalesProvider {
  fetchSales(card: CardKey, market: Market, days: number): Promise<Sale[]>;
}

/**
 * Mock sales provider for development and testing
 * Generates deterministic fake data with sinusoidal growth + noise
 */
export class MockSalesProvider implements SalesProvider {
  async fetchSales(card: CardKey, market: Market, days: number): Promise<Sale[]> {
    const sales: Sale[] = [];
    const now = new Date();
    
    // Base price varies by market
    const basePrice = this.getBasePrice(card, market);
    
    // Generate sales for the specified number of days
    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Generate 0-3 sales per day (more for popular cards)
      const salesCount = this.getSalesCount(card, i);
      
      for (let j = 0; j < salesCount; j++) {
        const price = this.generatePrice(basePrice, i, market);
        const condition = this.getRandomCondition();
        
        sales.push({
          soldAt: date.toISOString(),
          priceEur: price,
          condition,
          source: 'mock',
        });
      }
    }
    
    return sales;
  }
  
  private getBasePrice(card: CardKey, market: Market): number {
    // Base prices in EUR
    const basePrices = {
      raw: 50,
      psa9: 200,
      psa10: 500,
    };
    
    // Adjust based on card characteristics
    let multiplier = 1;
    
    // Popular cards are more expensive
    if (card.name?.toLowerCase().includes('charizard')) multiplier *= 3;
    if (card.name?.toLowerCase().includes('pikachu')) multiplier *= 2;
    if (card.name?.toLowerCase().includes('mew')) multiplier *= 1.5;
    
    // Newer sets tend to be more expensive
    if (card.set.includes('151')) multiplier *= 1.2;
    if (card.set.includes('Crown Zenith')) multiplier *= 1.1;
    
    return basePrices[market] * multiplier;
  }
  
  private getSalesCount(card: CardKey, daysAgo: number): number {
    // More sales for popular cards
    let baseCount = 1;
    
    if (card.name?.toLowerCase().includes('charizard')) baseCount = 3;
    if (card.name?.toLowerCase().includes('pikachu')) baseCount = 2;
    
    // More recent sales (exponential decay)
    const recencyFactor = Math.exp(-daysAgo / 30);
    
    // Add some randomness
    const randomFactor = 0.5 + Math.random();
    
    return Math.floor(baseCount * recencyFactor * randomFactor);
  }
  
  private generatePrice(basePrice: number, daysAgo: number, market: Market): number {
    // Sinusoidal growth trend
    const trend = Math.sin((90 - daysAgo) * Math.PI / 180) * 0.2;
    
    // Add some noise
    const noise = (Math.random() - 0.5) * 0.1;
    
    // Market-specific volatility
    const volatility = market === 'raw' ? 0.05 : 0.1;
    const marketNoise = (Math.random() - 0.5) * volatility;
    
    const price = basePrice * (1 + trend + noise + marketNoise);
    
    // Ensure minimum price
    return Math.max(price, basePrice * 0.1);
  }
  
  private getRandomCondition(): string {
    const conditions = ['NM', 'EX', 'LP', 'MP'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }
}

/**
 * Helper function to get price series from sales provider
 */
export async function getSeries(
  provider: SalesProvider,
  key: CardKey,
  market: Market,
  days: number
): Promise<{ date: string; price: number }[]> {
  const sales = await provider.fetchSales(key, market, days);
  
  // Group sales by date and calculate daily medians
  const dailySales = new Map<string, number[]>();
  
  for (const sale of sales) {
    const date = sale.soldAt.split('T')[0]; // Get YYYY-MM-DD
    if (!dailySales.has(date)) {
      dailySales.set(date, []);
    }
    dailySales.get(date)!.push(sale.priceEur);
  }
  
  // Calculate daily medians
  const series: { date: string; price: number }[] = [];
  
  for (const [date, prices] of dailySales) {
    if (prices.length > 0) {
      // Calculate median price for the day
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const median = sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
        : sortedPrices[Math.floor(sortedPrices.length / 2)];
      
      series.push({ date, price: median });
    }
  }
  
  return series.sort((a, b) => a.date.localeCompare(b.date));
}
