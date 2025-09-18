import { MarketPrice, CardKey } from './types';

const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
const KEY  = process.env.PPT_API_KEY;

const PPT_SET_MAP: Record<string, string> = {
  cel25: 'celebrations', // Main Celebrations set (confirmed working)
  cel25c: 'celebrations', // Classic Collection - might be part of main set in PPT
  // add more mappings later as we confirm coverage
};

function pptSetFor(id: string) { 
  return PPT_SET_MAP[id] ?? id; 
}

// Whitelist of sets that PPT actually supports
export const supportsPPT = (setId: string) => ['cel25', 'cel25c'].includes(setId);


async function call(path: string) {
  const res = await fetch(`${BASE}${path}`, { 
    headers: KEY ? { Authorization: `Bearer ${KEY}` } : {} 
  });
  if (!res.ok) return null;
  try { 
    return await res.json(); 
  } catch { 
    return null; 
  }
}

function cleanName(name?: string) {
  return (name || '').replace(/\s*-\s*\d+\/\d+\s*$/, '').trim();
}

// Removed - using direct PPT_SET_MAP instead of database lookup for better performance

async function fetchOne(card: CardKey) {
  // Use direct mapping for better performance
  const setParam = pptSetFor(card.setId);
  
  // Try different PPT API patterns (using correct /cards endpoint)
  const endpoints = [
    // Pattern 1: bulk fetch entire set (most efficient)
    `/cards?set=${encodeURIComponent(setParam)}&fetchAllInSet=true`,
    // Pattern 2: search by tcgPlayerId if available
    ...(card.tcgPlayerId ? [`/cards?tcgPlayerId=${encodeURIComponent(card.tcgPlayerId)}&includeEbay=true`] : []),
    // Pattern 3: search by name + number
    `/cards?search=${encodeURIComponent(`${cleanName(card.name)} ${card.number}`)}&includeEbay=true`,
    // Pattern 4: search by name only
    ...(card.name ? [`/cards?search=${encodeURIComponent(cleanName(card.name))}&includeEbay=true`] : [])
  ];
  
  for (const endpoint of endpoints) {
    try {
      const result = await call(endpoint);
      if (result && result.data && Array.isArray(result.data)) {
        // Find the specific card by number if we got multiple results
        const matchingCard = result.data.find((c: any) => 
          c.cardNumber === card.number || c.cardNumber === card.number.padStart(3, '0')
        );
        
        if (matchingCard) {
          console.log(`✅ PPT: Found data for ${card.name} #${card.number} using ${endpoint}`);
          return matchingCard;
        } else if (result.data.length === 1) {
          // If only one result, assume it's the right card
          console.log(`✅ PPT: Found single result for ${card.name} using ${endpoint}`);
          return result.data[0];
        }
      }
    } catch (error) {
      console.log(`⚠️ PPT endpoint failed: ${endpoint}`, error);
    }
  }

  console.log(`❌ PPT: No data found for ${card.name} #${card.number}`);
  return null;
}

export async function getPptPrice(card: CardKey): Promise<MarketPrice|undefined> {
  if (!KEY) return;
  const res = await fetchOne(card);
  if (!res) return;

  // Extract price data from the new PPT API format
  const marketPrice = res.prices?.market;
  const nearMintPrice = res.prices?.conditions?.['Near Mint']?.price;
  
  // Extract PSA10 data from eBay integration if available
  const psa10Data = res.ebayData?.grades?.find((g: any) => g.grade === 10);
  const psa10Price = psa10Data?.averagePrice || psa10Data?.medianPrice || psa10Data?.recentPrice;
  
  // Use market price as raw price
  const rawPrice = marketPrice || nearMintPrice;
  
  if (rawPrice == null && psa10Price == null) return;

  return {
    source: 'ppt',
    ts: res.prices?.lastUpdated || new Date().toISOString(),
    currency: 'USD',
    rawCents: rawPrice ? Math.round(Number(rawPrice) * 100) : undefined,
    psa10Cents: psa10Price ? Math.round(Number(psa10Price) * 100) : undefined,
    notes: `PPT API - Market: $${rawPrice}${psa10Price ? `, PSA10: $${psa10Price}` : ''}`
  };
}

// Summary data extraction (for backward compatibility)
export async function getPptSummary(card: CardKey): Promise<MarketPrice|undefined> {
  return await getPptPrice(card);
}

// Sales data extraction for granular eBay sales
export async function getPptSales(card: CardKey): Promise<any[]> {
  if (!KEY) return [];
  const res = await fetchOne(card);
  if (!res) return [];

  // Extract sales data from eBay integration
  const sales = res.ebayData?.sales || [];
  
  return sales.map((sale: any) => ({
    priceCents: sale.price ? Math.round(Number(sale.price) * 100) : null,
    grade: sale.grade || 0,
    soldDate: sale.soldDate || sale.date || new Date().toISOString().slice(0, 10),
    source: 'ppt-ebay'
  })).filter((sale: any) => sale.priceCents !== null);
}