import { MarketPrice, CardKey } from './types';
const BASE = process.env.POKEMONTCG_API_BASE || 'https://api.pokemontcg.io/v2';
const headers = process.env.POKEMONTCG_API_KEY ? { 'X-Api-Key': process.env.POKEMONTCG_API_KEY! } : {};

async function fetchBySetNumber(setId:string, number:string) {
  const url = `${BASE}/cards?q=set.id:${setId} number:${encodeURIComponent(number)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`PTCG.io fetch failed ${res.status}`);
  const json = await res.json();
  return (json.data || [])[0];
}

export async function getPtgioPrices(card: CardKey): Promise<{ tcg?: MarketPrice; cm?: MarketPrice }> {
  const data = await fetchBySetNumber(card.setId, card.number);
  if (!data) return {};
  const out:any = {};
  // TCGplayer (USD)
  const tp = data.tcgplayer?.prices;
  const pickTP = tp?.holofoil || tp?.normal || tp?.reverseHolofoil || tp?.['1stEditionHolofoil'] || tp?.['1stEditionNormal'];
  if (pickTP?.market) {
    out.tcg = { source:'tcgplayer', ts:new Date().toISOString(), currency:'USD', rawCents: Math.round(pickTP.market*100), notes:'PokémonTCG.io → TCGplayer market' };
  }
  // Cardmarket (EUR)
  const cm = data.cardmarket?.prices;
  const val = cm?.trendPrice ?? cm?.averageSellPrice ?? cm?.avg7 ?? cm?.avg30;
  if (val) {
    out.cm = { source:'cardmarket', ts:new Date().toISOString(), currency:'EUR', rawCents: Math.round(Number(val)*100), notes:'PokémonTCG.io → Cardmarket trend/avg' };
  }
  return out;
}
