import { listCardsLatest, getAvailableSets } from '@/lib/queries/cards';
import { EnhancedPricingEngine, MarketAnalysis } from '@/lib/enhanced-pricing';
import { FilterBar } from '@/components/FilterBar';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SearchParams {
  set?: string;
  q?: string;
  sort?: 'price' | 'psa10' | 'number' | 'name' | 'trend' | 'sentiment' | 'recommendation';
  dir?: 'asc' | 'desc';
  min?: string;
  max?: string;
  page?: string;
  limit?: string;
}

export default async function EnhancedAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams;
  
  const setId = params.set ?? 'cel25';
  const availableSets = await getAvailableSets();
  
  let cards: any[] = [];
  let marketAnalysis: MarketAnalysis | null = null;
  let error: string | null = null;
  
  try {
    // Get cards with pricing data
    cards = await listCardsLatest({
      setId,
      q: params.q,
      sort: 'number',
      dir: 'asc',
      min: params.min ? Number(params.min) : undefined,
      max: params.max ? Number(params.max) : undefined,
      page: params.page ? Number(params.page) : 1,
      limit: params.limit ? Number(params.limit) : 100,
    });
    
    // Generate market analysis
    if (cards.length > 0) {
      marketAnalysis = EnhancedPricingEngine.analyzeMarket(cards);
    }
    
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load enhanced analysis';
    console.error('Error loading enhanced analysis:', e);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Enhanced Market Analysis</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered market insights with trend analysis and investment recommendations
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        <Suspense fallback={<div>Loading filters...</div>}>
          <FilterBar availableSets={availableSets} />
        </Suspense>

        {marketAnalysis && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Market Overview */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">📊 Market Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Overall Trend:</span>
                  <span className={`font-medium ${
                    marketAnalysis.overallTrend === 'bullish' ? 'text-green-600' :
                    marketAnalysis.overallTrend === 'bearish' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {marketAnalysis.overallTrend.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hot Opportunities:</span>
                  <span className="font-medium text-green-600">
                    {marketAnalysis.hotCards.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Undervalued:</span>
                  <span className="font-medium text-blue-600">
                    {marketAnalysis.undervaluedCards.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Overvalued:</span>
                  <span className="font-medium text-red-600">
                    {marketAnalysis.overvaluedCards.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Hot Cards */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">🔥 Hot Opportunities</h3>
              <div className="space-y-2">
                {marketAnalysis.hotCards.slice(0, 5).map((card, index) => (
                  <div key={card.cardId} className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{card.name}</p>
                      <p className="text-xs text-gray-500">{card.reasoning}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        +{card.potentialReturn.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {card.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Summary */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">📈 Market Summary</h3>
              <p className="text-sm text-gray-600 mb-4">
                {marketAnalysis.marketSummary}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Market Sentiment:</span>
                  <span className={`text-sm font-medium ${
                    EnhancedPricingEngine.calculateMarketSentiment(cards.map(c => ({
                      cardId: c.card_id,
                      name: c.name,
                      currentPrice: c.raw_usd || 0,
                      trend: { period: '30d' as const, trend: 'stable' as const, confidence: 'medium' as const, changePercent: 0, volatility: 0, volume: 0 },
                      recommendation: 'hold' as const,
                      reasoning: '',
                      riskLevel: 'medium' as const,
                      potentialReturn: 0
                    }))) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {EnhancedPricingEngine.calculateMarketSentiment(cards.map(c => ({
                      cardId: c.card_id,
                      name: c.name,
                      currentPrice: c.raw_usd || 0,
                      trend: { period: '30d' as const, trend: 'stable' as const, confidence: 'medium' as const, changePercent: 0, volatility: 0, volume: 0 },
                      recommendation: 'hold' as const,
                      reasoning: '',
                      riskLevel: 'medium' as const,
                      potentialReturn: 0
                    }))) > 0 ? 'Positive' : 'Negative'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Analysis Table */}
        {cards.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-500">No cards found matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Card</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Potential Return</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Reasoning</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cards.slice(0, 20).map((card) => {
                    // Generate insights for each card
                    const trend = EnhancedPricingEngine.calculateMarketTrend(
                      [card.raw_usd || 0],
                      [card.raw_count || 0],
                      '30d'
                    );
                    
                    const insight = EnhancedPricingEngine.generatePricingInsight(
                      card.card_id,
                      card.name,
                      card.raw_usd || 0,
                      trend,
                      []
                    );
                    
                    return (
                      <tr key={card.card_id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-6">
                              {card.image_url_small ? (
                                <img
                                  className="h-8 w-6 rounded object-cover"
                                  src={card.image_url_small}
                                  alt={card.name}
                                />
                              ) : (
                                <div className="h-8 w-6 rounded bg-gray-200 flex items-center justify-center">
                                  <span className="text-xs text-gray-500">🎴</span>
                                </div>
                              )}
                            </div>
                            <div className="ml-2 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {card.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {card.set_name || card.set_id} • #{card.number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${(card.raw_usd || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            trend.trend === 'bullish' ? 'bg-green-100 text-green-800' :
                            trend.trend === 'bearish' ? 'bg-red-100 text-red-800' :
                            trend.trend === 'volatile' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {trend.trend.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            insight.recommendation === 'buy' ? 'bg-green-100 text-green-800' :
                            insight.recommendation === 'sell' ? 'bg-red-100 text-red-800' :
                            insight.recommendation === 'watch' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {insight.recommendation.toUpperCase()}
                          </span>
                        </td>
                        <td className={`px-3 py-4 whitespace-nowrap text-sm ${
                          insight.potentialReturn > 0 ? 'text-green-600' :
                          insight.potentialReturn < 0 ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {insight.potentialReturn > 0 ? '+' : ''}{insight.potentialReturn.toFixed(1)}%
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            insight.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                            insight.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {insight.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {insight.reasoning}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">🤖 Enhanced AI Analysis</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Market Trends:</strong> Analyzes price movements and volatility patterns</li>
            <li>• <strong>Investment Recommendations:</strong> AI-powered buy/hold/sell suggestions</li>
            <li>• <strong>Risk Assessment:</strong> Evaluates investment risk based on card characteristics</li>
            <li>• <strong>Market Sentiment:</strong> Overall market direction and opportunity identification</li>
            <li>• <strong>Seasonal Analysis:</strong> Considers seasonal trends and card popularity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
