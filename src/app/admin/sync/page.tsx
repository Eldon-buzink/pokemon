import Link from 'next/link';

export default function SyncAdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Data Sync Administration</h1>
        
        <div className="space-y-6">
          {/* Catalog Sync */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Catalog Sync</h2>
            <p className="text-gray-600 mb-4">
              Sync card catalog data from Pokemon TCG API for all sets. This updates card metadata, 
              images, and set information.
            </p>
            <a 
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              href="/api/cron/sync-catalog"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sync Catalog (All Sets)
            </a>
          </div>

          {/* Price Sync */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Price Sync</h2>
            <p className="text-gray-600 mb-4">
              Sync price data for specific sets. Choose sets individually to avoid rate limits.
            </p>
            <Link 
              href="/admin/price"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Manage Price Sync
            </Link>
          </div>

          {/* Debug Tools */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Debug & Monitoring</h2>
            <div className="space-y-2">
              <div>
                <Link 
                  href="/debug/celebrations"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Celebrations Debug Page
                </Link>
                <p className="text-sm text-gray-500">Check data quality and pricing inconsistencies</p>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-gray-50 rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Usage Guidelines</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Run catalog sync first to ensure all card metadata is up to date</li>
              <li>• Sync prices for individual sets to avoid API rate limits</li>
              <li>• Monitor debug pages for data quality issues</li>
              <li>• Automated syncs run via cron jobs - manual syncs are for immediate updates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
