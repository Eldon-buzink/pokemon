import { createClient } from '@supabase/supabase-js';
import { psa10Chance, getPSA10ChanceBadgeColor } from '@/lib/compute/psa10';

export const dynamic = 'force-dynamic';

type DebugCard = {
  card_id: string;
  set_id: string;
  number: string;
  name: string;
  rarity: string | null;
  tcg_raw_cents: number | null;
  tcg_currency: string | null;
  cm_raw_cents: number | null;
  cm_currency: string | null;
  ppt_raw_cents: number | null;
  ppt_psa10_cents: number | null;
  issues: string[];
};

export default async function CelebrationsDebugPage() {
  let celebrationCards: DebugCard[] = [];
  let classicCards: DebugCard[] = [];
  let error: string | null = null;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch both Celebrations main and classic using the new view
    const { data: mainData, error: mainError } = await supabase
      .from('v_cards_latest')
      .select('*')
      .eq('set_id', 'cel25')
      .order('number');

    const { data: classicData, error: classicError } = await supabase
      .from('v_cards_latest')
      .select('*')
      .eq('set_id', 'cel25c')
      .order('number');

    if (mainError || classicError) {
      throw new Error(mainError?.message || classicError?.message || 'Database error');
    }

    // Process and flag issues
    celebrationCards = (mainData || []).map(card => processCardForIssues(card));
    classicCards = (classicData || []).map(card => processCardForIssues(card));

  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load data';
    console.error('Error loading debug data:', e);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Celebrations Data Quality Check</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-medium text-gray-500">Celebrations Main</h3>
            <p className="text-2xl font-bold">{celebrationCards.length} cards</p>
            <p className="text-sm text-red-600">
              {celebrationCards.filter(c => c.issues.length > 0).length} with issues
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-medium text-gray-500">Classic Collection</h3>
            <p className="text-2xl font-bold">{classicCards.length} cards</p>
            <p className="text-sm text-red-600">
              {classicCards.filter(c => c.issues.length > 0).length} with issues
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-medium text-gray-500">Missing Prices</h3>
            <p className="text-2xl font-bold">
              {[...celebrationCards, ...classicCards].filter(c => 
                c.issues.includes('Missing all price data')
              ).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-medium text-gray-500">Price Discrepancies</h3>
            <p className="text-2xl font-bold">
              {[...celebrationCards, ...classicCards].filter(c => 
                c.issues.includes('Large USD/EUR price difference')
              ).length}
            </p>
          </div>
        </div>

        {/* Celebrations Main */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Celebrations Main (cel25)</h2>
          <DebugTable cards={celebrationCards} />
        </div>

        {/* Classic Collection */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Celebrations Classic Collection (cel25c)</h2>
          <DebugTable cards={classicCards} />
        </div>
      </div>
    </div>
  );
}

function processCardForIssues(card: any): DebugCard {
  const issues: string[] = [];

  // Check for missing price data
  if (!card.tcg_raw_cents && !card.cm_raw_cents && !card.ppt_raw_cents) {
    issues.push('Missing all price data');
  }

  // Check for large USD/EUR price differences (assuming 1 EUR = 1.1 USD roughly)
  if (card.tcg_raw_cents && card.cm_raw_cents) {
    const usdPrice = card.tcg_raw_cents / 100;
    const eurPrice = card.cm_raw_cents / 100;
    const eurToUsd = eurPrice * 1.1; // Rough conversion
    const difference = Math.abs(usdPrice - eurToUsd) / Math.min(usdPrice, eurToUsd);
    
    if (difference > 0.7) { // 70% difference threshold
      issues.push('Large USD/EUR price difference');
    }
  }

  // Check for missing PSA10 data when raw price exists
  if (card.ppt_raw_cents && !card.ppt_psa10_cents) {
    issues.push('Missing PSA10 price data');
  }

  return {
    ...card,
    issues
  };
}

function DebugTable({ cards }: { cards: DebugCard[] }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">TCG (USD)</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">CM (EUR)</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">PPT Raw</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">PPT PSA10</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">PSA10 Chance</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cards.map(card => {
              const chance = psa10Chance(card.ppt_raw_cents, card.ppt_psa10_cents);
              const hasIssues = card.issues.length > 0;
              
              return (
                <tr key={card.card_id} className={hasIssues ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2 font-mono">{card.number}</td>
                  <td className="px-3 py-2">{card.name}</td>
                  <td className="px-3 py-2">
                    {card.tcg_raw_cents ? `$${(card.tcg_raw_cents / 100).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {card.cm_raw_cents ? `€${(card.cm_raw_cents / 100).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {card.ppt_raw_cents ? `$${(card.ppt_raw_cents / 100).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {card.ppt_psa10_cents ? `$${(card.ppt_psa10_cents / 100).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {chance.pct !== null ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getPSA10ChanceBadgeColor(chance.band)}`}>
                        {chance.band} ({chance.pct}%)
                      </span>
                    ) : (
                      <span className="text-gray-400">Unknown</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {card.issues.length > 0 ? (
                      <div className="space-y-1">
                        {card.issues.map((issue, idx) => (
                          <div key={idx} className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                            {issue}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-green-600 text-xs">✓ OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
