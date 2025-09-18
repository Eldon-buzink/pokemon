import Link from 'next/link';

interface PriceSyncBannerProps {
  setId: string;
  syncStatus: {
    totalCards: number;
    cardsWithPrices: number;
    syncPercentage: number;
    lastSyncBySource: Record<string, string>;
    needsSync: boolean;
  };
}

export function PriceSyncBanner({ setId, syncStatus }: PriceSyncBannerProps) {
  if (!syncStatus.needsSync) {
    return null; // No banner needed if sync is good
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Prices Not Fully Synced
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Only {syncStatus.cardsWithPrices} of {syncStatus.totalCards} cards 
              ({syncStatus.syncPercentage.toFixed(1)}%) have price data for set <code>{setId}</code>.
            </p>
            
            {Object.keys(syncStatus.lastSyncBySource).length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Last sync times:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {Object.entries(syncStatus.lastSyncBySource).map(([source, timestamp]) => (
                    <li key={source}>
                      <span className="capitalize">{source}</span>: {formatDate(timestamp)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="mt-4">
            <div className="flex space-x-3">
              <Link
                href="/admin/price"
                className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
              >
                Sync Prices in Admin
              </Link>
              <Link
                href={`/api/cron/sync-prices?set=${setId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-yellow-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors"
              >
                Quick Sync This Set
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
