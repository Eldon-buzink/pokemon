'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { getCardQualityIssues } from '@/lib/schema';
import { isSuspiciousRatio } from '@/lib/quality';

interface CardIssue {
  card_id: string;
  set_id: string;
  number: string;
  name: string;
  rarity: string | null;
  issues: string[];
  image_url_small: string | null;
  raw_usd: number | null;
  psa10_usd: number | null;
}

interface SetSummary {
  set_id: string;
  set_name: string;
  total_cards: number;
  missing_images: number;
  missing_raw_price: number;
  missing_psa10_price: number;
  suspicious_ratios: number;
  last_updated: string;
}

export default function IngestReportPage() {
  const [setSummaries, setSetSummaries] = useState<SetSummary[]>([]);
  const [cardIssues, setCardIssues] = useState<CardIssue[]>([]);
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showIssuesOnly, setShowIssuesOnly] = useState(true);

  useEffect(() => {
    fetchIngestReport();
  }, []);

  const fetchIngestReport = async () => {
    setLoading(true);
    const supabase = createSupabaseClient();

    try {
      // Fetch set summaries
      const { data: setsData, error: setsError } = await supabase
        .from('v_cards_latest')
        .select('set_id, set_name, image_url_small, tcg_raw_cents, ppt_psa10_cents')
        .order('set_id');

      if (setsError) {
        console.error('Error fetching sets data:', setsError);
        return;
      }

      // Group by set and calculate summaries
      const setGroups = setsData?.reduce((acc, card) => {
        if (!acc[card.set_id]) {
          acc[card.set_id] = {
            set_id: card.set_id,
            set_name: card.set_name || card.set_id,
            cards: []
          };
        }
        acc[card.set_id].cards.push(card);
        return acc;
      }, {} as Record<string, any>) || {};

      const summaries: SetSummary[] = Object.values(setGroups).map((group: any) => {
        const cards = group.cards;
        const missingImages = cards.filter((c: any) => !c.image_url_small).length;
        const missingRaw = cards.filter((c: any) => !c.tcg_raw_cents).length;
        const missingPsa10 = cards.filter((c: any) => !c.ppt_psa10_cents).length;
        const suspiciousRatios = cards.filter((c: any) => {
          const raw = c.tcg_raw_cents ? c.tcg_raw_cents / 100 : null;
          const psa10 = c.ppt_psa10_cents ? c.ppt_psa10_cents / 100 : null;
          return isSuspiciousRatio(raw, psa10);
        }).length;

        return {
          set_id: group.set_id,
          set_name: group.set_name,
          total_cards: cards.length,
          missing_images: missingImages,
          missing_raw_price: missingRaw,
          missing_psa10_price: missingPsa10,
          suspicious_ratios: suspiciousRatios,
          last_updated: new Date().toISOString()
        };
      });

      setSetSummaries(summaries);

      // Fetch detailed card issues for selected set
      if (selectedSet) {
        const setCards = setGroups[selectedSet]?.cards || [];
        const issues: CardIssue[] = setCards
          .map((card: any) => {
            const cardNormalized = {
              setId: card.set_id,
              number: card.number,
              name: card.name,
              rarity: card.rarity,
              imageUrl: card.image_url_small,
              marketNow: {
                rawUsd: card.tcg_raw_cents ? card.tcg_raw_cents / 100 : null,
                psa10Usd: card.ppt_psa10_cents ? card.ppt_psa10_cents / 100 : null
              }
            };

            const qualityIssues = getCardQualityIssues(cardNormalized);
            
            return {
              card_id: `${card.set_id}-${card.number}`,
              set_id: card.set_id,
              number: card.number,
              name: card.name,
              rarity: card.rarity,
              issues: qualityIssues,
              image_url_small: card.image_url_small,
              raw_usd: card.tcg_raw_cents ? card.tcg_raw_cents / 100 : null,
              psa10_usd: card.ppt_psa10_cents ? card.ppt_psa10_cents / 100 : null
            };
          })
          .filter((card: CardIssue) => !showIssuesOnly || card.issues.length > 0);

        setCardIssues(issues);
      }

    } catch (error) {
      console.error('Error fetching ingest report:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyBrokenCards = () => {
    const brokenCardsList = cardIssues
      .filter(card => card.issues.length > 0)
      .map(card => `${card.set_id}-${card.number}: ${card.name} (${card.issues.join(', ')})`)
      .join('\n');
    
    navigator.clipboard.writeText(brokenCardsList);
    alert('Copied broken cards list to clipboard!');
  };

  const getHealthColor = (missing: number, total: number) => {
    const pct = missing / total;
    if (pct === 0) return 'text-green-600';
    if (pct < 0.1) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Ingestion Report</h1>
          <p className="text-muted-foreground mt-2">
            Monitor data quality and identify missing information across all sets
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading ingestion report...</p>
          </div>
        ) : (
          <>
            {/* Set Summaries */}
            <div className="bg-white rounded-lg border overflow-hidden mb-8">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Set Health Overview</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Set
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cards
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Missing Images
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Missing Raw Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Missing PSA10 Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Suspicious Ratios
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {setSummaries.map((set) => (
                      <tr key={set.set_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{set.set_name}</div>
                          <div className="text-sm text-gray-500">{set.set_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {set.total_cards}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getHealthColor(set.missing_images, set.total_cards)}`}>
                          {set.missing_images} ({Math.round(set.missing_images / set.total_cards * 100)}%)
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getHealthColor(set.missing_raw_price, set.total_cards)}`}>
                          {set.missing_raw_price} ({Math.round(set.missing_raw_price / set.total_cards * 100)}%)
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getHealthColor(set.missing_psa10_price, set.total_cards)}`}>
                          {set.missing_psa10_price} ({Math.round(set.missing_psa10_price / set.total_cards * 100)}%)
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${set.suspicious_ratios > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {set.suspicious_ratios}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              setSelectedSet(set.set_id);
                              fetchIngestReport();
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card Issues Detail */}
            {selectedSet && (
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    Card Issues - {setSummaries.find(s => s.set_id === selectedSet)?.set_name}
                  </h2>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showIssuesOnly}
                        onChange={(e) => setShowIssuesOnly(e.target.checked)}
                        className="mr-2"
                      />
                      Show issues only
                    </label>
                    <button
                      onClick={copyBrokenCards}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Copy Broken Cards List
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Card
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Image
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Raw Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PSA10 Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Issues
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cardIssues.map((card) => (
                        <tr key={card.card_id} className={card.issues.length > 0 ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{card.name}</div>
                            <div className="text-sm text-gray-500">#{card.number} • {card.rarity}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {card.image_url_small ? (
                              <img src={card.image_url_small} alt={card.name} className="h-8 w-6 rounded object-cover" />
                            ) : (
                              <span className="text-red-500">❌</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {card.raw_usd ? (
                              <span className="text-green-600">${card.raw_usd.toFixed(2)}</span>
                            ) : (
                              <span className="text-red-500">Missing</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {card.psa10_usd ? (
                              <span className="text-green-600">${card.psa10_usd.toFixed(2)}</span>
                            ) : (
                              <span className="text-red-500">Missing</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {card.issues.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {card.issues.map((issue, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {issue}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-green-600">✅ OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
