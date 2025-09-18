import { getCards, getSets, getRarities, type FilterOptions } from '@/lib/actions/cards'
import { CardTable } from '@/components/card-table'
import { Filters } from '@/components/filters'

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Await search params for Next.js 15 compatibility
  const params = await searchParams
  
  // Parse search params for filters
  const filters: FilterOptions = {
    timePeriod: parseInt(params.timePeriod as string) || 5,
    sortBy: (params.sortBy as string) || 'profit_loss',
    set: (params.set as string) || 'All Sets',
    rarity: (params.rarity as string) || 'All Rarities',
    minSales: parseInt(params.minSales as string) || 3,
    minPrice: parseFloat(params.minPrice as string) || 0,
    maxPrice: parseFloat(params.maxPrice as string) || 10000,
    minProfitLoss: parseFloat(params.minProfitLoss as string) || 0,
    psa10Only: params.psa10Only === 'true',
    highConfidenceOnly: params.highConfidenceOnly === 'true',
    // Enhanced filtering options
    minRawDelta: parseFloat(params.minRawDelta as string) || 0,
    minPsa10Delta: parseFloat(params.minPsa10Delta as string) || 0,
    maxVolatility: parseFloat(params.maxVolatility as string) || 0,
    gradingRecommendation: (params.gradingRecommendation as string) || 'All',
  }

  // Fetch data
  const [cards, sets, rarities] = await Promise.all([
    getCards(filters),
    getSets(),
    getRarities(),
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Card Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analysis of Pokémon cards with price movements and grading opportunities
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
            <CardTable cards={cards} currentSort={filters.sortBy} />
          </div>
        </div>
      </div>
    </div>
  )
}
