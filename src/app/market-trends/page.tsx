import { listCardsLatest, getAvailableSets } from '@/lib/queries/cards';
import { EnhancedPricingEngine } from '@/lib/enhanced-pricing';
import { FilterBar } from '@/components/FilterBar';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SearchParams {
  set?: string;
  period?: '5d' | '30d' | '90d';
}

export default async function MarketTrendsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams;
  
  const setId = params.set ?? 'cel25';
  const period = params.period ?? '30d';
  const availableSets = await getAvailableSets();
  
  let cards: any[] = [];
  let marketAnalysis: any = null;
  let error: string | null = null;
  
  try {
    // Get all cards for comprehensive analysis
    cards = await listCardsLatest({
      setId,
      sort: 'number',
      dir: 'asc',
      limit: 1000, // Get more cards for better analysis
    });
    
    if (cards.length > 0) {
      marketAnalysis = EnhancedPricingEngine.analyzeMarket(cards);
    }
    
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load market trends';
    console.error('Error loading market trends:', e);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Market Trends Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive market analysis with trend patterns and investment opportunities
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
          <>
            {/* Market Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-lg">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Hot Opportunities</p>
                    <p className="text-2xl font-bold text-green-600">
                      {marketAnalysis.hotCards.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-lg">💎</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Undervalued</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {marketAnalysis.undervaluedCards.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600 text-lg">⚠️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Overvalued</p>
                    <p className="text-2xl font-bold text-red-600">
                      {marketAnalysis.overvaluedCards.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-lg">🎯</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Market Sentiment</p>
                    <p className={`text-2xl font-bold ${
                      marketAnalysis.overallTrend === 'bullish' ? 'text-green-600' :
                      marketAnalysis.overallTrend === 'bearish' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {marketAnalysis.overallTrend.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hot Opportunities */}
            <div className="bg-white rounded-lg border mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">🔥 Hot Opportunities</h3>
                <p className="text-sm text-gray-500">Cards with strong bullish trends and high potential returns</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketAnalysis.hotCards.slice(0, 6).map((card: any, index: number) => (
                    <div key={card.cardId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm truncate">{card.name}</h4>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Price:</span>
                          <span className="font-medium">${card.currentPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Potential:</span>
                          <span className="font-medium text-green-600">
                            +{card.potentialReturn.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Risk:</span>
                          <span className={`font-medium ${
                            card.riskLevel === 'low' ? 'text-green-600' :
                            card.riskLevel === 'medium' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {card.riskLevel.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {card.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Undervalued Cards */}
            <div className="bg-white rounded-lg border mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">💎 Undervalued Gems</h3>
                <p className="text-sm text-gray-500">Cards with low risk and good potential for growth</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketAnalysis.undervaluedCards.slice(0, 6).map((card: any, index: number) => (
                    <div key={card.cardId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm truncate">{card.name}</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          SAFE
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Price:</span>
                          <span className="font-medium">${card.currentPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Potential:</span>
                          <span className="font-medium text-blue-600">
                            +{card.potentialReturn.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Risk:</span>
                          <span className="font-medium text-green-600">
                            {card.riskLevel.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {card.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Market Summary */}
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">📊 Market Summary</h3>
                <p className="text-sm text-gray-500">Overall market analysis and insights</p>
              </div>
              <div className="p-6">
                <div className="prose max-w-none">
                  <p className="text-gray-700 mb-4">
                    {marketAnalysis.marketSummary}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Market Insights</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• {marketAnalysis.hotCards.length} cards showing strong bullish momentum</li>
                        <li>• {marketAnalysis.undervaluedCards.length} undervalued opportunities identified</li>
                        <li>• {marketAnalysis.overvaluedCards.length} cards may be overpriced</li>
                        <li>• Overall market sentiment: {marketAnalysis.overallTrend}</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Investment Strategy</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Focus on hot opportunities for short-term gains</li>
                        <li>• Consider undervalued cards for long-term holds</li>
                        <li>• Monitor overvalued cards for potential exits</li>
                        <li>• Diversify across different risk levels</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">🚀 Advanced Market Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Analysis Features:</h4>
              <ul className="space-y-1">
                <li>• Trend pattern recognition</li>
                <li>• Volatility analysis</li>
                <li>• Risk assessment algorithms</li>
                <li>• Market sentiment scoring</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Investment Tools:</h4>
              <ul className="space-y-1">
                <li>• AI-powered recommendations</li>
                <li>• Potential return calculations</li>
                <li>• Risk level classifications</li>
                <li>• Market opportunity identification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
