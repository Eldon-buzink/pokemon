import 'server-only';
import { getServiceClient } from '@/server/supabase';

const BASE = process.env.POKEMONTCG_API_BASE || 'https://api.pokemontcg.io/v2';
const KEY = process.env.POKEMONTCG_API_KEY;

async function fetchPaged(path: string) {
  const out:any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${BASE}/${path}&page=${page}&pageSize=250`, {
      headers: KEY ? { 'X-Api-Key': KEY } : {}
    });
    if (!res.ok) throw new Error(`Catalog fetch failed: ${path} ${res.status}`);
    const json = await res.json();
    out.push(...(json.data || []));
    if (json.count + json.pageSize * (page - 1) >= json.totalCount) break;
    page++;
    await new Promise(r => setTimeout(r, 1100)); // 1 rps
  }
  return out;
}

export async function syncSetsFromPokemonTCG() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Supabase service env missing');
  
  const sets = await fetchPaged('sets?orderBy=releaseDate');
  for (const s of sets) {
    const { id, name, series, releaseDate, total, images } = s;
    await supabase.from('sets').upsert({
      id, name, series, release_date: releaseDate ? new Date(releaseDate) : null,
      total, images, updated_at: new Date().toISOString()
    });
  }
  return sets.length;
}

export async function syncCardsForSet(setId: string) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Supabase service env missing');
  
  const cards = await fetchPaged(`cards?q=set.id:${setId}`);
  for (const c of cards) {
    const { id, number, name, rarity, images } = c;
    await supabase.from('cards').upsert({
      id, set_id: setId, number: String(number), name, rarity, images, updated_at: new Date().toISOString()
    });
  }
  return cards.length;
}

export async function syncCatalogAll() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Supabase service env missing');
  
  const count = await syncSetsFromPokemonTCG();
  // fetch set ids and fan out
  const { data } = await supabase.from('sets').select('id');
  for (const row of data || []) {
    await syncCardsForSet(row.id);
  }
  return count;
}
