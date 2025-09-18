import { getServiceClient } from '@/server/supabase';

export async function seedCelebrationsSourceMap() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Supabase service env missing');
  
  // swsh35 = Celebrations in PokémonTCG.io
  const rows = [
    { canonical_set_id: 'swsh35', source: 'tcgplayer', source_set_name: 'Celebrations', number_range: null },
    { canonical_set_id: 'swsh35', source: 'tcgplayer', source_set_name: 'Celebrations: Classic Collection', number_range: '101-125' },
    { canonical_set_id: 'swsh35', source: 'pricecharting', source_set_name: 'Celebrations', number_range: null },
    { canonical_set_id: 'swsh35', source: 'pricecharting', source_set_name: 'Celebrations Classic Collection', number_range: '101-125' }
  ];
  for (const r of rows) await supabase.from('source_set_map').upsert(r);
}
