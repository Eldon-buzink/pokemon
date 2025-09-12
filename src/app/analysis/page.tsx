import { EnhancedCardTable } from '@/components/enhanced-card-table'
import { Filters } from '@/components/filters'
import { LoadingSpinner } from '@/components/loading-spinner'
import { getCards } from '@/lib/actions/cards'
import { getCelebrationsCards } from '@/lib/actions/celebrations'

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Define types for the card data
interface CardData {
  card_id: string;
  name: string;
  set_name: string;
  number: string;
  rarity: string;
  image_url_small: string;
  image_url_large: string;
  raw_price: number;
  psa10_price: number;
  spread_after_fees: number;
  profit_loss: number;
  confidence: 'High' | 'Speculative' | 'Noisy';
  volume_score: number;
  raw_delta_5d: number;
  raw_delta_30d: number;
  raw_delta_90d: number;
  psa10_delta_5d: number;
  psa10_delta_30d: number;
  psa10_delta_90d: number;
  psa9_count: number;
  psa10_count: number;
  total_psa_count: number;
  price_volatility: number;
  grading_recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid';
  psa10_probability: number;
  ev_grade: number;
  upside_potential: number;
  badges: string[];
  headline_momentum: number;
  sparkline_data: { date: string; price: number }[];
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Await search params for Next.js 15 compatibility
  const params = await searchParams
  
  // Parse search params for filters
  const timePeriod = parseInt(params.timePeriod as string) || 5;
  const _market = (params.market as string) || 'raw';
  const _days = timePeriod === 5 ? 30 : timePeriod === 30 ? 90 : 90;
  
  // Define filters object
  const filters = {
    timePeriod,
    sortBy: (params.sortBy as string) || 'profit_loss',
    set: (params.set as string) || 'Celebrations',
    rarity: (params.rarity as string) || 'All Rarities',
    minSales: parseInt(params.minSales as string) || 3,
    minPrice: parseFloat(params.minPrice as string) || 0,
    maxPrice: parseFloat(params.maxPrice as string) || 10000,
    minProfitLoss: parseFloat(params.minProfitLoss as string) || 0,
    psa10Only: params.psa10Only === 'true',
    highConfidenceOnly: params.highConfidenceOnly === 'true',
    minRawDelta: parseFloat(params.minRawDelta as string) || 0,
    minPsa10Delta: parseFloat(params.minPsa10Delta as string) || 0,
    maxVolatility: parseFloat(params.maxVolatility as string) || 0,
    gradingRecommendation: (params.gradingRecommendation as string) || 'All',
  };
  
  // Try to fetch real data first, fallback to mock data
  const startTime = Date.now();
  let cards: CardData[] = [];
  let loadTime = 0;

  // Skip database calls to avoid API rate limits
  console.log('📊 Loading Celebrations data from Pokemon TCG API...');
  
  try {
    
    try {
      // Try to fetch real Celebrations data from Pokemon TCG API
      const celebrationsCards = await getCelebrationsCards();
      
      // Filter to Celebrations set if needed
      let filteredCards = celebrationsCards;
      if (filters.set !== 'All Sets' && filters.set !== 'Celebrations') {
        filteredCards = celebrationsCards.filter((card: any) => card.set_name === filters.set);
      }
      
      cards = filteredCards;
      loadTime = Date.now() - startTime;
      console.log(`✅ Loaded ${cards.length} Celebrations cards from API in ${loadTime}ms`);
    } catch (apiError) {
      console.error('❌ Failed to load real Celebrations data:', apiError);
      
      // Show error message to user instead of falling back to mock data
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Unable to Load Celebrations Data
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      We couldn't fetch the latest Celebrations card data from the Pokemon TCG API. 
                      This could be due to:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Network connectivity issues</li>
                      <li>API rate limiting</li>
                      <li>Service temporarily unavailable</li>
                    </ul>
                    <p className="mt-2">
                      Please check your internet connection and try refreshing the page.
                    </p>
                  </div>
                  <div className="mt-4">
                  <a
                    href="/analysis"
                    className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors inline-block"
                  >
                    Refresh Page
                  </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error('❌ Error loading Celebrations data:', error);
    // Fall back to empty array if all else fails
    cards = [];
  }
  
  // Get actual sets from the loaded cards
  const actualSets = Array.from(new Set(cards.map(card => card.set_name))).sort();
  const sets = ['All Sets', ...actualSets];
  const rarities = ['All Rarities', 'Common', 'Uncommon', 'Rare', 'Holo Rare', 'Ultra Rare', 'Special Illustration Rare'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Card Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analysis of Pokémon cards with price movements and grading opportunities
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Loaded {cards.length} cards in {loadTime}ms
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
            <Filters 
              sets={sets}
              rarities={rarities}
              currentFilters={filters}
            />
              
              {/* Email Subscription Section */}
              <div className="bg-card rounded-lg border p-4">
                <h3 className="font-semibold mb-3">📧 Weekly Market Updates</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get the top 5 analysis insights every Monday based on your current filter settings
                </p>
                <div className="space-y-3">
                  <input 
                    type="email" 
                    placeholder="Enter your email"
                    className="w-full p-2 border rounded-md text-sm"
                  />
                  <button className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md text-sm hover:bg-primary/90">
                    Subscribe
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  We&apos;ll send you the top 5 analysis insights every Monday. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {cards.length === 0 ? (
              <div className="bg-white rounded-lg border p-8">
                <LoadingSpinner 
                  size="lg" 
                  text="Analyzing card data and computing metrics..." 
                  className="py-12"
                />
                <div className="mt-4 text-center text-sm text-gray-500">
                  This may take a few seconds while we process the data...
                </div>
              </div>
            ) : (
              <EnhancedCardTable 
                cards={cards} 
                currentSort={filters.sortBy}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
