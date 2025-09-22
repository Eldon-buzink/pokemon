import { getCardBySetAndNumber } from '@/lib/queries/cards';
import { PriceTrend } from '@/components/charts/PriceTrend';
import { PopTrend } from '@/components/charts/PopTrend';
import { ConfidenceChip } from '@/components/ConfidenceChip';
import { estimatePsa10Price, computeGemRate, estimateRoi } from '@/lib/pricing';
import { CardMeta, MarketNow } from '@/lib/types';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Remove the problematic dynamic imports - we'll use the components directly

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ setId: string; number: string }>;
}

async function fetchHistoryData(setId: string, number: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/history/${setId}/${number}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('Failed to fetch history data:', response.statusText);
      return { history: [], popHistory: [], peers: [] };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching history data:', error);
    return { history: [], popHistory: [], peers: [] };
  }
}

export default async function CardDetailPage({ params }: PageProps) {
  const { setId, number } = await params;
  
  // Fetch card data
  const cardData = await getCardBySetAndNumber(setId, number);
  
  if (!cardData) {
    notFound();
  }
  
  // Fetch history data
  const { history, popHistory, peers } = await fetchHistoryData(setId, number);
  
  // Transform card data to our types
  const cardMeta: CardMeta = {
    id: { setId: cardData.set_id, number: cardData.number },
    name: cardData.name,
    rarity: cardData.rarity || undefined,
    setName: cardData.set_name || 'Unknown Set',
    imageUrl: cardData.image_url_large || cardData.image_url_small || undefined
  };
  
  const marketNow: MarketNow = {
    rawUsd: cardData.tcg_raw_cents ? cardData.tcg_raw_cents / 100 : 
            cardData.ppt_raw_cents ? cardData.ppt_raw_cents / 100 : 
            cardData.cm_raw_cents ? cardData.cm_raw_cents / 100 : null,
    psa10Usd: cardData.ppt_psa10_cents ? cardData.ppt_psa10_cents / 100 : null
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
  
  // Determine recommendation
  const getRecommendation = () => {
    if (!roi.roiPct || !estPsa10.value || estPsa10.confidence === "none") return "Hold";
    if (roi.roiPct > 0.5 && estPsa10.confidence === "high") return "Buy";
    if (roi.roiPct > 0.3 && estPsa10.confidence !== "low") return "Grade";
    return "Hold";
  };
  
  const recommendation = getRecommendation();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link href="/analysis" className="text-blue-600 hover:text-blue-800">Analysis</Link>
          <span className="mx-2 text-gray-500">›</span>
          <Link href={`/analysis?set=${setId}`} className="text-blue-600 hover:text-blue-800">{cardMeta.setName}</Link>
          <span className="mx-2 text-gray-500">›</span>
          <span className="text-gray-700">{cardMeta.name}</span>
        </nav>

        {/* Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Card Image */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border p-6">
              {cardMeta.imageUrl ? (
                <img 
                  src={cardMeta.imageUrl} 
                  alt={cardMeta.name}
                  className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">No image available</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600">Raw Price</div>
              <div className="text-2xl font-bold">
                {marketNow.rawUsd ? `$${marketNow.rawUsd.toFixed(2)}` : '—'}
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600">PSA 10 Price</div>
              <div className="text-2xl font-bold">
                {marketNow.psa10Usd ? `$${marketNow.psa10Usd.toFixed(2)}` : '—'}
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                PSA 10 Estimate
                <ConfidenceChip confidence={estPsa10.confidence} size="sm" />
              </div>
              <div className="text-2xl font-bold">
                {estPsa10.value ? `$${estPsa10.value.toFixed(2)}` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {estPsa10.method.replace('-', ' ')}
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                Gem Rate
                <ConfidenceChip confidence={gem.confidence} size="sm" />
              </div>
              <div className="text-2xl font-bold">
                {gem.value ? `${(gem.value * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600">Spread (After Fees)</div>
              <div className="text-2xl font-bold">
                {spread ? `$${spread.toFixed(2)}` : '—'}
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600">ROI</div>
              <div className="text-2xl font-bold">
                {roi.roiPct ? `${(roi.roiPct * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Price Trend (90 Days)</h3>
            <Suspense fallback={<div className="h-[300px] bg-gray-50 rounded animate-pulse"></div>}>
              <PriceTrend data={history} range="90d" />
            </Suspense>
          </div>
          
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">PSA Population Trend (90 Days)</h3>
            <Suspense fallback={<div className="h-[300px] bg-gray-50 rounded animate-pulse"></div>}>
              <PopTrend data={popHistory} range="90d" />
            </Suspense>
          </div>
        </div>

        {/* Card Facts and Recommendation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card Facts */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Card Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Set</dt>
                <dd className="font-medium">{cardMeta.setName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Number</dt>
                <dd className="font-medium">{cardMeta.id.number}</dd>
              </div>
              {cardMeta.rarity && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Rarity</dt>
                  <dd className="font-medium">{cardMeta.rarity}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">Card ID</dt>
                <dd className="font-mono text-sm">{cardData.card_id}</dd>
              </div>
            </dl>
          </div>

          {/* Recommendation */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Recommendation</h3>
            <div className="mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                recommendation === 'Buy' ? 'bg-green-100 text-green-800' :
                recommendation === 'Grade' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {recommendation}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {recommendation === 'Buy' && 'Strong potential for profit with high confidence estimate.'}
              {recommendation === 'Grade' && 'Moderate potential, consider grading based on card condition.'}
              {recommendation === 'Hold' && 'Current market conditions suggest holding or waiting for better data.'}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-gray-500">
                <div>Grading Fee: ${defaultGradingFee}</div>
                {estPsa10.sample && <div>Sample Size: {estPsa10.sample}</div>}
                {latestPop && <div>Population Total: {latestPop.total.toLocaleString()}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
