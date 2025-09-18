import { MarketPrice, CardKey } from './types';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
const KEY  = process.env.PPT_API_KEY;

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

async function resolvePPTSetId(internalSetId: string): Promise<string> {
  try {
    const { data, error } = await db()
      .from('source_set_map')
      .select('external_set_id')
      .eq('internal_set_id', internalSetId)
      .eq('source', 'ppt')
      .single();
    
    if (error || !data) {
      console.log(`⚠️ No PPT mapping found for ${internalSetId}, using as-is`);
      return internalSetId;
    }
    
    return data.external_set_id;
  } catch (error) {
    console.log(`⚠️ Error resolving PPT set ID for ${internalSetId}:`, error);
    return internalSetId;
  }
}

async function fetchOne(card: CardKey) {
  // First, resolve the correct PPT set ID
  const pptSetId = await resolvePPTSetId(card.setId);
  
  // Try different PPT API patterns
  const endpoints = [
    // Pattern 1: set + number
    `/card?set=${encodeURIComponent(pptSetId)}&number=${encodeURIComponent(card.number)}`,
    // Pattern 2: tcgPlayerId + number  
    `/card?tcgPlayerId=${encodeURIComponent(pptSetId)}&number=${encodeURIComponent(card.number)}`,
    // Pattern 3: name + number
    ...(card.name ? [`/card?name=${encodeURIComponent(cleanName(card.name))}&number=${encodeURIComponent(card.number)}`] : []),
    // Pattern 4: search query
    `/cards?query=${encodeURIComponent(`${cleanName(card.name)} #${card.number}`)}`,
    // Pattern 5: just card name search
    ...(card.name ? [`/cards?query=${encodeURIComponent(cleanName(card.name))}`] : [])
  ];
  
  for (const endpoint of endpoints) {
    try {
      const result = await call(endpoint);
      if (result && (result.data || result.prices || result.raw || result.psa10)) {
        console.log(`✅ PPT: Found data for ${card.name} using ${endpoint}`);
        return result;
      }
    } catch (error) {
      console.log(`⚠️ PPT endpoint failed: ${endpoint}`, error);
    }
  }

  return null;
}

export async function getPptPrice(card: CardKey): Promise<MarketPrice|undefined> {
  if (!KEY) return;
  const res = await fetchOne(card);
  if (!res) return;

  const root: any = res.data?.[0] || res.data || res;
  const raw   = root?.raw?.price   ?? root?.prices?.raw   ?? root?.rawPrice   ?? root?.marketPrice;
  const psa10 = root?.psa10?.price ?? root?.prices?.psa10 ?? root?.psa10Price;

  if (raw == null && psa10 == null) return;

  return {
    source: 'ppt',
    ts: new Date().toISOString(),
    currency: 'USD',
    rawCents:   raw   != null ? Math.round(Number(raw)   * 100) : undefined,
    psa10Cents: psa10 != null ? Math.round(Number(psa10) * 100) : undefined,
    notes: 'PPT API'
  };
}