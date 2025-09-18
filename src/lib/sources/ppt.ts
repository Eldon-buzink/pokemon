// src/lib/sources/ppt.ts
import { MarketPrice, CardKey } from './types';

type Sale = { priceCents:number; grade:number|null; soldDate:string; source:string };

const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
const KEY  = process.env.PPT_API_KEY;
const PPT_SET_MAP: Record<string,string> = {
  cel25c: 'celebrations-classic-collection', // PPT's slug for Classic
};
const setSlug = (id:string)=>PPT_SET_MAP[id] ?? id;
const H = KEY ? { Authorization: `Bearer ${KEY}` } : {};

const toCents = (x:any)=> Number.isFinite(Number(x)) ? Math.round(Number(x)*100) : null;
const normDate = (d:any)=> (typeof d==='string' && d.length>=10) ? d.slice(0,10) : new Date().toISOString().slice(0,10);

// find an array of sales in whatever key PPT returns
function pickArray(payload:any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload.sales)) return payload.sales;
  if (Array.isArray(payload.recentSales)) return payload.recentSales;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

// extract grade from common fields OR from title text like "PSA 10"
function parseGrade(s:any): number|null {
  const cand = s?.grade ?? s?.psaGrade ?? s?.grading?.grade ?? s?.grade_value ?? null;
  if (Number.isFinite(Number(cand))) return Number(cand);
  const title = String(s?.title || s?.name || '').toUpperCase();
  if (/PSA\s*10\b/.test(title)) return 10;
  if (/PSA\s*9\b/.test(title)) return 9;
  return null;
}

export async function pptFetchSales(card: CardKey): Promise<Sale[]> {
  if (!KEY) return [];
  const slug = setSlug(card.setId);
  const tries = [
    `/sales?set=${encodeURIComponent(slug)}&number=${encodeURIComponent(card.number)}`,
    `/card/sales?set=${encodeURIComponent(slug)}&number=${encodeURIComponent(card.number)}`
  ];

  let payload: any = null;
  for (const path of tries) {
    const r = await fetch(`${BASE}${path}`, { headers: H });
    if (r.ok) { payload = await r.json().catch(()=>null); if (payload) break; }
  }

  // name+number fallback (search)
  if (!payload && card.name) {
    const name = card.name.replace(/\s*-\s*\d+\/\d+\s*$/,'').trim();
    const q = `${name} #${card.number}`;
    const r = await fetch(`${BASE}/sales/search?query=${encodeURIComponent(q)}`, { headers: H });
    if (r.ok) payload = await r.json().catch(()=>null);
  }

  const rows = pickArray(payload);
  const out: Sale[] = [];
  for (const s of rows) {
    const priceCents = toCents(s?.price ?? s?.soldPrice ?? s?.amount ?? s?.finalPrice);
    if (!priceCents) continue;
    const grade = parseGrade(s);
    const soldDate = normDate(s?.soldDate ?? s?.date ?? s?.endedAt ?? s?.timestamp);
    const source = String(s?.source || 'ppt-ebay');
    out.push({ priceCents, grade, soldDate, source });
  }
  return out;
}

// Whitelist of sets that PPT actually supports
export const supportsPPT = (setId: string) => ['cel25', 'cel25c'].includes(setId);

// Legacy functions for backward compatibility
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

async function fetchOne(card: CardKey) {
  // Use direct mapping for better performance
  const setParam = PPT_SET_MAP[card.setId] || card.setId;
  
  // 1) set + number (primary)
  const a = await call(`/cards?set=${encodeURIComponent(setParam)}&number=${encodeURIComponent(card.number)}&includeEbay=true`);
  if (a && (a.data?.length || a.prices || a.raw || a.psa10)) return a;

  // 2) name + number (fallback)
  const nm = cleanName(card.name);
  if (nm) {
    const b = await call(`/cards?search=${encodeURIComponent(nm)}&number=${encodeURIComponent(card.number)}&includeEbay=true`);
    if (b && (b.data?.length || b.prices || b.raw || b.psa10)) return b;
  }

  // 3) generic search (if supported)
  const c = await call(`/cards?search=${encodeURIComponent(`${nm} #${card.number}`)}&includeEbay=true`);
  if (c && (c.data?.length || c.prices)) return (Array.isArray(c.data) ? c.data[0] : c);
  
  return null;
}

function pickSummary(payload: any) {
  const root: any = payload?.data?.[0] || payload?.data || payload;
  
  const raw = root?.raw?.price ?? root?.prices?.raw ?? root?.rawPrice ?? root?.marketPrice;
  let psa10 = root?.psa10?.price ?? root?.prices?.psa10 ?? root?.psa10Price;
  
  // Extract PSA10 from eBay grades if available
  if (!psa10 && root?.ebayData?.grades) {
    const grades = Array.isArray(root.ebayData.grades) ? root.ebayData.grades : [];
    const psa10Grade = grades.find((g: any) => g?.grade === 10 || g?.grade === '10');
    if (psa10Grade?.price) {
      psa10 = psa10Grade.price;
    }
  }
  
  return { raw, psa10 };
}

export async function getPptSummary(card: CardKey): Promise<MarketPrice|undefined> {
  if (!KEY) return;
  const res = await fetchOne(card);
  if (!res) return;
  
  const { raw, psa10 } = pickSummary(res);
  if (raw == null && psa10 == null) return;
  
  return {
    source: 'ppt',
    ts: new Date().toISOString(),
    currency: 'USD',
    rawCents: toCents(raw),
    psa10Cents: toCents(psa10),
    notes: 'PPT API with eBay integration'
  };
}

export async function getPptSales(card: CardKey): Promise<Sale[]> {
  return pptFetchSales(card);
}

// Legacy function for backward compatibility
export async function getPptPrice(card: CardKey): Promise<MarketPrice|undefined> {
  return getPptSummary(card);
}