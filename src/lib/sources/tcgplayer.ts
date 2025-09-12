import { MarketPrice, CardKey } from './types';
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

async function getTCGplayerToken() {
  const res = await fetch('https://api.tcgplayer.com/token', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ grant_type:'client_credentials', client_id:process.env.TCGPLAYER_PUBLIC_KEY, client_secret:process.env.TCGPLAYER_PRIVATE_KEY })
  });
  if (!res.ok) throw new Error('TCGplayer token failed');
  return res.json();
}

async function searchProduct(setName:string, number:string) {
  // Use catalog/categories + filters as needed; simplest fallback: search by query
  const token = await getTCGplayerToken();
  const res = await fetch(`https://api.tcgplayer.com/catalog/products?categoryId=3&productName=${encodeURIComponent(setName)}%20${encodeURIComponent(number)}`, {
    headers:{ Authorization:`bearer ${token.access_token}` }
  });
  if (!res.ok) return null;
  const json = await res.json();
  const products = (json?.results ?? []).filter((p:any)=>!/(Code Card|Booster|Pack|Tin|Box|Collection$)/i.test(p.name));
  return products?.[0];
}

export async function getTcgplayerMarketPrice(card: CardKey, setName: string): Promise<MarketPrice|undefined> {
  const p = await searchProduct(setName, card.number);
  if (!p) return;
  await sleep(1000);
  const token = await getTCGplayerToken();
  const res = await fetch(`https://api.tcgplayer.com/pricing/product/${p.productId}`, {
    headers:{ Authorization:`bearer ${token.access_token}` }
  });
  if (!res.ok) return;
  const json = await res.json();
  const market = (json?.results||[]).find((r:any)=>r.marketPrice && r.subTypeName==='Normal');
  if (!market?.marketPrice) return;
  return {
    source:'tcgplayer',
   ts:new Date().toISOString(),
    currency:'USD',
    rawCents: Math.round(market.marketPrice*100),
    notes:'TCGplayer Market'
  };
}
