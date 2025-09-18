import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function PriceSyncAdminPage() {
  let sets: Array<{id: string, name: string}> = [];
  let error: string | null = null;

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data, error: dbError } = await db
      .from('sets')
      .select('id, name')
      .order('release_date', { ascending: false })
      .limit(50);
      
    if (dbError) {
      throw dbError;
    }
    
    sets = data || [];
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load sets';
    console.error('Error loading sets:', e);
  }

  // Fallback popular sets if database query fails
  if (sets.length === 0 && !error) {
    sets = [
      { id: 'cel25', name: 'Celebrations' },
      { id: 'cel25c', name: 'Celebrations Classic Collection' },
      { id: 'swsh12', name: 'Silver Tempest' },
      { id: 'swsh11', name: 'Lost Origin' },
      { id: 'swsh10', name: 'Astral Radiance' },
    ];
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Price Sync Administration</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error loading sets: {error}</p>
            <p className="text-sm text-red-600 mt-1">Using fallback set list below.</p>
          </div>
        )}

        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold">Available Sets</h2>
            <p className="text-sm text-gray-600 mt-1">
              Click to sync prices for individual sets. Start with smaller sets to avoid rate limits.
            </p>
          </div>
          
          <div className="divide-y">
            {sets.map(set => (
              <div key={set.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{set.name}</h3>
                    <p className="text-sm text-gray-500">Set ID: {set.id}</p>
                  </div>
                  <a
                    href={`/api/cron/sync-prices?set=${set.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Sync Prices
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Rate Limit Guidelines</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Start with Celebrations sets (cel25, cel25c) - smaller card counts</li>
            <li>• Wait 30-60 seconds between large set syncs</li>
            <li>• Monitor the browser network tab for API errors</li>
            <li>• If you hit rate limits, wait 5-10 minutes before retrying</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/admin/sync"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Sync Administration
          </a>
        </div>
      </div>
    </div>
  );
}
