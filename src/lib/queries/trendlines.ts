// src/lib/queries/trendlines.ts
import { createClient } from '@supabase/supabase-js';

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getTrendline(cardId: string) {
  const since = new Date(Date.now() - 90*86400000).toISOString().slice(0,10);
  const { data, error } = await db()
    .from('v_daily_medians')
    .select('date, raw_median, psa10_median, raw_n, psa10_n')
    .eq('card_id', cardId)
    .gte('date', since)
    .order('date', { ascending: true });
    
  if (error) throw error;
  return data || [];
}

export async function getTrendlines(cardIds: string[]) {
  if (!cardIds.length) return {};
  
  const since = new Date(Date.now() - 90*86400000).toISOString().slice(0,10);
  const { data, error } = await db()
    .from('v_daily_medians')
    .select('card_id, date, raw_median, psa10_median, raw_n, psa10_n')
    .in('card_id', cardIds)
    .gte('date', since)
    .order('date', { ascending: true });
    
  if (error) throw error;
  
  // Group by card_id
  const result: Record<string, any[]> = {};
  for (const row of data || []) {
    if (!result[row.card_id]) result[row.card_id] = [];
    result[row.card_id].push({
      date: row.date,
      price: row.raw_median || 0,
      psa10Price: row.psa10_median || 0,
      sampleSize: row.raw_n || 0
    });
  }
  
  return result;
}
