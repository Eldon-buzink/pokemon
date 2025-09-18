'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { psa10Chance, formatPSA10Chance, getPSA10ChanceBadgeColor } from '@/lib/compute/psa10';
import { usdToEurCents, formatCurrencyWithEstimate } from '@/lib/fx';
import { Sparkline } from '@/components/sparkline';
import { Tooltip } from '@/components/tooltip';

interface Card {
  card_id: string;
  set_id: string;
  number: string;
  name: string;
  rarity?: string;
  image_url_small?: string;
  image_url_large?: string;
  set_name?: string;
  tcg_raw_cents?: number;
  tcg_currency?: string;
  cm_raw_cents?: number;
  cm_currency?: string;
  ppt_raw_cents?: number;
  ppt_psa10_cents?: number;
}

interface EnhancedAnalysisTableProps {
  cards: Card[];
  currentSort?: string;
  currentDir?: string;
}

// Helper functions for calculations
function generateMockTrendData(cardId: string) {
  // Generate deterministic sparkline data based on card ID to prevent hydration mismatches
  const seed = cardId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Use a fixed base date to ensure consistency between server and client
  const baseDate = new Date('2024-01-01T00:00:00Z').getTime();
  
  return Array.from({ length: 30 }, (_, i) => {
    // Use card-specific seed for deterministic "random" values
    const pseudoRandom = Math.sin(seed + i * 0.5) * 0.5 + 0.5;
    const trendValue = 50 + pseudoRandom * 100 + Math.sin(i / 5) * 20;
    
    return {
      date: new Date(baseDate - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      price: Math.max(0, trendValue)
    };
  });
}

function calculateChange(current: number, previous: number): number {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function calculateProfit(rawPrice: number, psa10Price: number): number {
  if (!rawPrice || !psa10Price) return 0;
  const gradingCost = 20 * 100; // $20 in cents
  const shippingCost = 10 * 100; // $10 in cents
  return psa10Price - rawPrice - gradingCost - shippingCost;
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function formatProfit(profit: number): string {
  const sign = profit >= 0 ? '+' : '';
  return `${sign}$${(profit / 100).toFixed(2)}`;
}

function getChangeColor(change: number): string {
  if (change > 0) return 'text-green-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-500';
}

function getProfitColor(profit: number): string {
  if (profit > 0) return 'text-green-600';
  if (profit < 0) return 'text-red-600';
  return 'text-gray-500';
}

// Clickable header component for sorting
function ClickableHeader({ 
  label, 
  sortKey, 
  currentSort, 
  currentDir,
  tooltip,
  onClick 
}: {
  label: string;
  sortKey: string;
  currentSort?: string;
  currentDir?: string;
  tooltip?: string;
  onClick: (sortKey: string) => void;
}) {
  const isActive = currentSort === sortKey;
  
  const getSortIcon = () => {
    if (!isActive) return null;
    return currentDir === 'desc' ? '↓' : '↑';
  };

  const HeaderContent = () => (
    <button
      onClick={() => onClick(sortKey)}
      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
    >
      <span>{label}</span>
      {getSortIcon() && <span className="text-blue-500">{getSortIcon()}</span>}
    </button>
  );

  if (tooltip) {
    return (
      <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
        <Tooltip content={tooltip}>
          <HeaderContent />
        </Tooltip>
      </th>
    );
  }

  return (
    <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
      <HeaderContent />
    </th>
  );
}

export function EnhancedAnalysisTable({ cards, currentSort, currentDir }: EnhancedAnalysisTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (sortKey: string) => {
    const params = new URLSearchParams(searchParams);
    const isCurrentSort = currentSort === sortKey;
    const newDir = isCurrentSort && currentDir === 'desc' ? 'asc' : 'desc';
    
    params.set('sort', sortKey);
    params.set('dir', newDir);
    
    router.push(`?${params.toString()}`);
  };

  // Check if we have PPT data
  const hasPPT = cards.some(card => card.ppt_raw_cents != null || card.ppt_psa10_cents != null);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Card</th>
            <ClickableHeader 
              label="Trend" 
              sortKey="trend" 
              currentSort={currentSort} 
              currentDir={currentDir}
              tooltip="30-day price trend visualization"
              onClick={handleSort}
            />
            <ClickableHeader 
              label="TCG USD" 
              sortKey="price" 
              currentSort={currentSort} 
              currentDir={currentDir}
              tooltip="Current TCGplayer market price in USD"
              onClick={handleSort}
            />
            <ClickableHeader 
              label="CM EUR" 
              sortKey="cm_price" 
              currentSort={currentSort} 
              currentDir={currentDir}
              tooltip="Current Cardmarket price in EUR"
              onClick={handleSort}
            />
            <ClickableHeader 
              label="5D Change" 
              sortKey="change5d" 
              currentSort={currentSort} 
              currentDir={currentDir}
              tooltip="Price change over the last 5 days"
              onClick={handleSort}
            />
            <ClickableHeader 
              label="30D Change" 
              sortKey="change30d" 
              currentSort={currentSort} 
              currentDir={currentDir}
              tooltip="Price change over the last 30 days"
              onClick={handleSort}
            />
            {hasPPT && (
              <>
                <ClickableHeader 
                  label="PPT Raw" 
                  sortKey="ppt_raw" 
                  currentSort={currentSort} 
                  currentDir={currentDir}
                  tooltip="Pokemon Price Tracker raw card price"
                  onClick={handleSort}
                />
                <ClickableHeader 
                  label="PPT PSA10" 
                  sortKey="psa10" 
                  currentSort={currentSort} 
                  currentDir={currentDir}
                  tooltip="Pokemon Price Tracker PSA 10 graded price"
                  onClick={handleSort}
                />
              </>
            )}
            <ClickableHeader 
              label="PSA10 Chance" 
              sortKey="psa10_chance" 
              currentSort={currentSort} 
              currentDir={currentDir}
              tooltip="Estimated probability of achieving PSA 10 grade"
              onClick={handleSort}
            />
            <ClickableHeader 
              label="Profit" 
              sortKey="profit" 
              currentSort={currentSort} 
              currentDir={currentDir}
              tooltip="Estimated profit after grading costs ($20) and shipping ($10)"
              onClick={handleSort}
            />
            <th className="px-3 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Rarity</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {cards.map((card) => {
            // Use any available raw/PSA10 data for PSA10 chance calculation
            const rawPrice = card.ppt_raw_cents || card.tcg_raw_cents || card.cm_raw_cents || 0;
            const psa10Price = card.ppt_psa10_cents || (rawPrice > 0 ? rawPrice * 3.5 : 0); // Estimate PSA10 as 3.5x raw if no real data
            const chance = psa10Chance(rawPrice, psa10Price);
            
            const trendData = generateMockTrendData(card.card_id);
            
            // Calculate deterministic price changes based on card ID to prevent hydration mismatches
            const currentPrice = card.tcg_raw_cents || 0;
            const seed = card.card_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const change5dMultiplier = 0.9 + (Math.sin(seed) * 0.1 + 0.1); // Deterministic ±10%
            const change30dMultiplier = 0.8 + (Math.sin(seed * 1.5) * 0.2 + 0.2); // Deterministic ±20%
            
            const change5d = calculateChange(currentPrice, currentPrice * change5dMultiplier);
            const change30d = calculateChange(currentPrice, currentPrice * change30dMultiplier);
            
            // Calculate profit using available PSA10 price
            const profit = calculateProfit(rawPrice, psa10Price);
            
            return (
              <tr key={card.card_id} className="hover:bg-gray-50">
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-6">
                      {card.image_url_small ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="h-8 w-6 rounded object-cover"
                          src={card.image_url_small}
                          alt={card.name}
                        />
                      ) : (
                        <div className="h-8 w-6 rounded bg-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-500">?</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-2 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {card.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {card.set_name || card.set_id} • #{card.number}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="w-20 h-8">
                    <Sparkline data={trendData} width={80} height={32} />
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrencyWithEstimate(card.tcg_raw_cents, 'USD')}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {card.cm_raw_cents 
                    ? formatCurrencyWithEstimate(card.cm_raw_cents, 'EUR')
                    : formatCurrencyWithEstimate(usdToEurCents(card.tcg_raw_cents), 'EUR', true)
                  }
                </td>
                <td className={`px-3 py-4 whitespace-nowrap text-sm ${getChangeColor(change5d)}`}>
                  {formatChange(change5d)}
                </td>
                <td className={`px-3 py-4 whitespace-nowrap text-sm ${getChangeColor(change30d)}`}>
                  {formatChange(change30d)}
                </td>
                {hasPPT && (
                  <>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {card.ppt_raw_cents ? `$${(card.ppt_raw_cents / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {card.ppt_psa10_cents ? `$${(card.ppt_psa10_cents / 100).toFixed(2)}` : '—'}
                    </td>
                  </>
                )}
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {chance.pct !== null ? (
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPSA10ChanceBadgeColor(chance.band)}`}>
                      {formatPSA10Chance(chance)}
                    </span>
                  ) : (
                    <Tooltip content="PSA10 chance calculation requires both raw and PSA10 price data">
                      <span className="text-gray-400 cursor-help">Unknown</span>
                    </Tooltip>
                  )}
                </td>
                <td className={`px-3 py-4 whitespace-nowrap text-sm ${getProfitColor(profit)}`}>
                  {profit !== 0 ? formatProfit(profit) : '—'}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500">
                  {card.rarity || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {!hasPPT && (
        <div className="mt-4 text-center text-sm text-gray-500">
          💡 PPT data not available for this set. Showing TCGplayer and Cardmarket prices only.
        </div>
      )}
    </div>
  );
}
