'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface ValueChange {
  set_id: string;
  number: string;
  card_name: string;
  rarity: string;
  current_price: number;
  previous_price: number;
  price_change_pct: number;
  price_change_abs: number;
  image_url: string;
}

interface ValueChangesResponse {
  data: ValueChange[];
  period: string;
  type: string;
  generated: boolean;
}

export default function ValueChangesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<ValueChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState(false);
  
  const period = searchParams.get('period') || '7d';
  const type = searchParams.get('type') || 'gainers';
  const setFilter = searchParams.get('set') || '';

  useEffect(() => {
    fetchValueChanges();
  }, [period, type, setFilter]);

  const fetchValueChanges = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        type,
        limit: '50'
      });
      
      if (setFilter) {
        params.append('set', setFilter);
      }

      const response = await fetch(`/api/value-changes?${params}`);
      const result: ValueChangesResponse = await response.json();
      
      setData(result.data);
      setGenerated(result.generated);
    } catch (error) {
      console.error('Error fetching value changes:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/value-changes?${params.toString()}`);
  };

  const formatChange = (pct: number, abs: number) => {
    const sign = pct >= 0 ? '+' : '';
    const color = pct >= 0 ? 'text-green-600' : 'text-red-600';
    return (
      <div className={`font-medium ${color}`}>
        {sign}{pct.toFixed(1)}%
        <div className="text-sm font-normal text-gray-500">
          {sign}${abs.toFixed(2)}
        </div>
      </div>
    );
  };

  const getPeriodLabel = (p: string) => {
    switch (p) {
      case '7d': return 'Past Week';
      case '30d': return 'Past Month';
      case '90d': return 'Past 90 Days';
      default: return 'Past Week';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Value Changes</h1>
          <p className="text-muted-foreground mt-2">
            Track the biggest gainers and losers in the Pokemon TCG market
          </p>
          {generated && (
            <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-md inline-block">
              Demo data - Connect your database for real-time tracking
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Period Filter */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { value: '7d', label: 'Week' },
              { value: '30d', label: 'Month' },
              { value: '90d', label: '90 Days' }
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => updateParams('period', p.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === p.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { value: 'gainers', label: 'Biggest Gainers', icon: '📈' },
              { value: 'losers', label: 'Biggest Losers', icon: '📉' }
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => updateParams('type', t.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  type === t.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Set Filter */}
          <select
            value={setFilter}
            onChange={(e) => updateParams('set', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sets</option>
            <optgroup label="Recent Sets">
              <option value="sv12">Mega Evolutions</option>
              <option value="sv115">Space-Time Smackdown</option>
              <option value="sv11">Journey Together</option>
              <option value="sv10">Prismatic Evolutions</option>
              <option value="sv09">Paradise Dragona</option>
              <option value="sv08">Surging Sparks</option>
            </optgroup>
            <optgroup label="Scarlet & Violet Era">
              <option value="sv07">Stellar Crown</option>
              <option value="sv065">Shrouded Fable</option>
              <option value="sv06">Twilight Masquerade</option>
              <option value="sv05">Temporal Forces</option>
              <option value="sv045">Paldean Fates</option>
              <option value="sv04">Paradox Rift</option>
              <option value="sv35">151</option>
              <option value="sv03">Obsidian Flames</option>
              <option value="sv02">Paldea Evolved</option>
              <option value="sv01">Scarlet & Violet Base</option>
            </optgroup>
            <optgroup label="Sword & Shield Era">
              <option value="swsh13">Silver Tempest</option>
              <option value="swsh125">Lost Origin</option>
              <option value="pgo">Pokemon GO</option>
              <option value="swsh12">Astral Radiance</option>
              <option value="swsh11">Brilliant Stars</option>
              <option value="swsh10">Fusion Strike</option>
            </optgroup>
            <optgroup label="Celebrations">
              <option value="cel25c">Celebrations Classic</option>
              <option value="cel25">Celebrations</option>
            </optgroup>
            <optgroup label="Japanese Sets">
              <option value="sv12-jp">Mega Evolution (JP)</option>
              <option value="sv115-jp">Space-Time Creation (JP)</option>
              <option value="sv11-jp">Journey Together (JP)</option>
              <option value="sv10-jp">Prismatic Evolutions (JP)</option>
              <option value="sv35-jp">Pokemon Card 151 (JP)</option>
              <option value="sv01-jp">Scarlet ex / Violet ex (JP)</option>
              <option value="swsh11-jp">Star Birth (JP)</option>
              <option value="cel25c-jp">Celebrations Classic (JP)</option>
            </optgroup>
          </select>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">
              {type === 'gainers' ? '📈 Biggest Gainers' : '📉 Biggest Losers'} - {getPeriodLabel(period)}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading value changes...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No data available for the selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Card
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Previous Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Set
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, index) => (
                    <tr key={`${item.set_id}-${item.number}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.image_url && (
                            <div className="flex-shrink-0 h-10 w-10 mr-3">
                              <img
                                className="h-10 w-10 rounded object-cover"
                                src={item.image_url}
                                alt={item.card_name}
                              />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.card_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{item.number} • {item.rarity}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.current_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${item.previous_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatChange(item.price_change_pct, item.price_change_abs)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.set_id.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
