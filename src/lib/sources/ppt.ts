import { MarketPrice, CardKey } from './types';
const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
const KEY  = process.env.PPT_API_KEY;

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
  // 1) set + number
  const a = await call(`/card?set=${encodeURIComponent(card.setId)}&number=${encodeURIComponent(card.number)}`);
  if (a && (a.data || a.prices || a.raw || a.psa10)) return a;

  // 2) name + number
  const nm = cleanName(card.name);
  if (nm) {
    const b = await call(`/card?name=${encodeURIComponent(nm)}&number=${encodeURIComponent(card.number)}`);
    if (b && (b.data || b.prices || b.raw || b.psa10)) return b;
  }

  // 3) generic search (if supported)
  const c = await call(`/cards?query=${encodeURIComponent(`${nm} #${card.number}`)}`);
  if (c && (c.data?.length || c.prices)) return (Array.isArray(c.data) ? c.data[0] : c);

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