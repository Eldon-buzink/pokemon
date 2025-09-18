import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function CoveragePage() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data, error } = await db
    .from('v_cards_latest')
    .select('set_id, ppt_raw_cents, ppt_psa10_cents, tcg_raw_cents, cm_raw_cents');
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-600">Error loading coverage data</h1>
        <pre className="mt-4 p-4 bg-red-50 rounded">{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }
  
  // Calculate coverage statistics by set
  const sets = new Map();
  for (const r of data || []) {
    const s = sets.get(r.set_id) || { 
      n: 0, 
      withPPT: 0, 
      withPPTGraded: 0,
      withTCG: 0, 
      withCM: 0 
    };
    s.n++;
    if (r.ppt_raw_cents) s.withPPT++;
    if (r.ppt_psa10_cents) s.withPPTGraded++;
    if (r.tcg_raw_cents) s.withTCG++;
    if (r.cm_raw_cents) s.withCM++;
    sets.set(r.set_id, s);
  }
  
  // Convert to array and sort by set_id
  const coverageData = Array.from(sets.entries())
    .map(([setId, stats]) => ({
      setId,
      total: stats.n,
      pptCoverage: `${stats.withPPT}/${stats.n} (${((stats.withPPT / stats.n) * 100).toFixed(1)}%)`,
      pptGradedCoverage: `${stats.withPPTGraded}/${stats.n} (${((stats.withPPTGraded / stats.n) * 100).toFixed(1)}%)`,
      tcgCoverage: `${stats.withTCG}/${stats.n} (${((stats.withTCG / stats.n) * 100).toFixed(1)}%)`,
      cmCoverage: `${stats.withCM}/${stats.n} (${((stats.withCM / stats.n) * 100).toFixed(1)}%)`
    }))
    .sort((a, b) => a.setId.localeCompare(b.setId));
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Price Data Coverage</h1>
        
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Coverage by Set</h2>
            <p className="text-sm text-gray-600 mt-1">
              Shows how many cards in each set have price data from each source
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Set ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cards
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PPT Raw
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PPT PSA10
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TCGplayer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cardmarket
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coverageData.map((row) => (
                  <tr key={row.setId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.setId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.pptCoverage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.pptGradedCoverage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.tcgCoverage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.cmCoverage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Raw Data (JSON)</h3>
          <pre className="text-xs bg-white p-4 rounded border overflow-auto max-h-96 text-gray-700">
            {JSON.stringify(Array.from(sets.entries()), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
