// Enhanced pricing algorithms and market trend analysis

export interface MarketTrend {
  period: '5d' | '30d' | '90d';
  trend: 'bullish' | 'bearish' | 'stable' | 'volatile';
  confidence: 'high' | 'medium' | 'low';
  changePercent: number;
  volatility: number;
  volume: number;
}

export interface PricingInsight {
  cardId: string;
  name: string;
  currentPrice: number;
  trend: MarketTrend;
  recommendation: 'buy' | 'hold' | 'sell' | 'watch';
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  potentialReturn: number;
}

export interface MarketAnalysis {
  overallTrend: 'bullish' | 'bearish' | 'mixed';
  hotCards: PricingInsight[];
  undervaluedCards: PricingInsight[];
  overvaluedCards: PricingInsight[];
  marketSummary: string;
}

// Enhanced pricing algorithms
export class EnhancedPricingEngine {
  
  // Calculate market trend with multiple indicators
  static calculateMarketTrend(
    prices: number[], 
    volumes: number[], 
    period: '5d' | '30d' | '90d'
  ): MarketTrend {
    if (prices.length < 2) {
      return {
        period,
        trend: 'stable',
        confidence: 'low',
        changePercent: 0,
        volatility: 0,
        volume: 0
      };
    }

    const sortedPrices = [...prices].sort((a, b) => a - b);
    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices[0];
    const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    // Calculate volatility (standard deviation)
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / mean * 100;
    
    // Determine trend
    let trend: MarketTrend['trend'] = 'stable';
    let confidence: MarketTrend['confidence'] = 'medium';
    
    if (Math.abs(changePercent) > 20) {
      trend = changePercent > 0 ? 'bullish' : 'bearish';
      confidence = 'high';
    } else if (Math.abs(changePercent) > 10) {
      trend = changePercent > 0 ? 'bullish' : 'bearish';
      confidence = 'medium';
    } else if (volatility > 30) {
      trend = 'volatile';
      confidence = 'high';
    }
    
    return {
      period,
      trend,
      confidence,
      changePercent,
      volatility,
      volume: volumes.reduce((sum, vol) => sum + vol, 0)
    };
  }

  // Generate pricing insights with AI-like reasoning
  static generatePricingInsight(
    cardId: string,
    name: string,
    currentPrice: number,
    trend: MarketTrend,
    historicalData: { price: number; volume: number; date: string }[]
  ): PricingInsight {
    
    // Analyze card characteristics
    const isRare = name.toLowerCase().includes('charizard') || 
                   name.toLowerCase().includes('pikachu') ||
                   name.toLowerCase().includes('mew') ||
                   name.toLowerCase().includes('umbreon');
    
    const isVintage = name.includes('Base Set') || name.includes('Jungle') || name.includes('Fossil');
    const isModern = name.includes('V') || name.includes('VMAX') || name.includes('ex');
    
    // Calculate potential return based on trend
    let potentialReturn = 0;
    let recommendation: PricingInsight['recommendation'] = 'hold';
    let reasoning = '';
    let riskLevel: PricingInsight['riskLevel'] = 'medium';
    
    if (trend.trend === 'bullish' && trend.confidence === 'high') {
      potentialReturn = Math.min(trend.changePercent * 2, 100); // Cap at 100%
      recommendation = 'buy';
      reasoning = `Strong bullish trend with ${trend.changePercent.toFixed(1)}% growth over ${trend.period}`;
      riskLevel = isRare ? 'medium' : 'low';
    } else if (trend.trend === 'bearish' && trend.confidence === 'high') {
      potentialReturn = -Math.abs(trend.changePercent);
      recommendation = 'sell';
      reasoning = `Declining trend with ${Math.abs(trend.changePercent).toFixed(1)}% drop over ${trend.period}`;
      riskLevel = 'high';
    } else if (trend.trend === 'volatile') {
      potentialReturn = 0;
      recommendation = 'watch';
      reasoning = `High volatility (${trend.volatility.toFixed(1)}%) - wait for stability`;
      riskLevel = 'high';
    } else {
      potentialReturn = 0;
      recommendation = 'hold';
      reasoning = `Stable price movement - no clear trend`;
      riskLevel = 'low';
    }
    
    // Adjust for card characteristics
    if (isRare && trend.trend === 'bullish') {
      potentialReturn *= 1.5; // Rare cards have higher upside
      reasoning += '. Rare card with premium potential.';
    }
    
    if (isVintage && trend.trend === 'bullish') {
      potentialReturn *= 1.2; // Vintage cards are more stable
      reasoning += '. Vintage card with historical value.';
    }
    
    if (isModern && trend.volatility > 50) {
      riskLevel = 'high';
      reasoning += '. Modern card with high volatility risk.';
    }
    
    return {
      cardId,
      name,
      currentPrice,
      trend,
      recommendation,
      reasoning,
      riskLevel,
      potentialReturn
    };
  }

  // Analyze entire market for opportunities
  static analyzeMarket(cards: any[]): MarketAnalysis {
    const insights: PricingInsight[] = [];
    
    // Generate insights for all cards
    for (const card of cards) {
      const trend = this.calculateMarketTrend(
        [card.raw_usd || 0],
        [card.raw_count || 0],
        '30d'
      );
      
      const insight = this.generatePricingInsight(
        card.card_id,
        card.name,
        card.raw_usd || 0,
        trend,
        []
      );
      
      insights.push(insight);
    }
    
    // Categorize cards
    const hotCards = insights
      .filter(i => i.recommendation === 'buy' && i.potentialReturn > 20)
      .sort((a, b) => b.potentialReturn - a.potentialReturn)
      .slice(0, 10);
    
    const undervaluedCards = insights
      .filter(i => i.recommendation === 'buy' && i.riskLevel === 'low')
      .sort((a, b) => b.potentialReturn - a.potentialReturn)
      .slice(0, 10);
    
    const overvaluedCards = insights
      .filter(i => i.recommendation === 'sell')
      .sort((a, b) => a.potentialReturn - b.potentialReturn)
      .slice(0, 10);
    
    // Determine overall market trend
    const bullishCount = insights.filter(i => i.trend.trend === 'bullish').length;
    const bearishCount = insights.filter(i => i.trend.trend === 'bearish').length;
    
    let overallTrend: MarketAnalysis['overallTrend'] = 'mixed';
    if (bullishCount > bearishCount * 1.5) {
      overallTrend = 'bullish';
    } else if (bearishCount > bullishCount * 1.5) {
      overallTrend = 'bearish';
    }
    
    // Generate market summary
    const totalCards = insights.length;
    const buyRecommendations = insights.filter(i => i.recommendation === 'buy').length;
    const sellRecommendations = insights.filter(i => i.recommendation === 'sell').length;
    
    const marketSummary = `Market Analysis: ${totalCards} cards analyzed. ` +
      `${buyRecommendations} buy recommendations, ${sellRecommendations} sell recommendations. ` +
      `Overall trend: ${overallTrend}. ` +
      `${hotCards.length} hot opportunities identified.`;
    
    return {
      overallTrend,
      hotCards,
      undervaluedCards,
      overvaluedCards,
      marketSummary
    };
  }

  // Calculate seasonal trends
  static calculateSeasonalTrend(cardName: string, currentMonth: number): number {
    // Pokemon cards often have seasonal patterns
    const seasonalMultipliers = {
      // Holiday season (Nov-Dec) - higher demand
      11: 1.2, 12: 1.3,
      // Summer (Jun-Aug) - moderate demand  
      6: 1.1, 7: 1.1, 8: 1.1,
      // Back to school (Sep) - lower demand
      9: 0.9,
      // Default
      default: 1.0
    };
    
    const multiplier = seasonalMultipliers[currentMonth as keyof typeof seasonalMultipliers] || 
                      seasonalMultipliers.default;
    
    // Special cards get higher seasonal boosts
    if (cardName.toLowerCase().includes('christmas') || 
        cardName.toLowerCase().includes('holiday')) {
      return multiplier * 1.5;
    }
    
    return multiplier;
  }

  // Calculate market sentiment score
  static calculateMarketSentiment(insights: PricingInsight[]): number {
    if (insights.length === 0) return 0;
    
    const sentimentScores = insights.map(insight => {
      switch (insight.recommendation) {
        case 'buy': return 1;
        case 'hold': return 0;
        case 'sell': return -1;
        case 'watch': return 0;
        default: return 0;
      }
    });
    
    const averageSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / insights.length;
    return Math.round(averageSentiment * 100); // Scale to -100 to 100
  }
}
