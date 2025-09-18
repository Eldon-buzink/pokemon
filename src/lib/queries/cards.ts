import { createClient } from '@supabase/supabase-js';

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type CardsListParams = {
  setId: string;
  q?: string;           // search in name or number
  sort?: 'price'|'psa10'|'number'|'name';
  dir?: 'asc'|'desc';
  min?: number;         // min tcg_raw_cents
  max?: number;         // max tcg_raw_cents
  page?: number;        // 1-based
  limit?: number;       // e.g., 50
};

export type CardLatest = {
  card_id: string;
  set_id: string;
  number: string;
  name: string;
  rarity: string | null;
  image_url_small: string | null;
  image_url_large: string | null;
  set_name: string | null;
  tcg_raw_cents: number | null;
  tcg_currency: string | null;
  cm_raw_cents: number | null;
  cm_currency: string | null;
  ppt_raw_cents: number | null;
  ppt_psa10_cents: number | null;
};

export async function listCardsLatest(p: CardsListParams): Promise<CardLatest[]> {
  const client = db();
  const limit = Math.min(Math.max(p.limit ?? 50, 10), 200);
  const from = ((p.page ?? 1) - 1) * limit;
  
  let q = client.from('v_cards_latest').select('card_id,set_id,number,name,rarity,image_url_small,image_url_large,set_name,tcg_raw_cents,cm_raw_cents,ppt_raw_cents,ppt_psa10_cents').eq('set_id', p.setId);
  
  if (p.q?.trim()) {
    q = q.or(`name.ilike.%${p.q}%,number.ilike.%${p.q}%`);
  }
  
  if (typeof p.min === 'number') {
    q = q.gte('tcg_raw_cents', Math.round(p.min * 100));
  }
  
  if (typeof p.max === 'number') {
    q = q.lte('tcg_raw_cents', Math.round(p.max * 100));
  }
  
  const sort = p.sort ?? 'number';
  const dir = p.dir ?? 'asc';
  
  q = q.order(sort === 'price' ? 'tcg_raw_cents' :
              sort === 'psa10' ? 'ppt_psa10_cents' :
              sort, { ascending: dir === 'asc' });
  
  const { data, error } = await q.range(from, from + limit - 1);
  
  if (error) {
    console.error('Error fetching cards:', error);
    throw error;
  }
  
  return data || [];
}

// Helper function to get available sets
export async function getAvailableSets() {
  const client = db();
  const { data, error } = await client
    .from('cards')
    .select('set_id')
    .order('set_id');
    
  if (error) {
    console.error('Error fetching sets:', error);
    return [];
  }
  
  // Get unique set IDs on the client side
  const uniqueSets = Array.from(new Set(data?.map(row => row.set_id) || []));
  return uniqueSets.sort();
}

// Check price sync status for a set
export async function getPriceSyncStatus(setId: string) {
  const client = db();
  
  try {
    // Get total cards count
    const { count: totalCards, error: totalError } = await client
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('set_id', setId);
    
    if (totalError) {
      console.error('Error getting total cards:', totalError);
      return {
        totalCards: 0,
        cardsWithPrices: 0,
        syncPercentage: 0,
        lastSyncBySource: {},
        needsSync: true
      };
    }
    
    // Get cards with any price data
    const { count: cardsWithPrices, error: pricesError } = await client
      .from('v_cards_latest')
      .select('*', { count: 'exact', head: true })
      .eq('set_id', setId)
      .or('tcg_raw_cents.not.is.null,cm_raw_cents.not.is.null,ppt_raw_cents.not.is.null');
    
    if (pricesError) {
      console.error('Error getting cards with prices:', pricesError);
    }
    
    // Get recent price sync timestamps
    const { data: recentPrices, error: syncError } = await client
      .from('prices')
      .select('source, ts')
      .order('ts', { ascending: false })
      .limit(20);
    
    if (syncError) {
      console.error('Error getting sync timestamps:', syncError);
    }
    
    const total = totalCards || 0;
    const withPrices = cardsWithPrices || 0;
    const syncPercentage = total > 0 ? (withPrices / total) * 100 : 0;
    
    // Group last sync times by source
    const lastSyncBySource: Record<string, string> = {};
    recentPrices?.forEach(row => {
      if (!lastSyncBySource[row.source] || row.ts > lastSyncBySource[row.source]) {
        lastSyncBySource[row.source] = row.ts;
      }
    });
    
    return {
      totalCards: total,
      cardsWithPrices: withPrices,
      syncPercentage,
      lastSyncBySource,
      needsSync: syncPercentage < 50 // Flag if less than 50% have prices
    };
  } catch (error) {
    console.error('Error in getPriceSyncStatus:', error);
    return {
      totalCards: 0,
      cardsWithPrices: 0,
      syncPercentage: 0,
      lastSyncBySource: {},
      needsSync: true
    };
  }
}
