'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getCardBySetAndNumber } from '@/lib/queries/cards';
import { PriceTrend } from '@/components/charts/PriceTrend';
import { PopTrend } from '@/components/charts/PopTrend';
import { ConfidenceChip } from '@/components/ConfidenceChip';
import { estimatePsa10Price, computeGemRate, estimateRoi } from '@/lib/pricing';
import { CardMeta, MarketNow } from '@/lib/types';
import { isSuspiciousRatio } from '@/lib/quality';
import { Psa10Delta } from '@/components/Psa10Delta';
import { getPriceChartingBenchmark } from '@/lib/external-benchmarks';
import { getSafeImageUrl, analyzeImageIssues } from '@/lib/image-validation';

interface CardDetailModalProps {
  setId: string;
  number: string;
  onClose: () => void;
}

export function CardDetailModal({ setId, number, onClose }: CardDetailModalProps) {
  const router = useRouter();
  const [cardData, setCardData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [popHistory, setPopHistory] = useState<any[]>([]);
  const [peers, setPeers] = useState<any[]>([]);
  const [benchmark, setBenchmark] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch card data
        const card = await getCardBySetAndNumber(setId, number);
        setCardData(card);

        // Fetch history data
        const response = await fetch(`/api/history/${setId}/${number}`);
        if (response.ok) {
          const historyData = await response.json();
          setHistory(historyData.history || []);
          setPopHistory(historyData.popHistory || []);
          setPeers(historyData.peers || []);
        }
        
        // Fetch external benchmark
        const benchmarkData = await getPriceChartingBenchmark(setId, number);
        setBenchmark(benchmarkData);
      } catch (error) {
        console.error('Error fetching card data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [setId, number]);

  const handleClose = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4">Loading card details...</p>
        </div>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-center">Card not found</p>
          <button onClick={handleClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Transform card data to our types
  const cardMeta: CardMeta = {
    id: { setId: cardData.set_id, number: cardData.number },
    name: cardData.name,
    rarity: cardData.rarity || undefined,
    setName: cardData.set_name || 'Unknown Set',
    imageUrl: getSafeImageUrl(
      {
        cardId: cardData.card_id,
        setId: cardData.set_id,
        name: cardData.name,
        number: cardData.number
      },
      cardData.image_url_large || cardData.image_url_small
    )
  };
  
  // Use same logic as analysis table for consistency
  const getPreferredRawValue = (card: any) => (
    (card.raw_median_90d_cents ?? null) ??
    (card.raw_median_30d_cents ?? null) ??
    (card.ppt_raw_ebay_cents ?? null) ??
    card.ppt_raw_cents ??
    card.tcg_raw_cents ??
    (card.cm_raw_cents ? Math.round(card.cm_raw_cents * 1.05) : null) ??
    null
  );
  
  const getPreferredPSA10Value = (card: any) => {
    // Try real PSA10 data first
    const realPSA10 = (
      (card.psa10_median_90d_cents ?? null) ??
      (card.psa10_median_30d_cents ?? null) ??
      (card.ppt_psa10_ebay_cents ?? null) ??
      card.ppt_psa10_cents
    );
    
    if (realPSA10 && realPSA10 > 0) {
      return { value: realPSA10, isEstimate: false };
    }
    
    // Fallback: estimate PSA10 using realistic multiplier based on PriceCharting data
    const rawValue = getPreferredRawValue(card);
    if (rawValue && rawValue > 0) {
      return { value: Math.round(rawValue * 4.5), isEstimate: true };
    }
    
    return { value: null, isEstimate: false };
  };

  const preferredRawValue = getPreferredRawValue(cardData);
  const preferredPSA10Value = getPreferredPSA10Value(cardData);

  const marketNow: MarketNow = {
    rawUsd: preferredRawValue ? preferredRawValue / 100 : null,
    psa10Usd: preferredPSA10Value.value ? preferredPSA10Value.value / 100 : null
  };
  
  // Compute estimates
  const estPsa10 = estimatePsa10Price({ marketNow, history, setPeers: peers });
  
  // Get latest population data for gem rate calculation
  const latestPop = popHistory.length > 0 ? popHistory[popHistory.length - 1] : null;
  const gem = latestPop ? computeGemRate({ psa10: latestPop.psa10, psa9: latestPop.psa9 }) : { value: null, confidence: "none" as const, basis: "unknown" as const };
  
  // Calculate ROI with default grading fee
  const defaultGradingFee = 20;
  const roi = estimateRoi({
    raw: marketNow.rawUsd,
    gradingFee: defaultGradingFee,
    estPsa10: estPsa10.value,
    gemRate: gem.value
  });
  
  // Calculate spread
  const spread = estPsa10.value && marketNow.rawUsd ? estPsa10.value - marketNow.rawUsd - defaultGradingFee : null;
  
  // Quality checks
  const ratioSuspicious = isSuspiciousRatio(marketNow.rawUsd, estPsa10.value);
  
  // Determine recommendation
  const getRecommendation = () => {
    if (!roi.roiPct || !estPsa10.value || estPsa10.confidence === "none") return "Hold";
    if (roi.roiPct > 0.5 && estPsa10.confidence === "high") return "Buy";
    if (roi.roiPct > 0.3 && estPsa10.confidence !== "low") return "Grade";
    return "Hold";
  };
  
  const recommendation = getRecommendation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-h-[90vh] w-full max-w-6xl overflow-auto rounded-lg bg-white shadow-xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
        >
          <X size={20} />
        </button>
        
        {/* Modal content */}
        <div className="p-8">
          {/* Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Card Image */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-6">
                {cardMeta.imageUrl ? (
                  <img
                    src={cardMeta.imageUrl}
                    alt={cardMeta.name}
                    className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex flex-col items-center justify-center">
                            <span class="text-4xl mb-2">🎴</span>
                            <span class="text-gray-600 text-sm text-center px-4">${cardMeta.name}</span>
                          </div>
                        `;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">No image available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  {cardMeta.name}
                  {((cardMeta.setName?.includes('Promo') || cardMeta.setName?.includes('Black Star')) || 
                    (cardMeta.id.setId?.includes('promo') || cardMeta.id.setId?.includes('swshp'))) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      PROMO
                    </span>
                  )}
                </h1>
                <p className="text-gray-600">{cardMeta.setName} • #{cardMeta.id.number}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-600">Raw Price</div>
                  <div className="text-xl font-bold">
                    {marketNow.rawUsd ? `$${marketNow.rawUsd.toFixed(2)}` : '—'}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-600">PSA 10 Price</div>
                  <div className="text-xl font-bold">
                    {marketNow.psa10Usd ? `$${marketNow.psa10Usd.toFixed(2)}` : '—'}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    PSA 10 Estimate
                    <ConfidenceChip confidence={estPsa10.confidence} size="sm" />
                    {ratioSuspicious && (
                      <span className="text-xs text-red-600" title="Suspicious ratio - check mapping">⚠️</span>
                    )}
                  </div>
                  <div className="text-xl font-bold">
                    {estPsa10.value ? `$${estPsa10.value.toFixed(2)}` : '—'}
                    <Psa10Delta local={estPsa10.value} external={benchmark?.priceChartingPsa10} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {estPsa10.method.replace('-', ' ')}
                    {estPsa10.sample && ` • ${estPsa10.sample} samples`}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    Gem Rate
                    <ConfidenceChip confidence={gem.confidence} size="sm" />
                  </div>
                  <div className="text-xl font-bold">
                    {gem.value ? `${(gem.value * 100).toFixed(1)}%` : '—'}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-600">Spread (After Fees)</div>
                  <div className="text-xl font-bold">
                    {spread ? `$${spread.toFixed(2)}` : '—'}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-600">ROI</div>
                  <div className="text-xl font-bold">
                    {roi.roiPct ? `${(roi.roiPct * 100).toFixed(1)}%` : '—'}
                  </div>
                </div>
              </div>
              
              {/* External Benchmark */}
              {benchmark && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">PriceCharting Reference</div>
                  <div className="text-lg font-semibold text-blue-800">
                    ${benchmark.priceChartingPsa10?.toFixed(2)}
                  </div>
                  <div className="text-xs text-blue-600">
                    External market benchmark • Updated {new Date(benchmark.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              )}
              
              {/* Recommendation */}
              <div className="mt-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  recommendation === 'Buy' ? 'bg-green-100 text-green-800' :
                  recommendation === 'Grade' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {recommendation}
                </span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Price Trend (90 Days)</h3>
              <PriceTrend data={history} range="90d" />
            </div>
            
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">PSA Population Trend (90 Days)</h3>
              <PopTrend data={popHistory} range="90d" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
