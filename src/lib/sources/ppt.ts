import { MarketPrice, CardKey } from './types';
import { pptFetchCached } from '@/lib/http/pptFetch';

type Sale = { priceCents:number; grade:number|null; soldDate:string; source:string };

const PPT_SET_MAP: Record<string,string> = { 
  cel25c: 'celebrations-classic-collection',
  cel25: 'celebrations'
};
const slug = (id:string)=>PPT_SET_MAP[id] ?? id;

const toCents = (x:any)=> Number.isFinite(Number(x)) ? Math.round(Number(x)*100) : null;
const normDate = (d:any)=> (typeof d==='string' && d.length>=10) ? d.slice(0,10) : new Date().toISOString().slice(0,10);

function pickArray(payload:any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload.sales)) return payload.sales;
  if (Array.isArray(payload.recentSales)) return payload.recentSales;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

function parseGrade(s:any): number|null {
  const g = s?.grade ?? s?.psaGrade ?? s?.grading?.grade ?? s?.grade_value ?? null;
  if (Number.isFinite(Number(g))) return Number(g);
  const t = String(s?.title || s?.name || '').toUpperCase();
  if (/PSA\s*10\b/.test(t)) return 10;
  if (/PSA\s*9\b/.test(t)) return 9;
  return null;
}

export async function pptFetchSales(card: CardKey): Promise<Sale[]> {
  const set = slug(card.setId);
  
  // Try primary path with persistent throttle + caching
  const r = await pptFetchCached({
    setId: card.setId, 
    number: card.number, 
    kind:'sales',
    path: `/sales?set=${encodeURIComponent(set)}&number=${encodeURIComponent(card.number)}`,
    useCacheMin: 1440, // 24h
    maxAttempts: 3,
    initialDelayMs: 0
  });
  
  if (r.ok && r.json) {
    const rows = pickArray(r.json);
    const sales = rows.map((s:any)=>{
      const priceCents = toCents(s?.price ?? s?.soldPrice ?? s?.amount ?? s?.finalPrice);
      if (!priceCents) return null;
      return {
        priceCents,
        grade: parseGrade(s),
        soldDate: normDate(s?.soldDate ?? s?.date ?? s?.endedAt ?? s?.timestamp),
        source: String(s?.source || 'ppt-ebay')
      } as Sale;
    }).filter(Boolean) as Sale[];
    
    console.log(`[PPT Sales] Found ${sales.length} sales for ${card.name || card.setId}#${card.number} (${r.cached ? 'cached' : 'fresh'})`);
    return sales;
  }
  
  // If under cooldown or exhausted, return empty gracefully
  console.log(`[PPT Sales] No data for ${card.name || card.setId}#${card.number} (${r.code || 'unknown'})`);
  return [];
}

// Summary fetcher for backward compatibility
export async function pptFetchSummary(card: CardKey): Promise<MarketPrice | undefined> {
  const set = slug(card.setId);
  
  const r = await pptFetchCached({
    setId: card.setId,
    number: card.number,
    kind: 'summary',
    path: `/cards?set=${encodeURIComponent(set)}&number=${encodeURIComponent(card.number)}&includeEbay=true`,
    useCacheMin: 1440,
    maxAttempts: 3,
    initialDelayMs: 0
  });
  
  if (!r.ok || !r.json) return undefined;
  
  const cards = Array.isArray(r.json.data) ? r.json.data : [r.json.data].filter(Boolean);
  if (!cards.length) return undefined;
  
  const card_data = cards[0];
  const raw = toCents(card_data?.raw?.price ?? card_data?.prices?.raw ?? card_data?.rawPrice);
  const psa10 = toCents(card_data?.psa10?.price ?? card_data?.prices?.psa10 ?? card_data?.psa10Price);
  
  if (!raw && !psa10) return undefined;
  
  return {
    source: 'ppt',
    ts: new Date().toISOString(),
    currency: 'USD',
    rawCents: raw || undefined,
    psa10Cents: psa10 || undefined,
    notes: r.cached ? 'PPT API (cached)' : 'PPT API (fresh)'
  };
}

// Legacy functions for backward compatibility
export async function getPptPrice(card: CardKey): Promise<MarketPrice | undefined> {
  return pptFetchSummary(card);
}

export async function getPptSummary(card: CardKey) {
  return pptFetchSummary(card);
}

export async function getPptSales(card: CardKey) {
  return pptFetchSales(card);
}

export function supportsPPT(setId: string): boolean {
  return ['cel25', 'cel25c'].includes(setId);
}