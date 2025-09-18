import { MarketPrice, CardKey } from './types';
const BASE = process.env.POKEMONTCG_API_BASE || 'https://api.pokemontcg.io/v2';
const H = process.env.POKEMONTCG_API_KEY ? { 'X-Api-Key': process.env.POKEMONTCG_API_KEY! } : {};

async function getById(cardId: string) {
  const res = await fetch(`${BASE}/cards/${encodeURIComponent(cardId)}`, { headers: H });
  if (!res.ok) return null;
  const j = await res.json();
  return j?.data || null;
}

async function queryOne(q: string) {
  const res = await fetch(`${BASE}/cards?q=${encodeURIComponent(q)}&pageSize=1`, { headers: H });
  if (!res.ok) return null;
  const j = await res.json();
  return (j?.data || [])[0] || null;
}

export async function getPtgioPricesById(cardId: string): Promise<{ tcg?: MarketPrice; cm?: MarketPrice }> {
  const data = await getById(cardId);
  if (!data) return {};
  const out: any = {};
  
  // TCGplayer (USD)
  const tp = data.tcgplayer?.prices;
  const pickTP = tp?.holofoil || tp?.reverseHolofoil || tp?.normal || tp?.['1stEditionHolofoil'] || tp?.['1stEditionNormal'];
  if (pickTP?.market) {
    out.tcg = { 
      source: 'tcgplayer', 
      ts: new Date().toISOString(), 
      currency: 'USD', 
      rawCents: Math.round(pickTP.market * 100), 
      notes: 'PTCG.io → TCGplayer (by id)' 
    };
  }
  
  // Cardmarket (EUR)
  const cm = data.cardmarket?.prices;
  const val = cm?.trendPrice ?? cm?.averageSellPrice ?? cm?.avg7 ?? cm?.avg30;
  if (val) {
    out.cm = { 
      source: 'cardmarket', 
      ts: new Date().toISOString(), 
      currency: 'EUR', 
      rawCents: Math.round(Number(val) * 100), 
      notes: 'PTCG.io → Cardmarket (by id)' 
    };
  }
  
  return out;
}

// Keep the old function as a fallback if needed elsewhere
export async function getPtgioPrices(card: CardKey): Promise<{ tcg?: MarketPrice; cm?: MarketPrice }> {
  // 1) Try set-restricted query
  let data = await queryOne(`set.id:${card.setId} number:${card.number}`);
  
  // 2) Fallback: name + number
  if (!data && card.name) {
    const safeName = card.name.split(' - ')[0].trim();
    const parts = [];
    if (safeName) parts.push(`name:"${safeName}"`);
    parts.push(`number:${card.number}`);
    data = await queryOne(parts.join(' '));
  }
  
  if (!data) return {};
  const out: any = {};
  
  // TCGplayer (USD)
  const tp = data.tcgplayer?.prices;
  const pickTP = tp?.holofoil || tp?.reverseHolofoil || tp?.normal || tp?.['1stEditionHolofoil'] || tp?.['1stEditionNormal'];
  if (pickTP?.market) {
    out.tcg = { 
      source: 'tcgplayer', 
      ts: new Date().toISOString(), 
      currency: 'USD', 
      rawCents: Math.round(pickTP.market * 100), 
      notes: 'PTCG.io → TCGplayer (fallback)' 
    };
  }
  
  // Cardmarket (EUR)
  const cm = data.cardmarket?.prices;
  const val = cm?.trendPrice ?? cm?.averageSellPrice ?? cm?.avg7 ?? cm?.avg30;
  if (val) {
    out.cm = { 
      source: 'cardmarket', 
      ts: new Date().toISOString(), 
      currency: 'EUR', 
      rawCents: Math.round(Number(val) * 100), 
      notes: 'PTCG.io → Cardmarket (fallback)' 
    };
  }
  
  return out;
}
