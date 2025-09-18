import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getPtgioPricesById } from '@/lib/sources/pokemontcgio';
// import { getPptPrice } from '@/lib/sources/ppt'; // optional

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

export async function syncPricesForSet(setId: string) {
  console.log(`🎯 Starting price sync for set: ${setId}`);
  
  const { data: cards, error } = await db
    .from('cards')
    .select('card_id,set_id,number,name')  // Use card_id instead of id
    .eq('set_id', setId);
    
  if (error) {
    console.error(`❌ Error fetching cards for ${setId}:`, error);
    throw error;
  }
  
  if (!cards?.length) {
    console.log(`⚠️ No cards found for set: ${setId}`);
    return { priced: 0, cards: 0 };
  }
  
  console.log(`📊 Found ${cards.length} cards to sync prices for`);
  let priced = 0;
  
  for (const c of cards) {
    try {
      const { tcg, cm } = await getPtgioPricesById(c.card_id);
      const rows = [tcg, cm].filter(Boolean) as any[];
      
      for (const p of rows) {
        const { error: upErr } = await db.from('prices').upsert({
          card_id: c.card_id,     // <-- match cards.card_id
          source: p.source,
          raw_cents: p.rawCents ?? null,
          psa10_cents: p.psa10Cents ?? null,
          currency: p.currency,
          ts: p.ts,
          notes: p.notes
        });
        
        if (upErr) {
          console.error('upsert error', c.card_id, upErr.message);
        } else {
          priced++;
        }
      }
      
      // Progress logging
      if ((cards.indexOf(c) + 1) % 5 === 0) {
        console.log(`📝 Processed ${cards.indexOf(c) + 1}/${cards.length} cards...`);
      }
      
    } catch (e: any) {
      console.error('fetch error', c.card_id, e?.message || e);
    }
    
    await sleep(250);
  }
  
  console.log(`✅ Price sync complete: ${priced} prices synced for ${cards.length} cards`);
  return { priced, setId };
}
