import { EnhancedCardTable } from '@/components/enhanced-card-table'
import { Filters } from '@/components/filters'
import { LoadingSpinner } from '@/components/loading-spinner'

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

interface MetricsData {
  card: { set: string; number: string };
  markets: {
    raw?: {
      median5d: number;
      median30d: number;
      median90d: number;
      pct5d: number;
      pct30d: number;
      sales5d: number;
      sales30d: number;
      sales90d: number;
      volatility30d: number;
      L: number;
      S: number;
      momentum: number;
      removedOutliersCount?: number;
      ev?: {
        p10: number;
        method: string;
        confidence: number;
        evGrade: number;
        net: number;
        upside: number;
      };
    };
    psa9?: {
      median5d: number;
      median30d: number;
      median90d: number;
      pct5d: number;
      pct30d: number;
      sales5d: number;
      sales30d: number;
      sales90d: number;
      volatility30d: number;
      L: number;
      S: number;
      momentum: number;
      removedOutliersCount?: number;
    };
    psa10?: {
      median5d: number;
      median30d: number;
      median90d: number;
      pct5d: number;
      pct30d: number;
      sales5d: number;
      sales30d: number;
      sales90d: number;
      volatility30d: number;
      L: number;
      S: number;
      momentum: number;
      removedOutliersCount?: number;
    };
  };
  headlineMomentum: number;
  badges: string[];
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
  
  // Fetch data from our new metrics API
  const startTime = Date.now();
  let results: MetricsData[] = [];
  let loadTime = 0;
  
  try {
    // For server components, we can call the API function directly instead of fetch
    // This avoids URL construction issues
    const { SEED_CARDS } = await import('@/data/seedCards')
    
    // Generate mock data directly (same as batch API)
    const mockResults = SEED_CARDS.map((card, index) => {
      const basePrice = 10 + (index * 5) + Math.random() * 20;
      const psa10Price = basePrice * (8 + Math.random() * 12);
      const volatility = 0.1 + Math.random() * 0.3;
      const momentum = (Math.random() - 0.5) * 0.4;
      
      return {
        card: { set: card.set, number: card.number },
        markets: {
          raw: {
            median5d: basePrice * (1 + momentum * 0.1),
            median30d: basePrice,
            median90d: basePrice * (1 - momentum * 0.2),
            pct5d: momentum * 0.1,
            pct30d: momentum * 0.3,
            sales5d: 5 + Math.floor(Math.random() * 10),
            sales30d: 15 + Math.floor(Math.random() * 20),
            sales90d: 30 + Math.floor(Math.random() * 40),
            volatility30d: volatility,
            L: 0.5 + Math.random() * 0.5,
            S: 0.3 + Math.random() * 0.4,
            momentum: momentum,
            ev: {
              p10: 0.2 + Math.random() * 0.3,
              method: 'pop-proxy',
              confidence: 0.6 + Math.random() * 0.3,
              evGrade: psa10Price * (0.2 + Math.random() * 0.3),
              net: psa10Price * (0.2 + Math.random() * 0.3) - basePrice,
              upside: (psa10Price * (0.2 + Math.random() * 0.3) - basePrice) / basePrice
            }
          },
          psa10: {
            median5d: psa10Price * (1 + momentum * 0.05),
            median30d: psa10Price,
            median90d: psa10Price * (1 - momentum * 0.1),
            pct5d: momentum * 0.05,
            pct30d: momentum * 0.15,
            sales5d: 2 + Math.floor(Math.random() * 5),
            sales30d: 5 + Math.floor(Math.random() * 10),
            sales90d: 10 + Math.floor(Math.random() * 20),
            volatility30d: volatility * 0.8,
            L: 0.3 + Math.random() * 0.4,
            S: 0.4 + Math.random() * 0.3,
            momentum: momentum * 0.5
          }
        },
        headlineMomentum: momentum,
        badges: momentum > 0.2 ? ['HOT'] : momentum > 0.1 ? ['GRADE_EV'] : []
      };
    });
    
    results = mockResults;
    loadTime = Date.now() - startTime;
    
    console.log(`📊 Mock data generated in ${loadTime}ms`);
    
  } catch (error) {
    console.error('Error generating mock data:', error);
    // Fallback to empty results if generation fails
    results = [];
    loadTime = Date.now() - startTime;
  }
  
  // Transform data to match existing CardTable interface
  const cards = results.map((result: MetricsData) => {
    const raw = result.markets.raw;
    const psa10 = result.markets.psa10;
    
    if (!raw) return null;
    
    return {
      card_id: `${result.card.set}-${result.card.number}`,
      name: result.card.number,
      set_name: result.card.set,
      number: result.card.number,
      rarity: 'Unknown', // We'll need to add this to our seed data
      image_url_small: '', // We'll need to add this to our seed data
      image_url_large: '', // We'll need to add this to our seed data
      
      // Price data
      raw_price: raw.median30d,
      psa10_price: psa10?.median30d || 0,
      
      // Deltas
      raw_delta_5d: raw.pct5d * 100,
      raw_delta_30d: raw.pct30d * 100,
      raw_delta_90d: 0, // We'll calculate this
      psa10_delta_5d: (psa10?.pct5d || 0) * 100,
      psa10_delta_30d: (psa10?.pct30d || 0) * 100,
      psa10_delta_90d: 0, // We'll calculate this
      
      // Spread and profit
      spread_after_fees: raw.ev?.net || 0,
      profit_loss: raw.ev?.net || 0,
      
      // Confidence and volume
      confidence: (raw.ev?.confidence ? 
        (raw.ev.confidence > 0.7 ? 'High' : raw.ev.confidence > 0.4 ? 'Speculative' : 'Noisy') : 
        'Noisy') as 'High' | 'Speculative' | 'Noisy',
      volume_score: raw.L,
      
      // PSA data
      psa9_count: 0, // We'll add this
      psa10_count: 0, // We'll add this
      total_psa_count: 0, // We'll add this
      
      // Analysis
      price_volatility: raw.volatility30d,
      grading_recommendation: ((raw.ev?.upside || 0) > 0.5 ? 'Strong Buy' : 
                            (raw.ev?.upside || 0) > 0.2 ? 'Buy' : 
                            (raw.ev?.upside || 0) > 0 ? 'Hold' : 'Avoid') as 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid',
      
      // New metrics
      psa10_probability: raw.ev?.p10 || 0,
      ev_grade: raw.ev?.evGrade || 0,
      upside_potential: raw.ev?.upside || 0,
      badges: result.badges,
      headline_momentum: result.headlineMomentum,
    };
  }).filter((card): card is NonNullable<typeof card> => card !== null);
  
  // Mock sets and rarities for now
  const sets = ['All Sets', 'Crown Zenith', 'Paldean Fates', '151', 'Brilliant Stars', 'Lost Origin', 'Celebrations'];
  const rarities = ['All Rarities', 'Common', 'Uncommon', 'Rare', 'Holo Rare', 'Ultra Rare'];
  
  const filters = {
    timePeriod,
    sortBy: (params.sortBy as string) || 'profit_loss',
    set: (params.set as string) || 'All Sets',
    rarity: (params.rarity as string) || 'All Rarities',
    minSales: parseInt(params.minSales as string) || 3,
    minPrice: parseFloat(params.minPrice as string) || 0,
    minProfitLoss: parseFloat(params.minProfitLoss as string) || 0,
    psa10Only: params.psa10Only === 'true',
    highConfidenceOnly: params.highConfidenceOnly === 'true',
    minRawDelta: parseFloat(params.minRawDelta as string) || 0,
    minPsa10Delta: parseFloat(params.minPsa10Delta as string) || 0,
    maxVolatility: parseFloat(params.maxVolatility as string) || 0,
    gradingRecommendation: (params.gradingRecommendation as string) || 'All',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
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
            {results.length === 0 ? (
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
              <EnhancedCardTable cards={cards} currentSort={filters.sortBy} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
