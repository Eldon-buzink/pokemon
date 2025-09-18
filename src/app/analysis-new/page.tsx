import { listCardsLatest, getAvailableSets, getPriceSyncStatus } from '@/lib/queries/cards';
import { FilterBar } from '@/components/FilterBar';
import { PriceSyncBanner } from '@/components/PriceSyncBanner';
import { EnhancedAnalysisTable } from '@/components/enhanced-analysis-table';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SearchParams {
  set?: string;
  q?: string;
  sort?: 'price' | 'psa10' | 'number' | 'name' | 'change5d' | 'change30d' | 'profit';
  dir?: 'asc' | 'desc';
  min?: string;
  max?: string;
  page?: string;
  limit?: string;
}

// Moved helper functions to enhanced-analysis-table.tsx

export default async function NewAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // Await search params for Next.js 15 compatibility
  const params = await searchParams;
  
  const setId = params.set ?? 'cel25'; // default: Celebrations main
  const availableSets = await getAvailableSets();
  
  let cards: any[] = [];
  let error: string | null = null;
  let loadTime = 0;
  let syncStatus: any = null;
  
  try {
    const startTime = Date.now();
    
    // Map frontend sort keys to backend-supported ones
    const sortMap: Record<string, string> = {
      'change5d': 'price', // fallback to price sorting
      'change30d': 'price', // fallback to price sorting  
      'profit': 'price', // fallback to price sorting (will sort client-side)
      'trend': 'price', // fallback to price sorting
      'ppt_raw': 'price', // fallback to price sorting
      'psa10_chance': 'price' // fallback to price sorting
    };
    
    const backendSort = params.sort ? (sortMap[params.sort] || params.sort) : 'number';
    
    // For client-side sorting, we'll need to sort after fetching
    const needsClientSort = params.sort && ['change5d', 'change30d', 'profit', 'psa10_chance'].includes(params.sort);
    
    cards = await listCardsLatest({
      setId,
      q: params.q,
      sort: backendSort as 'price' | 'psa10' | 'number' | 'name',
      dir: params.dir ?? 'asc',
      min: params.min ? Number(params.min) : undefined,
      max: params.max ? Number(params.max) : undefined,
      page: params.page ? Number(params.page) : 1,
      limit: params.limit ? Number(params.limit) : 50,
    });
    
    // Check price sync status
    syncStatus = await getPriceSyncStatus(setId);
    
    loadTime = Date.now() - startTime;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load cards';
    console.error('Error loading cards:', e);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Card Analysis (New)</h1>
          <p className="text-muted-foreground mt-2">
            Server-side filtered analysis with real price data from multiple sources
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Loaded {cards.length} cards in {loadTime}ms • Set: {setId}
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

        {/* Price Sync Status Banner */}
        {syncStatus && (
          <PriceSyncBanner setId={setId} syncStatus={syncStatus} />
        )}

        {cards.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-500">No cards found matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <EnhancedAnalysisTable 
              cards={cards}
              currentSort={params.sort}
              currentDir={params.dir}
            />
          </div>
        )}

        {/* Pagination placeholder */}
        {cards.length >= 50 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Showing first 50 results. Pagination coming soon.
            </p>
          </div>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV !== 'production' && cards[0] && (
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">🔍 Debug: Sample Card Data</h3>
            <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
              {JSON.stringify(cards[0], null, 2)}
            </pre>
          </div>
        )}

        {/* Supabase URL check */}
        <div className="text-xs text-muted-foreground mt-6">
          Supabase: {process.env.NEXT_PUBLIC_SUPABASE_URL}
        </div>

        {/* Info box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">💡 New Architecture Features</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Server-side filtering and sorting (no client-side processing)</li>
            <li>• Real price data from multiple sources (TCGplayer, Cardmarket, PPT)</li>
            <li>• PSA-10 grading chance calculation based on price premiums</li>
            <li>• URL-driven filters that persist across page reloads</li>
            <li>• Single source of truth via database views</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
