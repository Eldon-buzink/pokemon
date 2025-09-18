export const dynamic = 'force-dynamic';

export default function Page(){
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">PPT Sales Sync (Rate-Limited)</h1>
        <p className="text-gray-600 mb-4">
          Run sales sync in chunks to respect PPT API rate limits. Each chunk processes 8 cards with intelligent backoff.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">📋 Smart Chunked Sync for cel25c (High-Value Cards)</h3>
        <p className="text-sm text-blue-700 mb-3">
          Now prioritizes cards worth $15+ with 24h persistent caching. Run in sequence:
        </p>
        <ul className="space-y-2">
          <li>
            <a 
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors" 
              href="/api/cron/sync-ppt-sales?set=cel25c&limit=6&offset=0&minUsd=1500"
              target="_blank"
            >
              Chunk 1: Top 6 Cards
            </a>
            <span className="ml-2 text-xs text-gray-500">(offset=0, minUsd=$15) ~15-20 min</span>
          </li>
          <li>
            <a 
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors" 
              href="/api/cron/sync-ppt-sales?set=cel25c&limit=6&offset=6&minUsd=1500"
              target="_blank"
            >
              Chunk 2: Next 6 Cards
            </a>
            <span className="ml-2 text-xs text-gray-500">(offset=6, minUsd=$15) ~15-20 min</span>
          </li>
          <li>
            <a 
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors" 
              href="/api/cron/sync-ppt-sales?set=cel25c&limit=6&offset=12&minUsd=1500"
              target="_blank"
            >
              Chunk 3: Cards 13-18
            </a>
            <span className="ml-2 text-xs text-gray-500">(offset=12, minUsd=$15) ~15-20 min</span>
          </li>
          <li>
            <a 
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors" 
              href="/api/cron/sync-ppt-sales?set=cel25c&limit=7&offset=18&minUsd=1500"
              target="_blank"
            >
              Chunk 4: Remaining Cards
            </a>
            <span className="ml-2 text-xs text-gray-500">(offset=18, minUsd=$15) Final chunk</span>
          </li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">⚠️ Rate Limit Handling</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Each request includes exponential backoff with jitter</li>
          <li>• Respects <code>Retry-After</code> headers from PPT API</li>
          <li>• 150-270ms delay between cards within each chunk</li>
          <li>• If you see 429 errors, wait 2-3 minutes before next chunk</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-800 mb-2">✅ After Sync Complete</h3>
        <p className="text-sm text-green-700 mb-3">
          Once all chunks are done, the database views will be populated with real PSA10 data:
        </p>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• <code>graded_sales</code> table will contain eBay sales data</li>
          <li>• <code>v_psa_medians</code> view will show 30/90-day medians</li>
          <li>• <a href="/analysis-new?set=cel25c" className="underline">Analysis page</a> will show real PSA10 prices instead of estimates</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-800 mb-2">🔍 Debug & Verification</h3>
        <ul className="space-y-2">
          <li>
            <a 
              className="text-blue-600 hover:text-blue-800 underline" 
              href="/api/debug/ppt-sales?set=celebrations-classic-collection&number=2"
              target="_blank"
            >
              Debug PPT API Response
            </a>
            <span className="ml-2 text-xs text-gray-500">Check raw API response format</span>
          </li>
          <li>
            <a 
              className="text-blue-600 hover:text-blue-800 underline" 
              href="/debug/celebrations"
            >
              Data Quality Check
            </a>
            <span className="ml-2 text-xs text-gray-500">Verify data completeness</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
