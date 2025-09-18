import { listCardsLatest, getAvailableSets } from '@/lib/queries/cards';
import { FilterBar } from '@/components/FilterBar';
import { psa10Chance, formatPSA10Chance, getPSA10ChanceBadgeColor } from '@/lib/compute/psa10';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

interface SearchParams {
  set?: string;
  q?: string;
  sort?: 'price' | 'psa10' | 'number' | 'name';
  dir?: 'asc' | 'desc';
  min?: string;
  max?: string;
  page?: string;
  limit?: string;
}

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
  
  try {
    const startTime = Date.now();
    
    cards = await listCardsLatest({
      setId,
      q: params.q,
      sort: params.sort ?? 'number',
      dir: params.dir ?? 'asc',
      min: params.min ? Number(params.min) : undefined,
      max: params.max ? Number(params.max) : undefined,
      page: params.page ? Number(params.page) : 1,
      limit: params.limit ? Number(params.limit) : 50,
    });
    
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

        {cards.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-500">No cards found matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">TCG USD</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">CM EUR</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">PPT Raw</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">PPT PSA10</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">PSA10 Chance</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Rarity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cards.map((card) => {
                    const chance = psa10Chance(card.ppt_raw_cents, card.ppt_psa10_cents);
                    
                    return (
                      <tr key={card.card_id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-mono">
                          {card.number}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {card.name}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {card.tcg_raw_cents ? `$${(card.tcg_raw_cents / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {card.cm_raw_cents ? `€${(card.cm_raw_cents / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {card.ppt_raw_cents ? `$${(card.ppt_raw_cents / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {card.ppt_psa10_cents ? `$${(card.ppt_psa10_cents / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          {chance.pct !== null ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPSA10ChanceBadgeColor(chance.band)}`}>
                              {formatPSA10Chance(chance)}
                            </span>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500">
                          {card.rarity || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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

        {/* Info box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
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
