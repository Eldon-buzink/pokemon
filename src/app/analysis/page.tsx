import { EnhancedCardTable } from '@/components/enhanced-card-table'
import { Filters } from '@/components/filters'
import { LoadingSpinner } from '@/components/loading-spinner'

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
  
  // Fetch real data from Supabase
  const startTime = Date.now();
  let cards: CardData[] = [];
  let loadTime = 0;
  
  try {
    // Import the real data fetching function
    const { getCards } = await import('@/lib/actions/cards')
    
    // Fetch real card data from Supabase
    const realCards = await getCards({
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
    });
    
    // Transform real card data to match our interface
    cards = realCards.map((card) => ({
      card_id: card.card_id,
      name: card.name,
      set_name: card.set_name,
      number: card.number,
      rarity: card.rarity,
      image_url_small: card.image_url_small,
      image_url_large: card.image_url_large,
      raw_price: card.raw_price,
      psa10_price: card.psa10_price,
      spread_after_fees: card.spread_after_fees,
      profit_loss: card.spread_after_fees,
      confidence: card.confidence,
      volume_score: card.volume_score,
      raw_delta_5d: card.raw_delta_5d,
      raw_delta_30d: card.raw_delta_30d,
      raw_delta_90d: card.raw_delta_90d,
      psa10_delta_5d: card.psa10_delta_5d,
      psa10_delta_30d: card.psa10_delta_30d,
      psa10_delta_90d: card.psa10_delta_90d,
      psa9_count: card.psa9_count,
      psa10_count: card.psa10_count,
      total_psa_count: card.total_psa_count,
      price_volatility: card.price_volatility,
      grading_recommendation: card.grading_recommendation,
      psa10_probability: 0.25, // Placeholder - will be calculated from real data
      ev_grade: card.raw_price * 0.3, // Placeholder
      upside_potential: card.spread_after_fees / card.raw_price,
      badges: card.raw_delta_5d > 20 ? ['HOT'] : card.raw_delta_5d > 10 ? ['GRADE_EV'] : [],
      headline_momentum: card.raw_delta_5d,
    }));
    
    loadTime = Date.now() - startTime;
    console.log(`📊 Real data loaded in ${loadTime}ms: ${cards.length} cards`);
    
  } catch (error) {
    console.error('Error fetching real data:', error);
    
    // Fallback to seed cards if real data fails
    const { SEED_CARDS } = await import('@/data/seedCards')
    
    // Generate mock data as fallback
    const seed = 12345;
    const mockResults = SEED_CARDS.map((card, index) => {
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      
      const basePrice = 10 + (index * 5) + seededRandom(seed + index) * 20;
      const psa10Price = basePrice * (8 + seededRandom(seed + index + 100) * 12);
      const volatility = 0.1 + seededRandom(seed + index + 200) * 0.3;
      const momentum = (seededRandom(seed + index + 300) - 0.5) * 0.4;
      
      return {
        card_id: `${card.set}-${card.number}`,
        name: card.name,
        set_name: card.set,
        number: card.number,
        rarity: 'Unknown',
        image_url_small: '',
        image_url_large: '',
        raw_price: basePrice,
        psa10_price: psa10Price,
        spread_after_fees: psa10Price * 0.3 - basePrice,
        profit_loss: psa10Price * 0.3 - basePrice,
        confidence: 'Noisy' as 'High' | 'Speculative' | 'Noisy',
        volume_score: 0.5,
        raw_delta_5d: momentum * 10,
        raw_delta_30d: momentum * 30,
        raw_delta_90d: momentum * 50,
        psa10_delta_5d: momentum * 5,
        psa10_delta_30d: momentum * 15,
        psa10_delta_90d: momentum * 25,
        psa9_count: 0,
        psa10_count: 0,
        total_psa_count: 0,
        price_volatility: volatility,
        grading_recommendation: (momentum > 0.2 ? 'Strong Buy' : momentum > 0.1 ? 'Buy' : 'Hold') as 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid',
        psa10_probability: 0.25,
        ev_grade: basePrice * 0.3,
        upside_potential: momentum,
        badges: momentum > 0.2 ? ['HOT'] : momentum > 0.1 ? ['GRADE_EV'] : [],
        headline_momentum: momentum,
      };
    });
    
    cards = mockResults;
    loadTime = Date.now() - startTime;
    console.log(`📊 Fallback mock data generated in ${loadTime}ms: ${cards.length} cards`);
  }
  
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
              <EnhancedCardTable cards={cards} currentSort={filters.sortBy} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
