import { MarketPrice, CardKey } from './types';
const BASE = process.env.PRICECHARTING_API_BASE || 'https://www.pricecharting.com/api';

export async function getPriceChartingSold(card: CardKey, setName: string): Promise<MarketPrice|undefined> {
  const key = process.env.PRICECHARTING_API_KEY;
  if (!key) return;
  // PriceCharting uses game/item endpoints; here we assume an item search by set+number
  const url = `${BASE}/prices?t=${encodeURIComponent(key)}&q=${encodeURIComponent(`${setName} ${card.number}`)}`;
  const res = await fetch(url);
  if (!res.ok) return;
 const data = await res.json();
  const item = Array.isArray(data?.prices) ? data.prices[0] : undefined;
  if (!item?.current_price) return;
  const out: MarketPrice = {
    source:'pricecharting',
    ts:new Date().toISOString(),
    currency:'USD',
    rawCents: Math.round(Number(item.current_price)*100),
    notes:'PriceCharting sold avg'
  };
  if (item?.graded_price?.psa10) out.psa10Cents = Math.round(Number(item.graded_price.psa10)*100);
  return out;
}
