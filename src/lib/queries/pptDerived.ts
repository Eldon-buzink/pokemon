// src/lib/queries/pptDerived.ts
import { createClient } from '@supabase/supabase-js';
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/** 30d medians for a set (raw + psa10), keyed by card_id */
export async function pptMedians30d(setId: string){
  const cli = db();
  const { data: daily } = await cli
    .from('facts_daily')
    .select('card_id,date,raw_median,psa10_median')
    .gte('date', new Date(Date.now()-30*86400000).toISOString().slice(0,10));
  
  const acc = new Map<string,{raw?:number; psa10?:number}>();
  (daily||[]).forEach(r=>{
    const cur = acc.get(r.card_id) || {};
    if (r.raw_median != null)  cur.raw  = (cur.raw ?? 0) + Number(r.raw_median);
    if (r.psa10_median != null) cur.psa10 = (cur.psa10 ?? 0) + Number(r.psa10_median);
    acc.set(r.card_id, cur);
  });
  return acc;
}

/** Last sold PSA10 per card_id */
export async function lastSoldPSA10(setId: string){
  const cli = db();
  const { data } = await cli.rpc('get_last_sold_psa10', { p_set: setId });
  return new Map((data||[]).map((r:any)=>[r.card_id, {price: r.price_cents, date: r.sold_date}]));
}

/** Get PPT-derived metrics for enhanced analysis */
export async function getPptDerivedMetrics(setId: string) {
  try {
    const [medians, lastSold] = await Promise.all([
      pptMedians30d(setId),
      lastSoldPSA10(setId)
    ]);
    
    return { medians, lastSold };
  } catch (error) {
    console.error('Error fetching PPT derived metrics:', error);
    return { 
      medians: new Map(), 
      lastSold: new Map() 
    };
  }
}
