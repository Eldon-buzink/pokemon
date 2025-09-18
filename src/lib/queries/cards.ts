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
