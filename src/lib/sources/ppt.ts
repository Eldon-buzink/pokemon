import { MarketPrice, CardKey } from './types';
const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
const KEY  = process.env.PPT_API_KEY!;

export async function getPptPrice(card: CardKey): Promise<MarketPrice|undefined> {
  if (!KEY) return;
  const url = `${BASE}/card?set=${encodeURIComponent(card.setId)}&number=${encodeURIComponent(card.number)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!res.ok) return;
  const data = await res.json();
  // Adjust mapping to your tier fields if different:
  const psa10 = data?.psa10?.price ?? data?.ebay?.psa10;
  const raw   = data?.raw?.price   ?? data?.ebay?.raw;
  if (!psa10 && !raw) return;
  return {
    source:'ppt',
    ts:new Date().toISOString(),
    currency:'USD',
    rawCents: raw ? Math.round(Number(raw)*100) : undefined,
    psa10Cents: psa10 ? Math.round(Number(psa10)*100) : undefined,
    notes:'PPT API',
  };
}