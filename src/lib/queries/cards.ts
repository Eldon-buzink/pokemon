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
  
  let q = client.from('v_cards_latest').select('*').eq('set_id', p.setId);
  
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
    .group('set_id')
    .order('set_id');
    
  if (error) {
    console.error('Error fetching sets:', error);
    return [];
  }
  
  return data?.map(row => row.set_id) || [];
}

// Check price sync status for a set
export async function getPriceSyncStatus(setId: string) {
  const client = db();
  
  // Get total cards and cards with prices
  const { data: totalCards, error: totalError } = await client
    .from('cards')
    .select('card_id', { count: 'exact' })
    .eq('set_id', setId);
    
  const { data: cardsWithPrices, error: pricesError } = await client
    .from('v_cards_latest')
    .select('card_id', { count: 'exact' })
    .eq('set_id', setId)
    .not('tcg_raw_cents', 'is', null)
    .not('cm_raw_cents', 'is', null)
    .not('ppt_raw_cents', 'is', null);
    
  // Get last sync timestamps per source
  const { data: lastSync, error: syncError } = await client
    .from('prices')
    .select('source, ts')
    .in('card_id', 
      client.from('cards').select('card_id').eq('set_id', setId)
    )
    .order('ts', { ascending: false })
    .limit(10);
  
  if (totalError || pricesError || syncError) {
    console.error('Error checking price sync status:', { totalError, pricesError, syncError });
    return {
      totalCards: 0,
      cardsWithPrices: 0,
      syncPercentage: 0,
      lastSyncBySource: {},
      needsSync: true
    };
  }
  
  const total = totalCards?.length || 0;
  const withPrices = cardsWithPrices?.length || 0;
  const syncPercentage = total > 0 ? (withPrices / total) * 100 : 0;
  
  // Group last sync times by source
  const lastSyncBySource: Record<string, string> = {};
  lastSync?.forEach(row => {
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
}
